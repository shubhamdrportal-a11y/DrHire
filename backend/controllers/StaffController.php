<?php
declare(strict_types=1);

require_once __DIR__ . '/../models/StaffProfile.php';
require_once __DIR__ . '/../models/Appointment.php';
require_once __DIR__ . '/../models/DoctorProfile.php';
require_once __DIR__ . '/../models/Availability.php';
require_once __DIR__ . '/../models/Job.php';
require_once __DIR__ . '/../models/JobApplication.php';
require_once __DIR__ . '/../models/AuditLog.php';
require_once __DIR__ . '/../services/NotificationService.php';

class StaffController
{
    private StaffProfile       $profileModel;
    private Appointment        $apptModel;
    private DoctorProfile      $doctorModel;
    private Availability       $availModel;
    private Job                $jobModel;
    private JobApplication     $appModel;
    private AuditLog           $auditLog;
    private NotificationService $notifService;

    public function __construct(PDO $db)
    {
        $this->profileModel  = new StaffProfile($db);
        $this->apptModel     = new Appointment($db);
        $this->doctorModel   = new DoctorProfile($db);
        $this->availModel    = new Availability($db);
        $this->jobModel      = new Job($db);
        $this->appModel      = new JobApplication($db);
        $this->auditLog      = new AuditLog($db);
        $this->notifService  = new NotificationService($db);
    }

    public function getProfile(): void
    {
        $user    = requireRole('staff');
        $profile = $this->profileModel->getByUserId($user['id']);
        if (!$profile) jsonError('Profile not found.', 404);
        jsonResponse($profile);
    }

    public function updateProfile(): void
    {
        $user = requireRole('staff');
        $data = getRequestBody();
        $this->profileModel->update($user['id'], $data);
        $this->auditLog->log($user['id'], 'profile_updated', 'staff_profile', $user['id']);
        jsonResponse(['success' => true, 'message' => 'Profile updated.']);
    }

    public function stats(): void
    {
        $user  = requireRole('staff');
        $appts = $this->apptModel->getStatsForPatient($user['id']);
        $apps  = $this->appModel->getCountForApplicant($user['id']);

        jsonResponse([
            'appointments' => $appts,
            'applications' => $apps,
        ]);
    }

    public function findDoctors(): void
    {
        requireAuth(); // any authenticated user
        $page    = (int)($_GET['page'] ?? 1);
        $perPage = min((int)($_GET['per_page'] ?? 20), 100);
        $filters = [
            'specialization' => $_GET['specialization'] ?? '',
            'city'           => $_GET['city']           ?? '',
            'search'         => $_GET['search']         ?? '',
            'is_available'   => isset($_GET['available']) ? 1 : null,
        ];
        jsonResponse($this->doctorModel->getAll($filters, $page, $perPage));
    }

    public function bookAppointment(): void
    {
        $user = requireRole('staff');
        $data = getRequestBody();

        requireField($data, 'doctor_id', 'patient_name', 'patient_phone', 'appointment_date', 'appointment_time', 'reason');

        $doctorId = (int)$data['doctor_id'];

        // Validate date is in future
        if (strtotime($data['appointment_date']) < strtotime('today')) {
            jsonError('Appointment date must be today or in the future.', 422);
        }

        $apptId = $this->apptModel->book($doctorId, $user['id'], $data);

        // Get doctor profile for notification
        $doctorProfile = $this->doctorModel->getByUserId($doctorId);
        if ($doctorProfile) {
            $this->notifService->appointmentBooked(
                $doctorId,
                $data['patient_name'],
                $data['appointment_date'],
                $data['appointment_time']
            );
        }

        $this->auditLog->log($user['id'], 'appointment_booked', 'appointment', $apptId);
        jsonResponse(['success' => true, 'appointment_id' => $apptId, 'message' => 'Appointment booked successfully.'], 201);
    }

    public function getAppointments(): void
    {
        $user    = requireRole('staff');
        $page    = (int)($_GET['page'] ?? 1);
        $perPage = min((int)($_GET['per_page'] ?? 20), 100);
        $filters = ['status' => $_GET['status'] ?? ''];
        jsonResponse($this->apptModel->getForPatient($user['id'], $filters, $page, $perPage));
    }

    public function cancelAppointment(int $apptId): void
    {
        $user   = requireRole('staff');
        $result = $this->apptModel->updateStatus($apptId, 'cancelled', $user['id'], 'patient');
        if (!$result) jsonError('Appointment not found or cannot be cancelled.', 404);
        $this->auditLog->log($user['id'], 'appointment_cancelled', 'appointment', $apptId);
        jsonResponse(['success' => true, 'message' => 'Appointment cancelled.']);
    }

    public function getApplications(): void
    {
        $user    = requireRole('staff');
        $page    = (int)($_GET['page'] ?? 1);
        $perPage = min((int)($_GET['per_page'] ?? 20), 100);
        jsonResponse($this->appModel->getForApplicant($user['id'], $page, $perPage));
    }

    public function browseJobs(): void
    {
        requireRole('staff');
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
        $user = requireRole('staff');
        $data = getRequestBody();

        $appId = $this->appModel->apply($jobId, $user['id'], $data);

        // Get job details for notification
        $job = $this->jobModel->getById($jobId);
        if ($job) {
            $profile = $this->profileModel->getByUserId($user['id']);
            $name    = $profile['full_name'] ?? 'An applicant';
            $this->notifService->newApplicationReceived($job['hospital_id'], $name, $job['title']);
        }

        $this->auditLog->log($user['id'], 'job_applied', 'job_application', $appId);
        jsonResponse(['success' => true, 'application_id' => $appId, 'message' => 'Application submitted successfully.'], 201);
    }

    public function getDoctorAvailability(int $doctorId): void
    {
        requireAuth();
        $slots = $this->availModel->getForDoctor($doctorId);
        jsonResponse(['data' => $slots]);
    }
}
