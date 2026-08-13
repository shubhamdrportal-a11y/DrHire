<?php
declare(strict_types=1);

require_once __DIR__ . '/../models/File.php';
require_once __DIR__ . '/../services/StorageService.php';
require_once __DIR__ . '/../models/AuditLog.php';

class FileController
{
    private PDO             $db;
    private FileRecord      $fileModel;
    private StorageService  $storage;
    private AuditLog        $auditLog;

    private const ALLOWED_CATEGORIES  = ['profile_photo', 'resume', 'hospital_logo', 'document'];
    private const MAX_SIZE_BYTES       = 10 * 1024 * 1024; // 10 MB
    private const ALLOWED_MIME_PHOTO   = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    private const ALLOWED_MIME_DOC     = ['application/pdf', 'application/msword',
                                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    public function __construct(PDO $db)
    {
        $this->db        = $db;
        $this->fileModel = new FileRecord($db);
        $this->storage   = new StorageService();
        $this->auditLog  = new AuditLog($db);
    }

    public function upload(): void
    {
        $user     = requireAuth();
        $category = $_POST['category'] ?? '';

        if (!in_array($category, self::ALLOWED_CATEGORIES, true)) {
            jsonError('Invalid file category.', 422);
        }

        if (empty($_FILES['file'])) {
            jsonError('No file uploaded.', 422);
        }

        $file = $_FILES['file'];

        // Check upload error
        if ($file['error'] !== UPLOAD_ERR_OK) {
            jsonError('File upload error: ' . $this->uploadErrorMessage($file['error']), 422);
        }

        // Validate size
        if ($file['size'] > self::MAX_SIZE_BYTES) {
            jsonError('File size exceeds the maximum of 10 MB.', 413);
        }

        // Detect real MIME type (don't trust $_FILES['type'])
        $finfo    = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);

        $this->validateMime($category, $mimeType);

        // Generate storage key
        $ext        = pathinfo($file['name'], PATHINFO_EXTENSION);
        $storageKey = $category . '/' . $user['id'] . '/' . generateToken(16) . '.' . strtolower($ext);

        $this->storage->upload($file['tmp_name'], $storageKey, $mimeType);

        $fileId = $this->fileModel->create(
            $user['id'],
            $category,
            $file['name'],
            $storageKey,
            $mimeType,
            $file['size']
        );

        $this->auditLog->log($user['id'], 'file_uploaded', 'file', $fileId);

        jsonResponse([
            'success'    => true,
            'file_id'    => $fileId,
            'storage_key' => $storageKey,
            'message'    => 'File uploaded successfully.',
        ], 201);
    }

    public function download(int $fileId): void
    {
        $user    = requireAuth();
        $record  = $this->fileModel->getById($fileId);

        if (!$record) {
            jsonError('File not found.', 404);
        }

        // Only allow access to: the file's owner, an admin, or a hospital/staff
        // reviewing a resume attached to an application on one of their jobs.
        $authorized = ($record['user_id'] === $user['id']) || ($user['role'] === 'admin');

        if (!$authorized && $record['category'] === 'resume' && $user['role'] === 'hospital') {
            $stmt = $this->db->prepare(
                "SELECT 1 FROM job_applications ja JOIN jobs j ON j.id = ja.job_id
                 WHERE ja.resume_file_id = ? AND j.hospital_id = ? LIMIT 1"
            );
            $stmt->execute([$fileId, $user['id']]);
            $authorized = (bool)$stmt->fetchColumn();
        }

        if (!$authorized) {
            jsonError('Unauthorized.', 403);
        }

        if ($this->storage->isConfigured()) {
            $url = $this->storage->getSignedUrl($record['storage_key'], 3600);
            // Redirect to signed URL
            header('Content-Type: application/json');
            jsonResponse(['url' => $url]);
        } else {
            // Local dev: serve file directly
            $this->storage->serveLocal($record['storage_key']);
        }
    }

    public function myFiles(): void
    {
        $user  = requireAuth();
        $files = $this->fileModel->getUserFiles($user['id']);
        jsonResponse(['data' => $files]);
    }

    private function validateMime(string $category, string $mimeType): void
    {
        $photoCategories = ['profile_photo', 'hospital_logo'];
        $docCategories   = ['resume', 'document'];

        if (in_array($category, $photoCategories, true)) {
            if (!in_array($mimeType, self::ALLOWED_MIME_PHOTO, true)) {
                jsonError('Only JPEG, PNG, or WebP images are allowed for ' . $category . '.', 415);
            }
        } elseif (in_array($category, $docCategories, true)) {
            $allowed = array_merge(self::ALLOWED_MIME_PHOTO, self::ALLOWED_MIME_DOC);
            if (!in_array($mimeType, $allowed, true)) {
                jsonError('Only PDF, Word documents, or image files are allowed for ' . $category . '.', 415);
            }
        }
    }

    private function uploadErrorMessage(int $code): string
    {
        return match ($code) {
            UPLOAD_ERR_INI_SIZE,
            UPLOAD_ERR_FORM_SIZE => 'File exceeds the maximum allowed size.',
            UPLOAD_ERR_PARTIAL   => 'File was only partially uploaded.',
            UPLOAD_ERR_NO_FILE   => 'No file was uploaded.',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder.',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk.',
            default              => "Unknown upload error (code {$code}).",
        };
    }
}
