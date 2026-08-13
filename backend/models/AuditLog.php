<?php
declare(strict_types=1);

class AuditLog
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function log(
        ?int $userId,
        string $action,
        string $entityType = '',
        ?int $entityId = null
    ): void {
        $ip        = $this->getIp();
        $userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500);

        $stmt = $this->db->prepare(
            'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$userId, $action, $entityType, $entityId, $ip, $userAgent]);
    }

    public function getDb(): PDO
    {
        return $this->db;
    }

    public function getRecent(int $limit = 50, int $page = 1): array
    {
        $offset = ($page - 1) * $limit;
        $total = (int)$this->db->query('SELECT COUNT(*) FROM audit_logs')->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT al.*, COALESCE(dp.full_name, hp.hospital_name, sp.full_name, u.email, 'System') AS actor_name
             FROM audit_logs al
             LEFT JOIN users u         ON u.id = al.user_id
             LEFT JOIN doctor_profiles dp   ON dp.user_id = al.user_id
             LEFT JOIN hospital_profiles hp ON hp.user_id = al.user_id
             LEFT JOIN staff_profiles sp    ON sp.user_id = al.user_id
             ORDER BY al.created_at DESC
             LIMIT ? OFFSET ?"
        );
        $stmt->execute([$limit, $offset]);

        return [
            'data'        => $stmt->fetchAll(),
            'total'       => $total,
            'page'        => $page,
            'per_page'    => $limit,
            'total_pages' => (int)ceil($total / $limit),
        ];
    }

    private function getIp(): string
    {
        foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'] as $key) {
            if (!empty($_SERVER[$key])) {
                return explode(',', $_SERVER[$key])[0];
            }
        }
        return '0.0.0.0';
    }
}
