<?php
declare(strict_types=1);

require_once __DIR__ . '/../services/AuthService.php';
require_once __DIR__ . '/../middleware/RateLimit.php';

class AuthController
{
    private AuthService $auth;

    public function __construct(PDO $db)
    {
        $this->auth = new AuthService($db);
    }

    public function register(): void
    {
        RateLimit::check('register', 5, 300); // 5 per 5 minutes
        $data = getRequestBody();
        $payload = $this->auth->register($data);

        // Start session for the newly registered user
        $user = (new \User(getDbConnection()))->findById($payload['id']);
        $_SESSION['user_id']     = $payload['id'];
        $_SESSION['user_email']  = $payload['email'];
        $_SESSION['user_role']   = $payload['role'];
        $_SESSION['user_status'] = $payload['status'];

        jsonResponse(['success' => true, 'user' => $payload, 'message' => 'Registration successful.'], 201);
    }

    public function login(): void
    {
        RateLimit::check('login', 10, 60); // 10 per minute
        $data = getRequestBody();
        requireField($data, 'email', 'password');
        $payload = $this->auth->login($data['email'], $data['password']);
        jsonResponse(['success' => true, 'user' => $payload]);
    }

    public function logout(): void
    {
        $user = requireAuth();
        $this->auth->logout($user['id']);
        jsonResponse(['success' => true, 'message' => 'Logged out successfully.']);
    }

    public function me(): void
    {
        $user = requireAuth();
        $payload = $this->auth->me($user['id']);
        jsonResponse($payload);
    }

    public function changePassword(): void
    {
        $user = requireAuth();
        $data = getRequestBody();
        requireField($data, 'current_password', 'new_password');
        $this->auth->changePassword($user['id'], $data['current_password'], $data['new_password']);
        jsonResponse(['success' => true, 'message' => 'Password changed successfully.']);
    }

    public function deleteAccount(): void
    {
        $user = requireAuth();
        $data = getRequestBody();
        requireField($data, 'password');
        $this->auth->deleteAccount($user['id'], $data['password']);
        jsonResponse(['success' => true, 'message' => 'Account deleted.']);
    }
}
