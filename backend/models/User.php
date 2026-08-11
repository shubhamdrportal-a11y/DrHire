<?php
declare(strict_types=1);

class User
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT id, email, role, status, created_at FROM users WHERE id = ?');
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function findByEmail(string $email): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM users WHERE email = ?');
        $stmt->execute([strtolower(trim($email))]);
        return $stmt->fetch() ?: null;
    }

    public function create(string $email, string $password, string $role): int
    {
        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $status = ($role === 'admin') ? 'active' : 'pending';

        $stmt = $this->db->prepare(
            'INSERT INTO users (email, password_hash, role, status) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([strtolower(trim($email)), $hash, $role, $status]);
        return (int)$this->db->lastInsertId();
    }

    public function verifyPassword(string $plain, string $hash): bool
    {
        return password_verify($plain, $hash);
    }

    public function updateStatus(int $id, string $status): bool
    {
        $stmt = $this->db->prepare('UPDATE users SET status = ? WHERE id = ?');
        $stmt->execute([$status, $id]);
        return $stmt->rowCount() > 0;
    }

    public function updatePassword(int $id, string $newPassword): bool
    {
        $hash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
        $stmt = $this->db->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
        $stmt->execute([$hash, $id]);
        return $stmt->rowCount() > 0;
    }

    public function getAll(array $filters = [], int $page = 1, int $perPage = 20): array
    {
        $conditions = ['1=1'];
        $params     = [];

        if (!empty($filters['role'])) {
            $conditions[] = 'u.role = ?';
            $params[]     = $filters['role'];
        }
        if (!empty($filters['status'])) {
            $conditions[] = 'u.status = ?';
            $params[]     = $filters['status'];
        }
        if (!empty($filters['search'])) {
            $conditions[] = '(u.email LIKE ?)';
            $params[]     = '%' . $filters['search'] . '%';
        }

        $where  = implode(' AND ', $conditions);
        $offset = ($page - 1) * $perPage;

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM users u WHERE {$where}");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT u.id, u.email, u.role, u.status, u.created_at,
                    COALESCE(dp.full_name, hp.hospital_name, sp.full_name, '') AS display_name
             FROM users u
             LEFT JOIN doctor_profiles dp   ON dp.user_id = u.id
             LEFT JOIN hospital_profiles hp ON hp.user_id = u.id
             LEFT JOIN staff_profiles sp    ON sp.user_id = u.id
             WHERE {$where}
             ORDER BY u.created_at DESC
             LIMIT {$perPage} OFFSET {$offset}"
        );
        $stmt->execute($params);

        return [
            'data'        => $stmt->fetchAll(),
            'total'       => $total,
            'page'        => $page,
            'per_page'    => $perPage,
            'total_pages' => (int)ceil($total / $perPage),
        ];
    }

    public function getCounts(): array
    {
        $stmt = $this->db->query(
            "SELECT
                COUNT(*) AS total,
                SUM(role = 'doctor')   AS doctors,
                SUM(role = 'hospital') AS hospitals,
                SUM(role = 'staff')    AS staff,
                SUM(status = 'active') AS active,
                SUM(status = 'pending') AS pending
             FROM users"
        );
        return $stmt->fetch();
    }

    public function activateAfterProfileSetup(int $userId): void
    {
        $stmt = $this->db->prepare("UPDATE users SET status = 'active' WHERE id = ? AND status = 'pending'");
        $stmt->execute([$userId]);
    }
}
