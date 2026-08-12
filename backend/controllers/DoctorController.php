<?php
declare(strict_types=1);

require_once __DIR__ . '/../models/DoctorProfile.php';
require_once __DIR__ . '/../models/Appointment.php';
require_once __DIR__ . '/../models/Availability.php';
require_once __DIR__ . '/../models/Job.php';
require_once __DIR__ . '/../models/JobApplication.php';
require_once __DIR__ . '/../models/AuditLog.php';
require_once __DIR__ . '/../services/NotificationService.php';

class DoctorController
{
    private DoctorProfile      $profileModel;
    private Appointment        $apptModel;
    private Availability       $availModel;
    private Job                $jobModel;
    private JobApplication     $appModel;
    private AuditLog           $auditLog;
    private NotificationService $notifService;

    public function __construct(PDO $db)
    {
        $this->profileModel  = new DoctorProfile($db);
        $this->apptModel     = new Appointment($db);
        $this->availModel    = new Availability($db);
        $this->jobModel      = new Job($db);
        $this->appModel      = new JobApplication($db);
        $this->auditLog      = new AuditLog($db);
        $this->notifService  = new NotificationService($db);
    }

    public function getProfile(): void
    {
        $user    = requireRole('doctor');
        $profile = $this->profileModel->getByUserId($user['id']);
        if (!$profile) jsonError('Profile not found.', 404);
        jsonResponse($profile);
    }

    public function updateProfile(): void
    {
        $user = requireRole('doctor');
        $data = getRequestBody();
        $this->profileModel->update($user['id'], $data);
        $this->auditLog->log($user['id'], 'profile_updated', 'doctor_profile', $user['id']);
        jsonResponse(['success' => true, 'message' => 'Profile updated.']);
    }

    public function stats(): void
    {
        $user  = requireRole('doctor');
        $stats = $this->apptModel->getStatsForDoctor($user['id']);
        $appStats = $this->appModel->getCountForApplicant($user['id']);

        jsonResponse([
            'appointments'      => $stats,
            'applications'      => $appStats,
        ]);
    }

    public function getAppointments(): void
    {
        $user    = requireRole('doctor');
        $page    = (int)($_GET['page'] ?? 1);
        $perPage = min((int)($_GET['per_page'] ?? 20), 100);
        $filters = [
            'status' => $_GET['status'] ?? '',
            'date'   => $_GET['date']   ?? '',
            'search' => $_GET['search'] ?? '',
        ];
        jsonResponse($this->apptModel->getForDoctor($user['id'], $filters, $page, $perPage));
    }

    public function updateAppointmentStatus(int $apptId): void
    {
        $user = requireRole('doctor');
        $data = getRequestBody();
        requireField($data, 'status');

        $allowed = ['confirmed', 'completed', 'cancelled'];
        if (!in_array($data['status'], $allowed, true)) {
            jsonError('Invalid status. Use: confirmed, completed, or cancelled.', 422);
        }

        $result = $this->apptModel->updateStatus($apptId, $data['status'], $user['id'], 'doctor');
        if (!$result) jsonError('Appointment not found or unauthorized.', 404);

        // Notify patient
        $appt = $this->apptModel->getById($apptId);
        $profile = $this->profileModel->getByUserId($user['id']);
        if ($appt && $profile) {
            $this->notifService->appointmentStatusChanged(
                $appt['patient_id'], $data['status'], $profile['full_name']
            );
        }

        $this->auditLog->log($user['id'], 'appointment_status_changed', 'appointment', $apptId);
        jsonResponse(['success' => true, 'message' => 'Appointment status updated.']);
    }

    public function getAvailability(): void
    {
        $user  = requireRole('doctor');
        $slots = $this->availModel->getForDoctor($user['id']);
        jsonResponse(['data' => $slots]);
    }

    public function updateAvailability(): void
    {
        $user  = requireRole('doctor');
        $data  = getRequestBody();
        $slots = $data['slots'] ?? [];

        if (!is_array($slots)) {
            jsonError('Slots must be an array.', 422);
        }

        $this->availModel->setSlots($user['id'], $slots);
        $this->auditLog->log($user['id'], 'availability_updated', 'doctor_profile', $user['id']);
        jsonResponse(['success' => true, 'message' => 'Availability updated.']);
    }

