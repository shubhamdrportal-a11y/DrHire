<?php
declare(strict_types=1);

class HospitalProfile
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function getByUserId(int $userId): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT hp.*, u.email, u.status, u.created_at AS joined_at
             FROM hospital_profiles hp
             JOIN users u ON u.id = hp.user_id
             WHERE hp.user_id = ?'
        );
        $stmt->execute([$userId]);
        return $stmt->fetch() ?: null;
    }

    public function create(int $userId, array $data): bool
    {
        $stmt = $this->db->prepare(
            'INSERT INTO hospital_profiles
             (user_id, hospital_name, contact_email, contact_phone, address, city, state, registration_no)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        return $stmt->execute([
            $userId,
            sanitize($data['hospital_name']  ?? ''),
            sanitize($data['contact_email']  ?? ''),
            sanitize($data['contact_phone']  ?? ''),
            sanitize($data['address']        ?? ''),
            sanitize($data['city']           ?? ''),
            sanitize($data['state']          ?? ''),
            sanitize($data['registration_no'] ?? ''),
        ]);
    }

    public function update(int $userId, array $data): bool
    {
        $allowed = [
            'hospital_name', 'contact_email', 'contact_phone', 'address',
            'city', 'state', 'registration_no', 'bed_count', 'type', 'about', 'website'
        ];

        $sets   = [];
        $params = [];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $sets[]   = "{$field} = ?";
                $params[] = is_string($data[$field]) ? sanitize($data[$field]) : $data[$field];
            }
        }

        if (empty($sets)) {
            return false;
        }

        $params[] = $userId;
        $stmt = $this->db->prepare('UPDATE hospital_profiles SET ' . implode(', ', $sets) . ' WHERE user_id = ?');
        return $stmt->execute($params);
    }

    public function getAll(array $filters = [], int $page = 1, int $perPage = 20): array
    {
        $conditions = ['u.role = "hospital"', 'u.status = "active"'];
        $params     = [];

        if (!empty($filters['city'])) {
            $conditions[] = 'hp.city LIKE ?';
            $params[]     = '%' . $filters['city'] . '%';
        }
        if (!empty($filters['search'])) {
            $conditions[] = '(hp.hospital_name LIKE ? OR hp.city LIKE ?)';
            $like         = '%' . $filters['search'] . '%';
            $params       = array_merge($params, [$like, $like]);
        }

        $where  = implode(' AND ', $conditions);
        $offset = ($page - 1) * $perPage;

        $countStmt = $this->db->prepare(
            "SELECT COUNT(*) FROM hospital_profiles hp JOIN users u ON u.id = hp.user_id WHERE {$where}"
        );
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT hp.*, u.email, u.status
             FROM hospital_profiles hp
             JOIN users u ON u.id = hp.user_id
             WHERE {$where}
             ORDER BY hp.hospital_name ASC
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

    public function getCount(): int
    {
        $stmt = $this->db->query('SELECT COUNT(*) FROM hospital_profiles');
        return (int)$stmt->fetchColumn();
    }
}
