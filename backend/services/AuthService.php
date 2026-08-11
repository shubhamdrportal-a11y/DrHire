<?php
declare(strict_types=1);

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/DoctorProfile.php';
require_once __DIR__ . '/../models/HospitalProfile.php';
require_once __DIR__ . '/../models/StaffProfile.php';
require_once __DIR__ . '/../models/AuditLog.php';
require_once __DIR__ . '/../models/Notification.php';

class AuthService
{
    private User            $userModel;
    private DoctorProfile   $doctorModel;
    private HospitalProfile $hospitalModel;
    private StaffProfile    $staffModel;
    private AuditLog        $auditLog;
    private Notification    $notifModel;
    private PDO             $db;

    public function __construct(PDO $db)
    {
        $this->db            = $db;
        $this->userModel     = new User($db);
        $this->doctorModel   = new DoctorProfile($db);
        $this->hospitalModel = new HospitalProfile($db);
        $this->staffModel    = new StaffProfile($db);
        $this->auditLog      = new AuditLog($db);
        $this->notifModel    = new Notification($db);
    }

    public function register(array $data): array
    {
        $role = $data['role'] ?? '';

        // Admin cannot self-register
        if ($role === 'admin') {
            jsonError('Admin accounts cannot be self-registered.', 403);
        }

        $allowedRoles = ['doctor', 'hospital', 'staff'];
        if (!in_array($role, $allowedRoles, true)) {
            jsonError('Invalid role selected.', 422);
        }

        requireField($data, 'email', 'password', 'role');

        $email    = strtolower(trim($data['email']));
        $password = $data['password'];

        // Validate email
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonError('Invalid email address.', 422);
        }

        // Password strength
        if (strlen($password) < 8) {
            jsonError('Password must be at least 8 characters.', 422);
        }

        // Check duplicate email
        if ($this->userModel->findByEmail($email)) {
            jsonError('An account with this email already exists.', 409);
        }

        // Role-specific required fields
        match ($role) {
            'doctor'   => requireField($data, 'full_name', 'phone', 'specialization', 'qualification'),
            'hospital' => requireField($data, 'full_name', 'phone', 'hospital_name'),
            'staff'    => requireField($data, 'full_name', 'phone'),
        };

        $this->db->beginTransaction();
        try {
            $userId = $this->userModel->create($email, $password, $role);

            match ($role) {
                'doctor'   => $this->doctorModel->create($userId, array_merge($data, ['full_name' => $data['full_name']])),
                'hospital' => $this->hospitalModel->create($userId, $data),
                'staff'    => $this->staffModel->create($userId, $data),
            };

            // Auto-activate after profile creation
            $this->userModel->activateAfterProfileSetup($userId);

            // Welcome notification
            $name = $data['full_name'] ?? $data['hospital_name'] ?? 'User';
            $this->notifModel->create($userId, 'Welcome to DRHire!', "Hi {$name}, your account has been created. Complete your profile to get started.", 'welcome');

            $this->auditLog->log($userId, 'user_registered', 'user', $userId);
            $this->db->commit();

            $user = $this->userModel->findById($userId);
            return $this->buildSessionPayload($user);

        } catch (\Throwable $e) {
            $this->db->rollBack();
            error_log('Registration failed: ' . $e->getMessage());
            jsonError('Registration failed. Please try again.', 500);
        }
    }

    public function login(string $email, string $password): array
    {
        $email = strtolower(trim($email));
        $user  = $this->userModel->findByEmail($email);

        if (!$user || !$this->userModel->verifyPassword($password, $user['password_hash'])) {
            jsonError('Invalid email or password.', 401);
        }

        if ($user['status'] === 'suspended') {
            jsonError('Your account has been suspended. Please contact support.', 403);
        }

        $payload = $this->buildSessionPayload($user);
        $this->startSession($user);
        $this->auditLog->log($user['id'], 'user_login', 'user', $user['id']);

        return $payload;
    }

    public function logout(int $userId): void
    {
        $this->auditLog->log($userId, 'user_logout', 'user', $userId);
        $_SESSION = [];
        session_destroy();
    }

    public function me(int $userId): array
    {
        $user = $this->userModel->findById($userId);
        if (!$user) {
            jsonError('User not found.', 404);
        }

        $profile = $this->getProfile($userId, $user['role']);
        return array_merge($this->buildSessionPayload($user), ['profile' => $profile]);
    }

    private function startSession(array $user): void
    {
        $_SESSION['user_id']     = $user['id'];
        $_SESSION['user_email']  = $user['email'];
        $_SESSION['user_role']   = $user['role'];
        $_SESSION['user_status'] = $user['status'];
        session_regenerate_id(true);
        $_SESSION['_last_regenerated'] = time();
    }

    private function buildSessionPayload(array $user): array
    {
        return [
            'id'     => (int)$user['id'],
            'email'  => $user['email'],
            'role'   => $user['role'],
            'status' => $user['status'],
        ];
    }

    private function getProfile(int $userId, string $role): ?array
    {
        return match ($role) {
            'doctor'   => $this->doctorModel->getByUserId($userId),
            'hospital' => $this->hospitalModel->getByUserId($userId),
            'staff'    => $this->staffModel->getByUserId($userId),
            default    => null,
        };
    }

    public function changePassword(int $userId, string $currentPassword, string $newPassword): void
    {
        $user = $this->userModel->findById($userId);
        $full = $this->db->prepare('SELECT password_hash FROM users WHERE id = ?');
        $full->execute([$userId]);
        $row = $full->fetch();

        if (!$row || !$this->userModel->verifyPassword($currentPassword, $row['password_hash'])) {
            jsonError('Current password is incorrect.', 401);
        }
        if (strlen($newPassword) < 8) {
            jsonError('New password must be at least 8 characters.', 422);
        }

        $this->userModel->updatePassword($userId, $newPassword);
        $this->auditLog->log($userId, 'password_changed', 'user', $userId);
    }

    public function deleteAccount(int $userId, string $password): void
    {
        $full = $this->db->prepare('SELECT password_hash FROM users WHERE id = ?');
        $full->execute([$userId]);
        $row = $full->fetch();

        if (!$row || !$this->userModel->verifyPassword($password, $row['password_hash'])) {
            jsonError('Password is incorrect.', 401);
        }

        $this->auditLog->log($userId, 'account_deleted', 'user', $userId);
        $this->userModel->delete($userId);
        $_SESSION = [];
        session_destroy();
    }
}
