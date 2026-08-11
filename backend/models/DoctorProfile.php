<?php
declare(strict_types=1);

class DoctorProfile
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function getByUserId(int $userId): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT dp.*, u.email, u.status, u.created_at AS joined_at
             FROM doctor_profiles dp
             JOIN users u ON u.id = dp.user_id
             WHERE dp.user_id = ?'
        );
        $stmt->execute([$userId]);
        return $stmt->fetch() ?: null;
    }

    public function create(int $userId, array $data): bool
    {
        $stmt = $this->db->prepare(
            'INSERT INTO doctor_profiles
             (user_id, full_name, phone, specialization, qualification, experience_years, license_no, clinic_address, city, state)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        return $stmt->execute([
            $userId,
            sanitize($data['full_name'] ?? ''),
            sanitize($data['phone']     ?? ''),
            sanitize($data['specialization'] ?? ''),
            sanitize($data['qualification']  ?? ''),
            (int)($data['experience_years']  ?? 0),
            sanitize($data['license_no']     ?? ''),
            sanitize($data['clinic_address'] ?? ''),
            sanitize($data['city']  ?? ''),
            sanitize($data['state'] ?? ''),
        ]);
    }

    public function update(int $userId, array $data): bool
    {
        $allowed = [
            'full_name', 'phone', 'specialization', 'qualification',
            'experience_years', 'license_no', 'clinic_address',
            'city', 'state', 'bio', 'is_available'
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
        $sql = 'UPDATE doctor_profiles SET ' . implode(', ', $sets) . ' WHERE user_id = ?';
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function getAll(array $filters = [], int $page = 1, int $perPage = 20): array
    {
        $conditions = ['u.role = "doctor"', 'u.status = "active"'];
        $params     = [];

        if (!empty($filters['specialization'])) {
            $conditions[] = 'dp.specialization LIKE ?';
            $params[]     = '%' . $filters['specialization'] . '%';
        }
        if (!empty($filters['city'])) {
            $conditions[] = 'dp.city LIKE ?';
            $params[]     = '%' . $filters['city'] . '%';
        }
        if (!empty($filters['search'])) {
            $conditions[] = '(dp.full_name LIKE ? OR dp.specialization LIKE ? OR dp.city LIKE ?)';
            $like         = '%' . $filters['search'] . '%';
            $params       = array_merge($params, [$like, $like, $like]);
        }
        if (isset($filters['is_available'])) {
            $conditions[] = 'dp.is_available = ?';
            $params[]     = (int)$filters['is_available'];
        }

        $where  = implode(' AND ', $conditions);
        $offset = ($page - 1) * $perPage;

        $countStmt = $this->db->prepare(
            "SELECT COUNT(*) FROM doctor_profiles dp JOIN users u ON u.id = dp.user_id WHERE {$where}"
        );
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT dp.*, u.email, u.status
             FROM doctor_profiles dp
             JOIN users u ON u.id = dp.user_id
             WHERE {$where}
             ORDER BY dp.rating DESC, dp.full_name ASC
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
        $stmt = $this->db->query('SELECT COUNT(*) FROM doctor_profiles');
        return (int)$stmt->fetchColumn();
    }
}
