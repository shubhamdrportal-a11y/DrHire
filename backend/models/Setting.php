<?php
declare(strict_types=1);

class Setting
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function get(int $userId, string $key, mixed $default = null): mixed
    {
        $stmt = $this->db->prepare('SELECT `value` FROM user_settings WHERE user_id = ? AND `key` = ?');
        $stmt->execute([$userId, $key]);
        $row = $stmt->fetch();
        return $row ? $row['value'] : $default;
    }

    public function getAll(int $userId): array
    {
        $stmt = $this->db->prepare('SELECT `key`, `value` FROM user_settings WHERE user_id = ?');
        $stmt->execute([$userId]);
        $rows   = $stmt->fetchAll();
        $result = [];
        foreach ($rows as $row) {
            $result[$row['key']] = $row['value'];
        }
        return $result;
    }

    public function set(int $userId, string $key, string $value): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO user_settings (user_id, `key`, `value`) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)'
        );
        $stmt->execute([$userId, $key, $value]);
    }

    public function setMany(int $userId, array $settings): void
    {
        foreach ($settings as $key => $value) {
            $this->set($userId, sanitize($key), sanitize((string)$value));
        }
    }
}
