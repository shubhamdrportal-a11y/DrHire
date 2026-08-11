<?php
declare(strict_types=1);

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/AuditLog.php';

class AdminController
{
    private User     $userModel;
    private AuditLog $auditLog;
    private PDO      $db;

    public function __construct(PDO $db)
    {
        $this->db        = $db;
        $this->userModel = new User($db);
        $this->auditLog  = new AuditLog($db);
    }

    public function stats(): void
    {
        requireRole('admin');

        $userCounts = $this->userModel->getCounts();

        $jobCount  = (int)$this->db->query("SELECT COUNT(*) FROM jobs WHERE status = 'active'")->fetchColumn();
        $apptCount = (int)$this->db->query('SELECT COUNT(*) FROM appointments')->fetchColumn();
        $appCount  = (int)$this->db->query('SELECT COUNT(*) FROM job_applications')->fetchColumn();

        // Monthly growth (current month vs last month registrations)
        $currentMonth = (int)$this->db->query(
            "SELECT COUNT(*) FROM users WHERE MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())"
        )->fetchColumn();
        $lastMonth = (int)$this->db->query(
            "SELECT COUNT(*) FROM users WHERE MONTH(created_at) = MONTH(NOW() - INTERVAL 1 MONTH) AND YEAR(created_at) = YEAR(NOW() - INTERVAL 1 MONTH)"
        )->fetchColumn();

        // Monthly appointments breakdown
        $monthlyAppts = $this->db->query(
            "SELECT DATE_FORMAT(appointment_date,'%b') AS month, COUNT(*) AS count
             FROM appointments
             WHERE appointment_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
             GROUP BY DATE_FORMAT(appointment_date,'%Y-%m'), DATE_FORMAT(appointment_date,'%b')
             ORDER BY appointment_date ASC"
        )->fetchAll();

        jsonResponse([
            'users'         => (int)$userCounts['total'],
            'doctors'       => (int)$userCounts['doctors'],
            'hospitals'     => (int)$userCounts['hospitals'],
            'staff'         => (int)$userCounts['staff'],
            'active_users'  => (int)$userCounts['active'],
            'pending_users' => (int)$userCounts['pending'],
            'active_jobs'   => $jobCount,
            'appointments'  => $apptCount,
            'applications'  => $appCount,
            'monthly_growth' => [
                'current' => $currentMonth,
                'last'    => $lastMonth,
                'percent' => $lastMonth > 0 ? round((($currentMonth - $lastMonth) / $lastMonth) * 100, 1) : 0,
            ],
            'monthly_appointments' => $monthlyAppts,
        ]);
    }

    public function users(): void
    {
        requireRole('admin');
        $page     = (int)($_GET['page']   ?? 1);
        $perPage  = min((int)($_GET['per_page'] ?? 20), 100);
        $filters  = [
            'role'   => $_GET['role']   ?? '',
            'status' => $_GET['status'] ?? '',
            'search' => $_GET['search'] ?? '',
        ];
        jsonResponse($this->userModel->getAll($filters, $page, $perPage));
    }

    public function updateUserStatus(int $userId): void
    {
        $admin = requireRole('admin');
        $data  = getRequestBody();
        requireField($data, 'status');

        $allowed = ['active', 'suspended', 'pending'];
        if (!in_array($data['status'], $allowed, true)) {
            jsonError('Invalid status value.', 422);
        }

        $this->userModel->updateStatus($userId, $data['status']);
        $this->auditLog->log($admin['id'], 'user_status_changed', 'user', $userId);
        jsonResponse(['success' => true, 'message' => 'User status updated.']);
    }

    public function doctors(): void
    {
        requireRole('admin');
        $page    = (int)($_GET['page'] ?? 1);
        $perPage = min((int)($_GET['per_page'] ?? 20), 100);
        $filters = ['search' => $_GET['search'] ?? ''];

        $model = new \DoctorProfile($this->db);
        jsonResponse($model->getAll($filters, $page, $perPage));
    }

    public function hospitals(): void
    {
        requireRole('admin');
        $page    = (int)($_GET['page'] ?? 1);
        $perPage = min((int)($_GET['per_page'] ?? 20), 100);
        $filters = ['search' => $_GET['search'] ?? ''];

        $model = new \HospitalProfile($this->db);
        jsonResponse($model->getAll($filters, $page, $perPage));
    }

    public function jobs(): void
    {
        requireRole('admin');
        $page    = (int)($_GET['page'] ?? 1);
        $perPage = min((int)($_GET['per_page'] ?? 20), 100);
        $filters = [
            'search' => $_GET['search'] ?? '',
            'status' => $_GET['status'] ?? 'active',
        ];
        $model = new \Job($this->db);
        jsonResponse($model->getAll($filters, $page, $perPage));
    }

    public function appointments(): void
    {
        requireRole('admin');
        $page    = (int)($_GET['page'] ?? 1);
        $perPage = min((int)($_GET['per_page'] ?? 20), 100);
        $filters = ['status' => $_GET['status'] ?? ''];

        $model = new \Appointment($this->db);
        jsonResponse($model->getAll($filters, $page, $perPage));
    }

    public function reports(): void
    {
        requireRole('admin');

        // Appointments by status
        $apptByStatus = $this->db->query(
            "SELECT status, COUNT(*) AS count FROM appointments GROUP BY status"
        )->fetchAll();

        // Applications by status
        $appByStatus = $this->db->query(
            "SELECT status, COUNT(*) AS count FROM job_applications GROUP BY status"
        )->fetchAll();

        // Jobs by type
        $jobsByType = $this->db->query(
            "SELECT type, COUNT(*) AS count FROM jobs WHERE status='active' GROUP BY type"
        )->fetchAll();

        // New users per month (last 6 months)
        $usersPerMonth = $this->db->query(
            "SELECT DATE_FORMAT(created_at,'%b %Y') AS month, COUNT(*) AS count
             FROM users
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
             GROUP BY DATE_FORMAT(created_at,'%Y-%m'), DATE_FORMAT(created_at,'%b %Y')
             ORDER BY created_at ASC"
        )->fetchAll();

        // Top specializations
        $topSpecializations = $this->db->query(
            "SELECT specialization, COUNT(*) AS count FROM doctor_profiles GROUP BY specialization ORDER BY count DESC LIMIT 10"
        )->fetchAll();

        jsonResponse([
            'appointments_by_status'  => $apptByStatus,
            'applications_by_status'  => $appByStatus,
            'jobs_by_type'            => $jobsByType,
            'users_per_month'         => $usersPerMonth,
            'top_specializations'     => $topSpecializations,
        ]);
    }

    public function auditLogs(): void
    {
        requireRole('admin');
        $page  = (int)($_GET['page']  ?? 1);
        $limit = (int)($_GET['limit'] ?? 50);
        jsonResponse($this->auditLog->getRecent($limit, $page));
    }
}
