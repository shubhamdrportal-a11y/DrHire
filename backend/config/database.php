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
        
        // Safe database initialization.
        // IMPORTANT: this used to only check whether the `users` table
        // existed — so on a database that was already initialized before
        // a new table (e.g. `hospital_doctors`) was added to schema.sql,
        // that new table would NEVER get created, and every query that
        // touched it would fail (this was the cause of "Failed to load
        // doctors" / "Failed to load report data" in production).
        // Instead: check EVERY table schema.sql defines, and (re-)run the
        // schema if any are missing. All statements are
        // `CREATE TABLE IF NOT EXISTS`, so this is always safe to run
        // again and never touches existing data.
        static $initialized = false;
        if (!$initialized) {
            $schemaFile = __DIR__ . '/../database/schema.sql';
            if (file_exists($schemaFile)) {
                $sql = file_get_contents($schemaFile);
                preg_match_all('/CREATE TABLE IF NOT EXISTS\s+`?(\w+)`?/i', $sql, $m);
                $requiredTables = array_unique($m[1] ?? []);

                $existing = [];
                foreach ($pdo->query('SHOW TABLES') as $row) {
                    $existing[] = array_values($row)[0];
                }
                $missing = array_diff($requiredTables, $existing);

                if (!empty($missing)) {
                    $pdo->exec('SET FOREIGN_KEY_CHECKS = 0;');
                    $pdo->exec($sql);
                    $pdo->exec('SET FOREIGN_KEY_CHECKS = 1;');
                    error_log('DB schema sync: created missing tables: ' . implode(', ', $missing));
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
