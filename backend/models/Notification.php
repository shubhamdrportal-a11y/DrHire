<?php
declare(strict_types=1);

class Notification
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function create(int $userId, string $title, string $message, string $type = 'info'): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([$userId, $title, $message, $type]);
        return (int)$this->db->lastInsertId();
    }

    public function getForUser(int $userId, bool $unreadOnly = false, int $limit = 30): array
    {
        $where = 'user_id = ?';
        $params = [$userId];

        if ($unreadOnly) {
            $where .= ' AND is_read = 0';
        }

        $stmt = $this->db->prepare(
            "SELECT * FROM notifications WHERE {$where} ORDER BY created_at DESC LIMIT {$limit}"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function markRead(int $userId, ?int $notifId = null): void
    {
        if ($notifId !== null) {
            $stmt = $this->db->prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?');
            $stmt->execute([$notifId, $userId]);
        } else {
            $stmt = $this->db->prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?');
            $stmt->execute([$userId]);
        }
    }

    public function getUnreadCount(int $userId): int
    {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0');
        $stmt->execute([$userId]);
        return (int)$stmt->fetchColumn();
    }
}
