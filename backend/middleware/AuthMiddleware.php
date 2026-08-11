<?php
/**
 * AuthMiddleware.php
 * Provides helper functions to enforce authentication and role-based access.
 */

declare(strict_types=1);

function requireAuth(): array
{
    if (empty($_SESSION['user_id'])) {
        jsonError('Unauthorized. Please log in.', 401);
    }

    return [
        'id'     => (int)$_SESSION['user_id'],
        'email'  => $_SESSION['user_email']  ?? '',
        'role'   => $_SESSION['user_role']   ?? '',
        'status' => $_SESSION['user_status'] ?? '',
    ];
}

function requireRole(string ...$roles): array
{
    $user = requireAuth();

    if (!in_array($user['role'], $roles, true)) {
        jsonError('Forbidden. You do not have permission to access this resource.', 403);
    }

    if ($user['status'] === 'suspended') {
        jsonError('Your account has been suspended. Please contact support.', 403);
    }

    return $user;
}

function currentUserId(): ?int
{
    return isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;
}

function isAuthenticated(): bool
{
    return !empty($_SESSION['user_id']);
}
