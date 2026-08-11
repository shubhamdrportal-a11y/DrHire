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

        $activeJobs = (int)$this->db->prepare("SELECT COUNT(*) FROM jobs WHERE hospital_id = ? AND status = 'active'")->execute([$user['id']]);
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

        jsonResponse([
            'active_jobs'   => $activeJobs,
            'total_jobs'    => $totalJobs,
            'total_apps'    => $totalApps,
            'new_apps'      => $newApps,
        ]);
    }

    public function listJobs(): void
    {
        $user    = requireRole('hospital');
        $page    = (int)($_GET['page'] ?? 1);
        $perPage = min((int)($_GET['per_page'] ?? 20), 100);
        $filters = ['hospital_id' => $user['id'], 'status' => $_GET['status'] ?? ''];

        // For hospital's own view, show all statuses
        $stmt = $this->db->prepare(
            "SELECT j.*, COUNT(ja.id) AS application_count
             FROM jobs j
             LEFT JOIN job_applications ja ON ja.job_id = j.id
             WHERE j.hospital_id = ?
             GROUP BY j.id
             ORDER BY j.created_at DESC
             LIMIT ? OFFSET ?"
        );
        $offset = ($page - 1) * $perPage;
        $stmt->execute([$user['id'], $perPage, $offset]);
        $jobs = $stmt->fetchAll();

        foreach ($jobs as &$job) {
            $job['requirements'] = json_decode($job['requirements'] ?? '[]', true) ?? [];
            $job['benefits']     = json_decode($job['benefits']     ?? '[]', true) ?? [];
        }

        jsonResponse(['data' => $jobs]);
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
        $filters = ['status' => $_GET['status'] ?? ''];
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
        $user = requireRole('hospital');

        // Appointments with doctors employed by this hospital (via job_applications hired)
        $stmt = $this->db->prepare(
            "SELECT a.*, dp.full_name AS doctor_name, dp.specialization
             FROM appointments a
             JOIN doctor_profiles dp ON dp.user_id = a.doctor_id
             WHERE a.doctor_id IN (
                 SELECT DISTINCT ja.applicant_id
                 FROM job_applications ja
                 JOIN jobs j ON j.id = ja.job_id
                 WHERE j.hospital_id = ? AND ja.status = 'hired'
             )
             ORDER BY a.appointment_date DESC, a.appointment_time DESC
             LIMIT 50"
        );
        $stmt->execute([$user['id']]);
        jsonResponse(['data' => $stmt->fetchAll()]);
    }

    public function reports(): void
    {
        $user = requireRole('hospital');

        $stmt = $this->db->prepare(
            "SELECT j.title, COUNT(ja.id) AS applications, j.status
             FROM jobs j LEFT JOIN job_applications ja ON ja.job_id = j.id
             WHERE j.hospital_id = ? GROUP BY j.id ORDER BY applications DESC LIMIT 10"
        );
        $stmt->execute([$user['id']]);
        $jobStats = $stmt->fetchAll();

        $stmt = $this->db->prepare(
            "SELECT ja.status, COUNT(*) AS count FROM job_applications ja
             JOIN jobs j ON j.id = ja.job_id WHERE j.hospital_id = ? GROUP BY ja.status"
        );
        $stmt->execute([$user['id']]);
        $appsByStatus = $stmt->fetchAll();

        jsonResponse([
            'job_stats'       => $jobStats,
            'apps_by_status'  => $appsByStatus,
        ]);
    }
}
