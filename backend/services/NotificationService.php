<?php
declare(strict_types=1);

require_once __DIR__ . '/../models/Notification.php';

class NotificationService
{
    private Notification $model;

    public function __construct(PDO $db)
    {
        $this->model = new Notification($db);
    }

    public function appointmentBooked(int $doctorId, string $patientName, string $date, string $time): void
    {
        $this->model->create(
            $doctorId,
            'New Appointment Booked',
            "{$patientName} has booked an appointment on {$date} at {$time}.",
            'appointment'
        );
    }

    public function appointmentStatusChanged(int $patientId, string $status, string $doctorName): void
    {
        $messages = [
            'confirmed'  => "Your appointment with Dr. {$doctorName} has been confirmed.",
            'completed'  => "Your appointment with Dr. {$doctorName} has been marked as completed.",
            'cancelled'  => "Your appointment with Dr. {$doctorName} has been cancelled.",
        ];
        $msg = $messages[$status] ?? "Your appointment status changed to {$status}.";
        $this->model->create($patientId, 'Appointment Update', $msg, 'appointment');
    }

    public function applicationStatusChanged(int $applicantId, string $status, string $jobTitle): void
    {
        $messages = [
            'reviewed'    => "Your application for '{$jobTitle}' has been reviewed.",
            'shortlisted' => "Congratulations! You've been shortlisted for '{$jobTitle}'.",
            'interview'   => "You've been invited for an interview for '{$jobTitle}'.",
            'hired'       => "Congratulations! You've been hired for '{$jobTitle}'!",
            'rejected'    => "Your application for '{$jobTitle}' was not successful this time.",
        ];
        $msg = $messages[$status] ?? "Your application status for '{$jobTitle}' has been updated to {$status}.";
        $this->model->create($applicantId, 'Application Update', $msg, 'application');
    }

    public function newApplicationReceived(int $hospitalUserId, string $applicantName, string $jobTitle): void
    {
        $this->model->create(
            $hospitalUserId,
            'New Job Application',
            "{$applicantName} has applied for '{$jobTitle}'.",
            'application'
        );
    }
}