    public function browseJobs(): void
    {
        requireRole('doctor');
        $page    = (int)($_GET['page'] ?? 1);
        $perPage = min((int)($_GET['per_page'] ?? 20), 100);
        $filters = [
            'specialization' => $_GET['specialization'] ?? '',
            'location'       => $_GET['location']       ?? '',
            'type'           => $_GET['type']           ?? '',
            'search'         => $_GET['search']         ?? '',
        ];
        jsonResponse($this->jobModel->getAll($filters, $page, $perPage));
    }

    public function applyForJob(int $jobId): void
    {
        $user = requireRole('doctor');
        $data = getRequestBody();

        $appId = $this->appModel->apply($jobId, $user['id'], $data);

        // Get job details for notification
        $job = $this->jobModel->getById($jobId);
        if ($job) {
            $profile = $this->profileModel->getByUserId($user['id']);
            $name    = $profile['full_name'] ?? 'A doctor';
            $this->notifService->newApplicationReceived($job['hospital_id'], $name, $job['title']);
        }

        $this->auditLog->log($user['id'], 'job_applied', 'job_application', $appId);
        jsonResponse(['success' => true, 'application_id' => $appId, 'message' => 'Application submitted successfully.'], 201);
    }

    public function getApplications(): void
    {
        $user    = requireRole('doctor');
        $page    = (int)($_GET['page'] ?? 1);
        $perPage = min((int)($_GET['per_page'] ?? 20), 100);
        jsonResponse($this->appModel->getForApplicant($user['id'], $page, $perPage));
    }

    public function getPatients(): void
    {
        $user = requireRole('doctor');
        $db   = getDbConnection();

        $search  = $_GET['search'] ?? '';
        $page    = max(1, (int)($_GET['page'] ?? 1));
        $perPage = min((int)($_GET['per_page'] ?? 20), 100);
        $offset  = ($page - 1) * $perPage;

        $where  = 'a.doctor_id = ?';
        $params = [$user['id']];
        if ($search !== '') {
            $where   .= ' AND (a.patient_name LIKE ? OR a.patient_phone LIKE ?)';
            $like     = '%' . $search . '%';
            $params[] = $like;
            $params[] = $like;
        }

        $countStmt = $db->prepare(
            "SELECT COUNT(DISTINCT a.patient_id) FROM appointments a WHERE {$where}"
        );
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $db->prepare(
            "SELECT a.patient_id, a.patient_name, a.patient_phone, a.patient_gender, a.patient_age,
                    COUNT(*) AS appointment_count, MAX(a.appointment_date) AS last_visit,
                    GROUP_CONCAT(DISTINCT a.reason SEPARATOR ', ') AS conditions,
                    MAX(a.status) AS last_status
             FROM appointments a
             WHERE {$where}
             GROUP BY a.patient_id, a.patient_name, a.patient_phone, a.patient_gender, a.patient_age
             ORDER BY last_visit DESC
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

    public function reports(): void
    {
        $user  = requireRole('doctor');
        $stats = $this->apptModel->getStatsForDoctor($user['id']);
        $db    = getDbConnection();
        $months = min(24, max(1, (int)($_GET['months'] ?? 6)));

        // Monthly appointment breakdown for chart
        $monthly = $db->prepare(
            "SELECT DATE_FORMAT(appointment_date, '%b') AS month, COUNT(*) AS count, status
             FROM appointments
             WHERE doctor_id = ? AND appointment_date >= DATE_SUB(NOW(), INTERVAL {$months} MONTH)
             GROUP BY DATE_FORMAT(appointment_date,'%Y-%m'), DATE_FORMAT(appointment_date,'%b'), status
             ORDER BY appointment_date ASC"
        );
        $monthly->execute([$user['id']]);

        // Top reasons
        $reasons = $db->prepare(
            "SELECT reason, COUNT(*) AS count FROM appointments WHERE doctor_id = ?
             GROUP BY reason ORDER BY count DESC LIMIT 10"
        );
        $reasons->execute([$user['id']]);

        jsonResponse([
            'stats'          => $stats,
            'monthly_data'   => $monthly->fetchAll(),
            'top_reasons'    => $reasons->fetchAll(),
        ]);
    }
}
