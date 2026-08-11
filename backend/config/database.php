<?php
/**
 * database.php
 * PDO database connection via environment variables.
 * Never hardcode credentials here.
 */

declare(strict_types=1);

function getDbConnection(): PDO
{
    static $pdo = null;

    if ($pdo !== null) {
        return $pdo;
    }

    $host   = $_ENV['DB_HOST']   ?? getenv('DB_HOST')   ?: '127.0.0.1';
    $port   = $_ENV['DB_PORT']   ?? getenv('DB_PORT')   ?: '3306';
    $name   = $_ENV['DB_NAME']   ?? getenv('DB_NAME')   ?: 'drhire';
    $user   = $_ENV['DB_USER']   ?? getenv('DB_USER')   ?: 'root';
    $pass   = $_ENV['DB_PASS']   ?? getenv('DB_PASS')   ?: '';

    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
    ];

    try {
        $pdo = new PDO($dsn, $user, $pass, $options);
    } catch (PDOException $e) {
        // Do NOT expose the real error to the client
        error_log('DB connection failed: ' . $e->getMessage());
        http_response_code(503);
        echo json_encode(['error' => 'Database unavailable. Please try again later.']);
        exit;
    }

    return $pdo;
}
