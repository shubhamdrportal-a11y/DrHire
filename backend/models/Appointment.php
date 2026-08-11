<?php
declare(strict_types=1);

class Appointment
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function book(int $doctorId, int $patientId, array $data): int
    {
        // Prevent double-booking (unique key handles DB level too)
        $stmt = $this->db->prepare(
            'SELECT id FROM appointments
             WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ?
             AND status NOT IN ("cancelled")'
        );
        $stmt->execute([$doctorId, $data['appointment_date'], $data['appointment_time']]);
        if ($stmt->fetch()) {
            jsonError('This time slot is already booked. Please choose a different time.', 409);
        }

        $stmt = $this->db->prepare(
            'INSERT INTO appointments
             (doctor_id, patient_id, patient_name, patient_phone, patient_address,
              patient_age, patient_gender, reason, notes, appointment_date, appointment_time)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $doctorId,
            $patientId,
            sanitize($data['patient_name']    ?? ''),
            sanitize($data['patient_phone']   ?? ''),
            sanitize($data['patient_address'] ?? ''),
            (int)($data['patient_age']        ?? 0),
            $data['patient_gender']           ?? 'Other',
            sanitize($data['reason']          ?? ''),
            sanitize($data['notes']           ?? ''),
            $data['appointment_date'],
            $data['appointment_time'],
        ]);
        return (int)$this->db->lastInsertId();
    }

    public function updateStatus(int $id, string $status, ?int $ownerId = null, string $ownerRole = 'doctor'): bool
    {
        $params = [$status, $id];

        if ($ownerId !== null) {
            $col = ($ownerRole === 'doctor') ? 'doctor_id' : 'patient_id';
            $sql = "UPDATE appointments SET status = ? WHERE id = ? AND {$col} = ?";
            $params[] = $ownerId;
        } else {
            $sql = 'UPDATE appointments SET status = ? WHERE id = ?';
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount() > 0;
    }

    public function getForDoctor(int $doctorId, array $filters = [], int $page = 1, int $perPage = 20): array
    {
        $conditions = ['a.doctor_id = ?'];
        $params     = [$doctorId];

        if (!empty($filters['status'])) {
            $conditions[] = 'a.status = ?';
            $params[]     = $filters['status'];
        }
        if (!empty($filters['date'])) {
            if ($filters['date'] === 'today') {
                $conditions[] = 'a.appointment_date = CURDATE()';
            } else {
                $conditions[] = 'a.appointment_date = ?';
                $params[]     = $filters['date'];
            }
        }

        return $this->paginate($conditions, $params, $page, $perPage, 'doctor');
    }

    public function getForPatient(int $patientId, array $filters = [], int $page = 1, int $perPage = 20): array
    {
        $conditions = ['a.patient_id = ?'];
        $params     = [$patientId];

        if (!empty($filters['status'])) {
            $conditions[] = 'a.status = ?';
            $params[]     = $filters['status'];
        }

        return $this->paginate($conditions, $params, $page, $perPage, 'patient');
    }

    public function getAll(array $filters = [], int $page = 1, int $perPage = 20): array
    {
        $conditions = ['1=1'];
        $params     = [];

        if (!empty($filters['status'])) {
            $conditions[] = 'a.status = ?';
            $params[]     = $filters['status'];
        }
        if (!empty($filters['doctor_id'])) {
            $conditions[] = 'a.doctor_id = ?';
            $params[]     = (int)$filters['doctor_id'];
        }

        return $this->paginate($conditions, $params, $page, $perPage, 'admin');
    }

    private function paginate(array $conditions, array $params, int $page, int $perPage, string $view): array
    {
        $where  = implode(' AND ', $conditions);
        $offset = ($page - 1) * $perPage;

        $countSql = "SELECT COUNT(*) FROM appointments a WHERE {$where}";
        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $selectSql = "SELECT a.*,
                dp.full_name AS doctor_name, dp.specialization AS doctor_spec
             FROM appointments a
             LEFT JOIN doctor_profiles dp ON dp.user_id = a.doctor_id
             WHERE {$where}
             ORDER BY a.appointment_date ASC, a.appointment_time ASC
             LIMIT {$perPage} OFFSET {$offset}";

        $stmt = $this->db->prepare($selectSql);
        $stmt->execute($params);

        return [
            'data'        => $stmt->fetchAll(),
            'total'       => $total,
            'page'        => $page,
            'per_page'    => $perPage,
            'total_pages' => (int)ceil($total / $perPage),
        ];
    }

    public function getById(int $id): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT a.*, dp.full_name AS doctor_name, dp.specialization AS doctor_spec
             FROM appointments a
             LEFT JOIN doctor_profiles dp ON dp.user_id = a.doctor_id
             WHERE a.id = ?'
        );
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function getStatsForDoctor(int $doctorId): array
    {
        $stmt = $this->db->prepare(
            "SELECT
                COUNT(*) AS total,
                SUM(appointment_date = CURDATE()) AS today,
                SUM(appointment_date > CURDATE() AND status NOT IN ('cancelled')) AS upcoming,
                SUM(status = 'completed') AS completed,
                SUM(status = 'cancelled') AS cancelled,
                SUM(status = 'pending')   AS pending,
                SUM(status = 'confirmed') AS confirmed,
                COUNT(DISTINCT patient_id) AS unique_patients
             FROM appointments WHERE doctor_id = ?"
        );
        $stmt->execute([$doctorId]);
        return $stmt->fetch();
    }

    public function getCount(): int
    {
        $stmt = $this->db->query('SELECT COUNT(*) FROM appointments');
        return (int)$stmt->fetchColumn();
    }

    public function getStatsForPatient(int $patientId): array
    {
        $stmt = $this->db->prepare(
            "SELECT
                COUNT(*) AS total,
                SUM(status = 'pending')   AS pending,
                SUM(status = 'confirmed') AS confirmed,
                SUM(status = 'completed') AS completed,
                SUM(status = 'cancelled') AS cancelled
             FROM appointments WHERE patient_id = ?"
        );
        $stmt->execute([$patientId]);
        return $stmt->fetch();
    }
}
