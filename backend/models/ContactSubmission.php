<?php
declare(strict_types=1);

class ContactSubmission
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO contact_submissions (name, email, phone, role, specialization, message)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            sanitize($data['name']           ?? ''),
            sanitize($data['email']          ?? ''),
            sanitize($data['phone']          ?? ''),
            sanitize($data['role']           ?? ''),
            sanitize($data['specialization'] ?? ''),
            sanitize($data['message']        ?? ''),
        ]);
        return (int)$this->db->lastInsertId();
    }

    public function getAll(int $page = 1, int $perPage = 20): array
    {
        $offset = ($page - 1) * $perPage;

        $total = (int)$this->db->query('SELECT COUNT(*) FROM contact_submissions')->fetchColumn();

        $stmt = $this->db->prepare(
            'SELECT * FROM contact_submissions ORDER BY created_at DESC LIMIT ? OFFSET ?'
        );
        $stmt->execute([$perPage, $offset]);

        return [
            'data'        => $stmt->fetchAll(),
            'total'       => $total,
            'page'        => $page,
            'per_page'    => $perPage,
            'total_pages' => (int)ceil($total / $perPage),
        ];
    }
}
