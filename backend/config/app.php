<?php
/**
 * app.php
 * Application-wide configuration: constants, CORS, session setup.
 * Must be required before any output is sent.
 */

declare(strict_types=1);

// ── Load .env file if present (dev convenience) ──────────────────
$envFile = dirname(__DIR__) . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key   = trim($key);
        $value = trim($value, " \t\n\r\0\x0B\"'");
        if (!isset($_ENV[$key]) && getenv($key) === false) {
            $_ENV[$key] = $value;
            putenv("{$key}={$value}");
        }
    }
}

// ── App Constants ─────────────────────────────────────────────────
define('APP_URL',     $_ENV['APP_URL']     ?? getenv('APP_URL')     ?: 'http://localhost');
define('APP_SECRET',  $_ENV['APP_SECRET']  ?? getenv('APP_SECRET')  ?: 'change-me-in-production');
define('APP_VERSION', '1.0.0');

// ── Allowed CORS Origins ─────────────────────────────────────────
$allowedOrigins = array_filter(array_map(
    'trim',
    explode(',', $_ENV['ALLOWED_ORIGINS'] ?? getenv('ALLOWED_ORIGINS') ?: APP_URL)
));

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowedOrigins, true) || in_array('*', $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
} elseif (!empty($allowedOrigins)) {
    header('Access-Control-Allow-Origin: ' . reset($allowedOrigins));
}

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Secure Session Configuration ──────────────────────────────────
$isSecure      = filter_var($_ENV['SESSION_SECURE'] ?? getenv('SESSION_SECURE') ?: 'false', FILTER_VALIDATE_BOOLEAN);
$sameSite      = $_ENV['SESSION_SAMESITE'] ?? getenv('SESSION_SAMESITE') ?: 'Lax';
$lifetime      = (int)($_ENV['SESSION_LIFETIME'] ?? getenv('SESSION_LIFETIME') ?: 86400); // 24h

ini_set('session.cookie_httponly', '1');
ini_set('session.use_strict_mode', '1');
ini_set('session.cookie_samesite', $sameSite);
ini_set('session.gc_maxlifetime', (string)$lifetime);
ini_set('session.cookie_lifetime', (string)$lifetime);

if ($isSecure) {
    ini_set('session.cookie_secure', '1');
}

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_name('drhire_sess');
    session_start();
}

// Regenerate session ID periodically to prevent fixation
if (!isset($_SESSION['_last_regenerated'])) {
    session_regenerate_id(true);
    $_SESSION['_last_regenerated'] = time();
} elseif (time() - $_SESSION['_last_regenerated'] > 1800) { // 30 min
    session_regenerate_id(true);
    $_SESSION['_last_regenerated'] = time();
}

// ── Utility Functions ─────────────────────────────────────────────

function jsonResponse(mixed $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function jsonError(string $message, int $status = 400, array $extra = []): never
{
    $body = array_merge(['success' => false, 'message' => $message], $extra);
    jsonResponse($body, $status);
}

function getRequestBody(): array
{
    $raw = file_get_contents('php://input');
    if (empty($raw)) {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function requireField(array $data, string ...$fields): void
{
    foreach ($fields as $field) {
        if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
            jsonError("Field '{$field}' is required.", 422);
        }
    }
}

function sanitize(string $value): string
{
    return htmlspecialchars(strip_tags(trim($value)), ENT_QUOTES, 'UTF-8');
}

function generateToken(int $bytes = 32): string
{
    return bin2hex(random_bytes($bytes));
}
