<?php
declare(strict_types=1);

require_once __DIR__ . '/../models/HospitalProfile.php';
require_once __DIR__ . '/../models/Job.php';
require_once __DIR__ . '/../models/JobApplication.php';
require_once __DIR__ . '/../models/Appointment.php';
require_once __DIR__ . '/../models/AuditLog.php';
require_once __DIR__ . '/../services/NotificationService.php';

class HospitalController
{
    private HospitalProfile    $profileModel;
    private Job                $jobModel;
    private JobApplication     $appModel;
    private Appointment        $apptModel;
    private AuditLog           $auditLog;
    private NotificationService $notifService;
    private PDO                $db;

    public function __construct(PDO $db)
    {
        $this->db            = $db;
        $this->profileModel  = new HospitalProfile($db);
        $this->jobModel      = new Job($db);
        $this->appModel      = new JobApplication($db);
        $this->apptModel     = new Appointment($db);
        $this->auditLog      = new AuditLog($db);
        $this->notifService  = new NotificationService($db);
    }

    public function getProfile(): void
    {
        $user    = requireRole('hospital');
        $profile = $this->profileModel->getByUserId($user['id']);
        if (!$profile) jsonError('Profile not found.', 404);
        jsonResponse($profile);
    }

    public function updateProfile(): void
    {
        $user = requireRole('hospital');
        $data = getRequestBody();
        $this->profileModel->update($user['id'], $data);
        $this->auditLog->log($user['id'], 'profile_updated', 'hospital_profile', $user['id']);
        jsonResponse(['success' => true, 'message' => 'Profile updated.']);
    }

