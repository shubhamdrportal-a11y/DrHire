<?php
declare(strict_types=1);

class FileRecord
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function create(int $userId, string $category, string $originalFilename, string $storageKey, string $mimeType, int $fileSize): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO files (user_id, category, original_filename, storage_key, mime_type, file_size)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$userId, $category, $originalFilename, $storageKey, $mimeType, $fileSize]);
        return (int)$this->db->lastInsertId();
    }

    public function getById(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM files WHERE id = ?');
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function getByUserAndCategory(int $userId, string $category): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM files WHERE user_id = ? AND category = ? ORDER BY created_at DESC LIMIT 1'
        );
        $stmt->execute([$userId, $category]);
        return $stmt->fetch() ?: null;
    }

    public function getUserFiles(int $userId): array
    {
        $stmt = $this->db->prepare(
            'SELECT id, category, original_filename, mime_type, file_size, created_at
             FROM files WHERE user_id = ? ORDER BY created_at DESC'
        );
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    public function delete(int $id, int $userId): ?string
    {
        $stmt = $this->db->prepare('SELECT storage_key FROM files WHERE id = ? AND user_id = ?');
        $stmt->execute([$id, $userId]);
        $row = $stmt->fetch();
        if (!$row) return null;

        $del = $this->db->prepare('DELETE FROM files WHERE id = ?');
        $del->execute([$id]);
        return $row['storage_key'];
    }
}
