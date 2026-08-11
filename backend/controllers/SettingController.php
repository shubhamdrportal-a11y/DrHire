<?php
declare(strict_types=1);

require_once __DIR__ . '/../models/Setting.php';

class SettingController
{
    private Setting $model;

    public function __construct(PDO $db)
    {
        $this->model = new Setting($db);
    }

    public function index(): void
    {
        $user     = requireAuth();
        $settings = $this->model->getAll($user['id']);
        jsonResponse(['data' => $settings]);
    }

    public function update(): void
    {
        $user = requireAuth();
        $data = getRequestBody();

        if (!is_array($data) || empty($data)) {
            jsonError('No settings provided.', 422);
        }

        // Only allow safe keys (alphanumeric + underscore, max 100 chars)
        $filtered = [];
        foreach ($data as $key => $value) {
            if (preg_match('/^[a-zA-Z0-9_]{1,100}$/', (string)$key)) {
                $filtered[$key] = $value;
            }
        }

        $this->model->setMany($user['id'], $filtered);
        jsonResponse(['success' => true, 'message' => 'Settings saved.']);
    }
}