    public function stats(): void
    {
        $user = requireRole('hospital');

        $stmt = $this->db->prepare("SELECT COUNT(*) FROM jobs WHERE hospital_id = ? AND status = 'active'");
        $stmt->execute([$user['id']]);
        $activeJobs = (int)$stmt->fetchColumn();

        $stmt = $this->db->prepare("SELECT COUNT(*) FROM job_applications ja JOIN jobs j ON j.id = ja.job_id WHERE j.hospital_id = ?");
        $stmt->execute([$user['id']]);
        $totalApps = (int)$stmt->fetchColumn();

        $stmt = $this->db->prepare("SELECT COUNT(*) FROM job_applications ja JOIN jobs j ON j.id = ja.job_id WHERE j.hospital_id = ? AND ja.status = 'new'");
        $stmt->execute([$user['id']]);
        $newApps = (int)$stmt->fetchColumn();

        $stmt = $this->db->prepare("SELECT COUNT(*) FROM jobs WHERE hospital_id = ?");
        $stmt->execute([$user['id']]);
        $totalJobs = (int)$stmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT COUNT(DISTINCT ja.applicant_id) FROM job_applications ja
             JOIN jobs j ON j.id = ja.job_id
             WHERE j.hospital_id = ? AND ja.status = 'hired'"
        );
        $stmt->execute([$user['id']]);
        $totalDoctors = (int)$stmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT COUNT(*) FROM appointments a
             WHERE a.doctor_id IN (
                 SELECT DISTINCT ja.applicant_id FROM job_applications ja
                 JOIN jobs j ON j.id = ja.job_id
                 WHERE j.hospital_id = ? AND ja.status = 'hired'
             ) AND a.appointment_date = CURDATE()"
        );
        $stmt->execute([$user['id']]);
        $apptsToday = (int)$stmt->fetchColumn();

        jsonResponse([
            'active_jobs'    => $activeJobs,
            'total_jobs'     => $totalJobs,
            'total_apps'     => $totalApps,
            'new_apps'       => $newApps,
            'total_doctors'  => $totalDoctors,
            'appts_today'    => $apptsToday,
        ]);
    }

    public function listJobs(): void
    {
        $user    = requireRole('hospital');
        $page    = max(1, (int)($_GET['page'] ?? 1));
        $perPage = min((int)($_GET['per_page'] ?? 20), 100);
        $status  = trim($_GET['status'] ?? '');
        $search  = trim($_GET['search'] ?? '');
        $offset  = ($page - 1) * $perPage;

        $conditions = ['j.hospital_id = ?'];
        $params     = [$user['id']];

        if ($status !== '') {
            $conditions[] = 'j.status = ?';
            $params[]     = $status;
        }
        if ($search !== '') {
            $conditions[] = '(j.title LIKE ? OR j.specialization LIKE ? OR j.location LIKE ?)';
            $like         = '%' . $search . '%';
            $params       = array_merge($params, [$like, $like, $like]);
        }
        $where = implode(' AND ', $conditions);

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM jobs j WHERE {$where}");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT j.*, COUNT(ja.id) AS application_count
             FROM jobs j
             LEFT JOIN job_applications ja ON ja.job_id = j.id
             WHERE {$where}
             GROUP BY j.id
             ORDER BY j.created_at DESC
             LIMIT {$perPage} OFFSET {$offset}"
        );
        $stmt->execute($params);
        $jobs = $stmt->fetchAll();

        foreach ($jobs as &$job) {
            $job['requirements'] = json_decode($job['requirements'] ?? '[]', true) ?? [];
            $job['benefits']     = json_decode($job['benefits']     ?? '[]', true) ?? [];
        }

        jsonResponse([
            'data'        => $jobs,
            'total'       => $total,
            'page'        => $page,
            'per_page'    => $perPage,
            'total_pages' => (int)ceil($total / max(1, $perPage)),
        ]);
    }

    public function getJob(int $jobId): void
    {
        $user = requireRole('hospital');
        $stmt = $this->db->prepare('SELECT * FROM jobs WHERE id = ? AND hospital_id = ?');
        $stmt->execute([$jobId, $user['id']]);
        $job = $stmt->fetch();
        if (!$job) jsonError('Job not found.', 404);
        $job['requirements'] = json_decode($job['requirements'] ?? '[]', true) ?? [];
        $job['benefits']     = json_decode($job['benefits']     ?? '[]', true) ?? [];
        jsonResponse($job);
    }

    public function createJob(): void
    {
        $user = requireRole('hospital');
        $data = getRequestBody();
        requireField($data, 'title', 'specialization', 'type', 'experience', 'qualification', 'location');

        $jobId = $this->jobModel->create($user['id'], $data);
        $this->auditLog->log($user['id'], 'job_created', 'job', $jobId);
        jsonResponse(['success' => true, 'job_id' => $jobId, 'message' => 'Job posted successfully.'], 201);
    }

    public function updateJob(int $jobId): void
    {
        $user   = requireRole('hospital');
        $data   = getRequestBody();
        $result = $this->jobModel->update($jobId, $user['id'], $data);
        if (!$result) jsonError('Job not found or unauthorized.', 404);
        $this->auditLog->log($user['id'], 'job_updated', 'job', $jobId);
        jsonResponse(['success' => true, 'message' => 'Job updated.']);
    }

    public function deleteJob(int $jobId): void
    {
        $user   = requireRole('hospital');
        $result = $this->jobModel->delete($jobId, $user['id']);
        if (!$result) jsonError('Job not found or unauthorized.', 404);
        $this->auditLog->log($user['id'], 'job_closed', 'job', $jobId);
        jsonResponse(['success' => true, 'message' => 'Job closed.']);
    }

    public function getJobApplications(int $jobId): void
    {
        $user = requireRole('hospital');
        $filters = ['status' => $_GET['status'] ?? ''];
        $apps = $this->appModel->getForJob($jobId, $user['id'], $filters);
        jsonResponse(['data' => $apps]);
    }

    public function getAllApplications(): void
    {
        $user    = requireRole('hospital');
        $page    = (int)($_GET['page'] ?? 1);
        $perPage = min((int)($_GET['per_page'] ?? 20), 100);
        $filters = ['status' => $_GET['status'] ?? '', 'search' => $_GET['search'] ?? ''];
        jsonResponse($this->appModel->getForHospital($user['id'], $filters, $page, $perPage));
    }

    public function updateApplicationStatus(int $appId): void
    {
        $user = requireRole('hospital');
        $data = getRequestBody();
        requireField($data, 'status');

        $allowed = ['new', 'reviewed', 'shortlisted', 'rejected', 'interview', 'hired'];
        if (!in_array($data['status'], $allowed, true)) {
            jsonError('Invalid status.', 422);
        }

        $result = $this->appModel->updateStatus($appId, $user['id'], $data['status']);
        if (!$result) jsonError('Application not found or unauthorized.', 404);

        // Notify applicant
        $stmt = $this->db->prepare(
            'SELECT ja.applicant_id, j.title FROM job_applications ja JOIN jobs j ON j.id = ja.job_id WHERE ja.id = ?'
        );
        $stmt->execute([$appId]);
        $row = $stmt->fetch();
        if ($row) {
            $this->notifService->applicationStatusChanged($row['applicant_id'], $data['status'], $row['title']);
        }

        $this->auditLog->log($user['id'], 'application_status_changed', 'job_application', $appId);
        jsonResponse(['success' => true, 'message' => 'Application status updated.']);
    }

    public function getAppointments(): void
    {
        $user    = requireRole('hospital');
        $page    = max(1, (int)($_GET['page'] ?? 1));
        $perPage = min((int)($_GET['per_page'] ?? 20), 100);
        $status  = trim($_GET['status'] ?? '');
        $search  = trim($_GET['search'] ?? '');
        $date    = trim($_GET['date'] ?? ''); // today | week | month | '' (all)
        $offset  = ($page - 1) * $perPage;

        $conditions = [
            "a.doctor_id IN (
                SELECT DISTINCT ja.applicant_id FROM job_applications ja
                JOIN jobs j ON j.id = ja.job_id
                WHERE j.hospital_id = ? AND ja.status = 'hired'
            )"
        ];
        $params = [$user['id']];

        if ($status !== '') {
            $conditions[] = 'a.status = ?';
            $params[]     = $status;
        }
        if ($search !== '') {
            $conditions[] = '(a.patient_name LIKE ? OR dp.full_name LIKE ?)';
            $like         = '%' . $search . '%';
            $params       = array_merge($params, [$like, $like]);
        }
        if ($date === 'today') {
            $conditions[] = 'a.appointment_date = CURDATE()';
        } elseif ($date === 'week') {
            $conditions[] = 'a.appointment_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)';
        } elseif ($date === 'month') {
            $conditions[] = 'MONTH(a.appointment_date) = MONTH(CURDATE()) AND YEAR(a.appointment_date) = YEAR(CURDATE())';
        }
        $where = implode(' AND ', $conditions);

        $countStmt = $this->db->prepare(
            "SELECT COUNT(*) FROM appointments a JOIN doctor_profiles dp ON dp.user_id = a.doctor_id WHERE {$where}"
        );
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT a.*, dp.full_name AS doctor_name, dp.specialization
             FROM appointments a
             JOIN doctor_profiles dp ON dp.user_id = a.doctor_id
             WHERE {$where}
             ORDER BY a.appointment_date DESC, a.appointment_time DESC
             LIMIT {$perPage} OFFSET {$offset}"
        );
        $stmt->execute($params);

        jsonResponse([
            'data'        => $stmt->fetchAll(),
            'total'       => $total,
            'page'        => $page,
            'per_page'    => $perPage,
            'total_pages' => (int)ceil($total / max(1, $perPage)),
        ]);
    }

    public function listDoctors(): void
    {
        $user   = requireRole('hospital');
        $search = trim($_GET['search'] ?? '');

        $searchSql = '';
        $searchParams = [];
        if ($search !== '') {
            $searchSql = ' AND (dp.full_name LIKE ? OR dp.specialization LIKE ?)';
            $like = '%' . $search . '%';
            $searchParams = [$like, $like];
        }

        // Doctors hired via this hospital's job postings, plus any directly
        // added to the roster (hospital_doctors), deduplicated.
        $stmt = $this->db->prepare(
            "SELECT DISTINCT dp.user_id AS id, dp.full_name, dp.specialization, dp.qualification,
                    dp.experience_years, dp.phone, dp.is_available, u.email, u.status AS account_status,
                    hd.status AS roster_status
             FROM doctor_profiles dp
             JOIN users u ON u.id = dp.user_id
             LEFT JOIN hospital_doctors hd ON hd.doctor_id = dp.user_id AND hd.hospital_id = ?
             WHERE (
                 dp.user_id IN (
                     SELECT DISTINCT ja.applicant_id FROM job_applications ja
                     JOIN jobs j ON j.id = ja.job_id
                     WHERE j.hospital_id = ? AND ja.status = 'hired'
                 )
                 OR hd.hospital_id = ?
             ){$searchSql}
             ORDER BY dp.full_name ASC"
        );
        $stmt->execute(array_merge([$user['id'], $user['id'], $user['id']], $searchParams));
        jsonResponse(['data' => $stmt->fetchAll()]);
    }

    public function addDoctor(): void
    {
        $user = requireRole('hospital');
        $data = getRequestBody();
        requireField($data, 'email');

        $stmt = $this->db->prepare("SELECT id FROM users WHERE email = ? AND role = 'doctor'");
        $stmt->execute([trim($data['email'])]);
        $doctor = $stmt->fetch();
        if (!$doctor) jsonError('No doctor account found with that email.', 404);

        $stmt = $this->db->prepare(
            'INSERT INTO hospital_doctors (hospital_id, doctor_id, status)
             VALUES (?, ?, "active")
             ON DUPLICATE KEY UPDATE status = "active"'
        );
        $stmt->execute([$user['id'], $doctor['id']]);

        $this->auditLog->log($user['id'], 'doctor_added', 'hospital_doctors', (int)$doctor['id']);
        jsonResponse(['success' => true, 'message' => 'Doctor added to your roster.'], 201);
    }

    public function removeDoctor(int $doctorId): void
    {
        $user = requireRole('hospital');
        $stmt = $this->db->prepare('DELETE FROM hospital_doctors WHERE hospital_id = ? AND doctor_id = ?');
        $stmt->execute([$user['id'], $doctorId]);
        if ($stmt->rowCount() === 0) {
            jsonError('Doctor was not directly on your roster (may still be listed via a hired job application).', 404);
        }
        $this->auditLog->log($user['id'], 'doctor_removed', 'hospital_doctors', $doctorId);
        jsonResponse(['success' => true, 'message' => 'Doctor removed from roster.']);
    }

    public function reports(): void
    {
        $user = requireRole('hospital');
        $from = trim($_GET['from'] ?? '');
        $to   = trim($_GET['to'] ?? '');

        $dateSql = '';
        $dateParams = [];
        if ($from !== '' && $to !== '') {
            $dateSql = ' AND j.created_at BETWEEN ? AND ?';
            $dateParams = [$from . ' 00:00:00', $to . ' 23:59:59'];
        }

        $stmt = $this->db->prepare(
            "SELECT j.title, COUNT(ja.id) AS applications, j.status
             FROM jobs j LEFT JOIN job_applications ja ON ja.job_id = j.id
             WHERE j.hospital_id = ?{$dateSql} GROUP BY j.id ORDER BY applications DESC LIMIT 10"
        );
        $stmt->execute(array_merge([$user['id']], $dateParams));
        $jobStats = $stmt->fetchAll();

        $stmt = $this->db->prepare(
            "SELECT ja.status, COUNT(*) AS count FROM job_applications ja
             JOIN jobs j ON j.id = ja.job_id WHERE j.hospital_id = ?{$dateSql} GROUP BY ja.status"
        );
        $stmt->execute(array_merge([$user['id']], $dateParams));
        $appsByStatus = $stmt->fetchAll();

        $stmt = $this->db->prepare(
            "SELECT COUNT(*) FROM appointments a
             WHERE a.doctor_id IN (
                 SELECT DISTINCT ja.applicant_id FROM job_applications ja
                 JOIN jobs j ON j.id = ja.job_id WHERE j.hospital_id = ? AND ja.status = 'hired'
             )"
        );
        $stmt->execute([$user['id']]);
        $totalAppointments = (int)$stmt->fetchColumn();

        // Appointments per month for the last 6 months
        $stmt = $this->db->prepare(
            "SELECT DATE_FORMAT(a.appointment_date, '%Y-%m') AS ym, COUNT(*) AS count
             FROM appointments a
             WHERE a.doctor_id IN (
                 SELECT DISTINCT ja.applicant_id FROM job_applications ja
                 JOIN jobs j ON j.id = ja.job_id WHERE j.hospital_id = ? AND ja.status = 'hired'
             )
             AND a.appointment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
             GROUP BY ym ORDER BY ym ASC"
        );
        $stmt->execute([$user['id']]);
        $monthlyAppointments = $stmt->fetchAll();

        // Specialization breakdown of the hospital's roster
        $stmt = $this->db->prepare(
            "SELECT dp.specialization, COUNT(DISTINCT dp.user_id) AS count
             FROM doctor_profiles dp
             WHERE dp.user_id IN (
                 SELECT DISTINCT ja.applicant_id FROM job_applications ja
                 JOIN jobs j ON j.id = ja.job_id WHERE j.hospital_id = ? AND ja.status = 'hired'
                 UNION
                 SELECT doctor_id FROM hospital_doctors WHERE hospital_id = ? AND status = 'active'
             )
             GROUP BY dp.specialization ORDER BY count DESC"
        );
        $stmt->execute([$user['id'], $user['id']]);
        $specializationBreakdown = $stmt->fetchAll();

        $stmt = $this->db->prepare(
            "SELECT COUNT(DISTINCT dp.user_id) FROM doctor_profiles dp
             WHERE dp.user_id IN (
                 SELECT DISTINCT ja.applicant_id FROM job_applications ja
                 JOIN jobs j ON j.id = ja.job_id WHERE j.hospital_id = ? AND ja.status = 'hired'
                 UNION
                 SELECT doctor_id FROM hospital_doctors WHERE hospital_id = ? AND status = 'active'
             )"
        );
        $stmt->execute([$user['id'], $user['id']]);
        $activeDoctors = (int)$stmt->fetchColumn();

        jsonResponse([
            'job_stats'               => $jobStats,
            'apps_by_status'          => $appsByStatus,
            'total_appointments'      => $totalAppointments,
            'monthly_appointments'    => $monthlyAppointments,
            'specialization_breakdown' => $specializationBreakdown,
            'active_doctors'          => $activeDoctors,
            'generated_at'            => date('c'),
        ]);
    }
}
