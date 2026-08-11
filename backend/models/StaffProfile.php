<?php
declare(strict_types=1);

class StaffProfile
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function getByUserId(int $userId): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT sp.*, u.email, u.status, u.created_at AS joined_at
             FROM staff_profiles sp
             JOIN users u ON u.id = sp.user_id
             WHERE sp.user_id = ?'
        );
        $stmt->execute([$userId]);
        return $stmt->fetch() ?: null;
    }

    public function create(int $userId, array $data): bool
    {
        $stmt = $this->db->prepare(
            'INSERT INTO staff_profiles (user_id, full_name, phone, organization, address, city, state)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        return $stmt->execute([
            $userId,
            sanitize($data['full_name']    ?? ''),
            sanitize($data['phone']        ?? ''),
            sanitize($data['organization'] ?? ''),
            sanitize($data['address']      ?? ''),
            sanitize($data['city']         ?? ''),
            sanitize($data['state']        ?? ''),
        ]);
    }

    public function update(int $userId, array $data): bool
    {
        $allowed = ['full_name', 'phone', 'organization', 'address', 'city', 'state', 'bio'];

        $sets   = [];
        $params = [];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $sets[]   = "{$field} = ?";
                $params[] = sanitize((string)($data[$field] ?? ''));
            }
        }

        if (empty($sets)) {
            return false;
        }

        $params[] = $userId;
        $stmt = $this->db->prepare('UPDATE staff_profiles SET ' . implode(', ', $sets) . ' WHERE user_id = ?');
        return $stmt->execute($params);
    }
}
