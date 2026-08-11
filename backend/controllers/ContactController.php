<?php
declare(strict_types=1);

require_once __DIR__ . '/../models/ContactSubmission.php';
require_once __DIR__ . '/../middleware/RateLimit.php';

class ContactController
{
    private ContactSubmission $model;

    public function __construct(PDO $db)
    {
        $this->model = new ContactSubmission($db);
    }

    public function submit(): void
    {
        RateLimit::check('contact', 3, 300); // 3 per 5 minutes
        $data = getRequestBody();
        requireField($data, 'name', 'email', 'message');

        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            jsonError('Invalid email address.', 422);
        }
        if (strlen($data['message']) < 10) {
            jsonError('Message is too short.', 422);
        }

        $id = $this->model->create($data);
        jsonResponse(['success' => true, 'id' => $id, 'message' => 'Your message has been received. We will get back to you soon.'], 201);
    }

    public function list(): void
    {
        requireRole('admin');
        $page    = (int)($_GET['page'] ?? 1);
        $perPage = min((int)($_GET['per_page'] ?? 20), 100);
        jsonResponse($this->model->getAll($page, $perPage));
    }
}
