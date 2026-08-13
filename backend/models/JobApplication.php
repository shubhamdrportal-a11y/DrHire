<?php
declare(strict_types=1);

class JobApplication
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function apply(int $jobId, int $applicantId, array $data = []): int
    {
        // Check if already applied
        $stmt = $this->db->prepare('SELECT id FROM job_applications WHERE job_id = ? AND applicant_id = ?');
        $stmt->execute([$jobId, $applicantId]);
        if ($stmt->fetch()) {
            jsonError('You have already applied for this job.', 409);
        }

        $stmt = $this->db->prepare(
            'INSERT INTO job_applications (job_id, applicant_id, cover_letter, resume_file_id)
             VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([
            $jobId,
            $applicantId,
            sanitize($data['cover_letter']  ?? ''),
            $data['resume_file_id'] ?? null,
        ]);
        return (int)$this->db->lastInsertId();
    }

    public function updateStatus(int $id, int $hospitalId, string $status): bool
    {
        // Ensure hospital owns the job
        $stmt = $this->db->prepare(
            'UPDATE job_applications ja
             JOIN jobs j ON j.id = ja.job_id
             SET ja.status = ?
             WHERE ja.id = ? AND j.hospital_id = ?'
        );
        $stmt->execute([$status, $id, $hospitalId]);
        return $stmt->rowCount() > 0;
    }

    public function getForApplicant(int $applicantId, int $page = 1, int $perPage = 20): array
    {
        $offset = ($page - 1) * $perPage;

        $countStmt = $this->db->prepare('SELECT COUNT(*) FROM job_applications WHERE applicant_id = ?');
        $countStmt->execute([$applicantId]);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            'SELECT ja.*, j.title AS job_title, j.type AS job_type, j.location,
                    hp.hospital_name AS hospital
             FROM job_applications ja
             JOIN jobs j ON j.id = ja.job_id
             JOIN hospital_profiles hp ON hp.user_id = j.hospital_id
             WHERE ja.applicant_id = ?
             ORDER BY ja.applied_at DESC
             LIMIT ? OFFSET ?'
        );
        $stmt->execute([$applicantId, $perPage, $offset]);

        return [
            'data'        => $stmt->fetchAll(),
            'total'       => $total,
            'page'        => $page,
            'per_page'    => $perPage,
            'total_pages' => (int)ceil($total / $perPage),
        ];
    }

    public function getForJob(int $jobId, int $hospitalId, array $filters = []): array
    {
        $conditions = ['ja.job_id = ?', 'j.hospital_id = ?'];
        $params     = [$jobId, $hospitalId];

        if (!empty($filters['status'])) {
            $conditions[] = 'ja.status = ?';
            $params[]     = $filters['status'];
        }

        $where = implode(' AND ', $conditions);

        $stmt = $this->db->prepare(
            "SELECT ja.*, dp.full_name AS applicant_name, dp.specialization, dp.experience_years,
                    dp.qualification, u.email AS applicant_email
             FROM job_applications ja
             JOIN jobs j ON j.id = ja.job_id
             JOIN users u ON u.id = ja.applicant_id
             LEFT JOIN doctor_profiles dp ON dp.user_id = ja.applicant_id
             WHERE {$where}
             ORDER BY ja.applied_at DESC"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getForHospital(int $hospitalId, array $filters = [], int $page = 1, int $perPage = 20): array
    {
        $conditions = ['j.hospital_id = ?'];
        $params     = [$hospitalId];

        if (!empty($filters['status'])) {
            $conditions[] = 'ja.status = ?';
            $params[]     = $filters['status'];
        }
        if (!empty($filters['search'])) {
            $conditions[] = '(dp.full_name LIKE ? OR u.email LIKE ? OR j.title LIKE ? OR dp.specialization LIKE ?)';
            $like         = '%' . $filters['search'] . '%';
            $params       = array_merge($params, [$like, $like, $like, $like]);
        }
        if (!empty($filters['job_id'])) {
            $conditions[] = 'ja.job_id = ?';
            $params[]     = (int)$filters['job_id'];
        }

        $where  = implode(' AND ', $conditions);
        $offset = ($page - 1) * $perPage;

        $countStmt = $this->db->prepare(
            "SELECT COUNT(*) FROM job_applications ja
             JOIN jobs j ON j.id = ja.job_id
             JOIN users u ON u.id = ja.applicant_id
             LEFT JOIN doctor_profiles dp ON dp.user_id = ja.applicant_id
             WHERE {$where}"
        );
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT ja.*, j.title AS job_title, dp.full_name AS applicant_name,
                    dp.specialization, dp.experience_years, dp.qualification, dp.phone AS applicant_phone,
                    u.email AS applicant_email
             FROM job_applications ja
             JOIN jobs j ON j.id = ja.job_id
             JOIN users u ON u.id = ja.applicant_id
             LEFT JOIN doctor_profiles dp ON dp.user_id = ja.applicant_id
             WHERE {$where}
             ORDER BY ja.applied_at DESC
             LIMIT {$perPage} OFFSET {$offset}"
        );
        $stmt->execute($params);

        return [
            'data'        => $stmt->fetchAll(),
            'total'       => $total,
            'page'        => $page,
            'per_page'    => $perPage,
            'total_pages' => (int)ceil($total / max(1, $perPage)),
        ];
    }

    public function getCount(): int
    {
        $stmt = $this->db->query('SELECT COUNT(*) FROM job_applications');
        return (int)$stmt->fetchColumn();
    }

    public function getCountForApplicant(int $applicantId): array
    {
        $stmt = $this->db->prepare(
            "SELECT
                COUNT(*) AS total,
                SUM(status = 'new')         AS pending,
                SUM(status = 'shortlisted') AS shortlisted,
                SUM(status = 'interview')   AS interviews,
                SUM(status = 'hired')       AS hired,
                SUM(status = 'rejected')    AS rejected
             FROM job_applications WHERE applicant_id = ?"
        );
        $stmt->execute([$applicantId]);
        return $stmt->fetch();
    }
}
