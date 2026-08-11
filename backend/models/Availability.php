<?php
declare(strict_types=1);

class Availability
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function getForDoctor(int $doctorId): array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM doctor_availability WHERE doctor_id = ? ORDER BY day_of_week, start_time'
        );
        $stmt->execute([$doctorId]);
        return $stmt->fetchAll();
    }

    public function setSlots(int $doctorId, array $slots): void
    {
        // Replace all slots for this doctor
        $delete = $this->db->prepare('DELETE FROM doctor_availability WHERE doctor_id = ?');
        $delete->execute([$doctorId]);

        if (empty($slots)) return;

        $insert = $this->db->prepare(
            'INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, is_active)
             VALUES (?, ?, ?, ?, ?)'
        );

        foreach ($slots as $slot) {
            $insert->execute([
                $doctorId,
                (int)($slot['day_of_week'] ?? 0),
                $slot['start_time'] ?? '09:00',
                $slot['end_time']   ?? '17:00',
                isset($slot['is_active']) ? (int)$slot['is_active'] : 1,
            ]);
        }
    }

    public function isAvailable(int $doctorId, string $date, string $time): bool
    {
        $dayOfWeek = (int)date('w', strtotime($date)); // 0=Sunday

        $stmt = $this->db->prepare(
            'SELECT id FROM doctor_availability
             WHERE doctor_id = ? AND day_of_week = ? AND start_time <= ? AND end_time >= ? AND is_active = 1'
        );
        $stmt->execute([$doctorId, $dayOfWeek, $time, $time]);
        return (bool)$stmt->fetch();
    }
}
