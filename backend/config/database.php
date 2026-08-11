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

    $host   = $_ENV['MYSQLHOST'] ?? getenv('MYSQLHOST') ?: ($_ENV['DB_HOST'] ?? getenv('DB_HOST') ?: '127.0.0.1');
    $port   = $_ENV['MYSQLPORT'] ?? getenv('MYSQLPORT') ?: ($_ENV['DB_PORT'] ?? getenv('DB_PORT') ?: '3306');
    $name   = $_ENV['MYSQLDATABASE'] ?? getenv('MYSQLDATABASE') ?: ($_ENV['DB_NAME'] ?? getenv('DB_NAME') ?: 'drhire');
    $user   = $_ENV['MYSQLUSER'] ?? getenv('MYSQLUSER') ?: ($_ENV['DB_USER'] ?? getenv('DB_USER') ?: 'root');
    $pass   = $_ENV['MYSQLPASSWORD'] ?? getenv('MYSQLPASSWORD') ?: ($_ENV['DB_PASS'] ?? getenv('DB_PASS') ?: '');

    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        1002 /* PDO::MYSQL_ATTR_INIT_COMMAND */ => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
    ];

    try {
        $pdo = new PDO($dsn, $user, $pass, $options);
        
        // Safe database initialization
        static $initialized = false;
        if (!$initialized) {
            $schemaFile = __DIR__ . '/../database/schema.sql';
            if (file_exists($schemaFile)) {
                // Check if users table exists before running the whole schema
                $stmt = $pdo->query("SHOW TABLES LIKE 'users'");
                if ($stmt->rowCount() === 0) {
                    $sql = file_get_contents($schemaFile);
                    // Disable foreign key checks before executing batch
                    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
                    $pdo->exec($sql);
                    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
                }
            }
            $initialized = true;
        }

    } catch (PDOException $e) {
        // Do NOT expose the real error to the client
        error_log('DB connection failed: ' . $e->getMessage());
        http_response_code(503);
        echo json_encode(['success' => false, 'message' => 'Database unavailable. Please try again later.']);
        exit;
    }

    return $pdo;
}
