<?php
declare(strict_types=1);

class Job
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function getAll(array $filters = [], int $page = 1, int $perPage = 20): array
    {
        $conditions = ["j.status = 'active'"];
        $params     = [];

        if (!empty($filters['specialization'])) {
            $conditions[] = 'j.specialization LIKE ?';
            $params[]     = '%' . $filters['specialization'] . '%';
        }
        if (!empty($filters['type'])) {
            $conditions[] = 'j.type = ?';
            $params[]     = $filters['type'];
        }
        if (!empty($filters['location'])) {
            $conditions[] = 'j.location LIKE ?';
            $params[]     = '%' . $filters['location'] . '%';
        }
        if (!empty($filters['search'])) {
            $conditions[] = '(j.title LIKE ? OR j.specialization LIKE ? OR hp.hospital_name LIKE ? OR j.location LIKE ?)';
            $like         = '%' . $filters['search'] . '%';
            $params       = array_merge($params, [$like, $like, $like, $like]);
        }
        if (!empty($filters['hospital_id'])) {
            $conditions[] = 'j.hospital_id = ?';
            $params[]     = (int)$filters['hospital_id'];
            unset($conditions[0]); // allow non-active for hospital's own listings
            $conditions   = array_values($conditions);
        }

        $where  = implode(' AND ', $conditions);
        $offset = ($page - 1) * $perPage;

        $countStmt = $this->db->prepare(
            "SELECT COUNT(*) FROM jobs j JOIN hospital_profiles hp ON hp.user_id = j.hospital_id WHERE {$where}"
        );
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT j.*, hp.hospital_name AS hospital, hp.city
             FROM jobs j
             JOIN hospital_profiles hp ON hp.user_id = j.hospital_id
             WHERE {$where}
             ORDER BY j.created_at DESC
             LIMIT {$perPage} OFFSET {$offset}"
        );
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        // Decode JSON fields
        foreach ($rows as &$row) {
            $row['requirements'] = json_decode($row['requirements'] ?? '[]', true) ?? [];
            $row['benefits']     = json_decode($row['benefits']     ?? '[]', true) ?? [];
        }

        return [
            'data'        => $rows,
            'total'       => $total,
            'page'        => $page,
            'per_page'    => $perPage,
            'total_pages' => (int)ceil($total / $perPage),
        ];
    }

    public function getById(int $id): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT j.*, hp.hospital_name AS hospital, hp.city, hp.about AS hospital_about,
                    hp.contact_phone AS hospital_phone, hp.contact_email AS hospital_email
             FROM jobs j
             JOIN hospital_profiles hp ON hp.user_id = j.hospital_id
             WHERE j.id = ?'
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) return null;

        $row['requirements'] = json_decode($row['requirements'] ?? '[]', true) ?? [];
        $row['benefits']     = json_decode($row['benefits']     ?? '[]', true) ?? [];
        return $row;
    }

    public function create(int $hospitalId, array $data): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO jobs
             (hospital_id, title, specialization, type, experience, qualification, salary, location,
              description, requirements, benefits, status, badge_type, badge_label)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $hospitalId,
            sanitize($data['title']          ?? ''),
            sanitize($data['specialization'] ?? ''),
            $data['type']          ?? 'Full-Time',
            sanitize($data['experience']     ?? ''),
            sanitize($data['qualification']  ?? ''),
            sanitize($data['salary']         ?? ''),
            sanitize($data['location']       ?? ''),
            sanitize($data['description']    ?? ''),
            json_encode($data['requirements'] ?? []),
            json_encode($data['benefits']     ?? []),
            $data['status']     ?? 'draft',
            $data['badge_type'] ?? 'badge-new',
            $data['badge_label'] ?? 'New',
        ]);
        return (int)$this->db->lastInsertId();
    }

    public function update(int $id, int $hospitalId, array $data): bool
    {
        $allowed = [
            'title', 'specialization', 'type', 'experience', 'qualification',
            'salary', 'location', 'description', 'status', 'badge_type', 'badge_label'
        ];
        $jsonFields = ['requirements', 'benefits'];

        $sets   = [];
        $params = [];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $sets[]   = "{$field} = ?";
                $params[] = sanitize((string)($data[$field] ?? ''));
            }
        }
        foreach ($jsonFields as $field) {
            if (array_key_exists($field, $data)) {
                $sets[]   = "{$field} = ?";
                $params[] = json_encode($data[$field]);
            }
        }

        if (empty($sets)) return false;

        $params[] = $id;
        $params[] = $hospitalId;
        $stmt = $this->db->prepare(
            'UPDATE jobs SET ' . implode(', ', $sets) . ' WHERE id = ? AND hospital_id = ?'
        );
        return $stmt->execute($params);
    }

    public function delete(int $id, int $hospitalId): bool
    {
        $stmt = $this->db->prepare("UPDATE jobs SET status = 'closed' WHERE id = ? AND hospital_id = ?");
        $stmt->execute([$id, $hospitalId]);
        return $stmt->rowCount() > 0;
    }

    public function getCount(string $status = 'active'): int
    {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM jobs WHERE status = ?");
        $stmt->execute([$status]);
        return (int)$stmt->fetchColumn();
    }
}
