<?php
declare(strict_types=1);

require_once __DIR__ . '/../models/Notification.php';

class NotificationController
{
    private Notification $model;

    public function __construct(PDO $db)
    {
        $this->model = new Notification($db);
    }

    public function index(): void
    {
        $user  = requireAuth();
        $unreadOnly = isset($_GET['unread']);
        $notifs = $this->model->getForUser($user['id'], $unreadOnly);
        $unread = $this->model->getUnreadCount($user['id']);
        jsonResponse(['data' => $notifs, 'unread_count' => $unread]);
    }

    public function markRead(): void
    {
        $user = requireAuth();
        $data = getRequestBody();
        $id   = isset($data['id']) ? (int)$data['id'] : null;
        $this->model->markRead($user['id'], $id);
        jsonResponse(['success' => true]);
    }
}
