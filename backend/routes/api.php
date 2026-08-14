<?php
/**
 * api.php – Central API Router
 * Maps HTTP method + path pattern → controller method.
 *
 * All paths are relative to /api/
 * URL params (e.g. :id) are extracted and passed as arguments.
 */

declare(strict_types=1);

// ── Autoload all files needed ─────────────────────────────────────
$baseDir = dirname(__DIR__);

require_once $baseDir . '/config/app.php';
require_once $baseDir . '/config/database.php';
require_once $baseDir . '/middleware/AuthMiddleware.php';
require_once $baseDir . '/middleware/RateLimit.php';

// Controllers (lazy: loaded on match)
function loadController(string $name): void
{
    $path = dirname(__DIR__) . "/controllers/{$name}.php";
    if (file_exists($path)) require_once $path;
}

// ── Parse request ─────────────────────────────────────────────────
$method     = $_SERVER['REQUEST_METHOD'];
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Strip /api prefix
$base       = '/api';
$path       = str_starts_with($requestUri, $base)
              ? substr($requestUri, strlen($base))
              : $requestUri;
$path       = '/' . trim($path, '/');
$segments   = array_values(array_filter(explode('/', $path)));

// ── Route definitions ─────────────────────────────────────────────
// Format: [METHOD, pattern, controller, method, requiresId?]
// Pattern supports :id placeholder.

$routes = [
    // ── Auth ──────────────────────────────────────────────────────
    ['POST',   '/auth/register',         'AuthController',         'register'],
    ['POST',   '/auth/login',            'AuthController',         'login'],
    ['POST',   '/auth/logout',           'AuthController',         'logout'],
    ['GET',    '/auth/me',               'AuthController',         'me'],
    ['POST',   '/auth/change-password',  'AuthController',         'changePassword'],
    ['GET',    '/auth/login-history',    'AuthController',         'loginHistory'],
    ['DELETE', '/auth/account',          'AuthController',         'deleteAccount'],

    // ── Admin ─────────────────────────────────────────────────────
    ['GET',    '/admin/stats',           'AdminController',        'stats'],
    ['GET',    '/admin/users',           'AdminController',        'users'],
    ['PATCH',  '/admin/users/:id/status','AdminController',        'updateUserStatus', 'id'],
    ['GET',    '/admin/doctors',         'AdminController',        'doctors'],
    ['GET',    '/admin/hospitals',       'AdminController',        'hospitals'],
    ['GET',    '/admin/jobs',            'AdminController',        'jobs'],
    ['GET',    '/admin/appointments',    'AdminController',        'appointments'],
    ['GET',    '/admin/reports',         'AdminController',        'reports'],
    ['GET',    '/admin/audit-logs',      'AdminController',        'auditLogs'],
    ['GET',    '/admin/contact',         'ContactController',      'list'],

    // ── Doctor ────────────────────────────────────────────────────
    ['GET',    '/doctor/profile',        'DoctorController',       'getProfile'],
    ['PUT',    '/doctor/profile',        'DoctorController',       'updateProfile'],
    ['GET',    '/doctor/stats',          'DoctorController',       'stats'],
    ['GET',    '/doctor/availability',   'DoctorController',       'getAvailability'],
    ['PUT',    '/doctor/availability',   'DoctorController',       'updateAvailability'],
    ['GET',    '/doctor/appointments',   'DoctorController',       'getAppointments'],
    ['PATCH',  '/doctor/appointments/:id/status', 'DoctorController', 'updateAppointmentStatus', 'id'],
    ['GET',    '/doctor/jobs',           'DoctorController',       'browseJobs'],
    ['POST',   '/doctor/jobs/:id/apply', 'DoctorController',       'applyForJob', 'id'],
    ['GET',    '/doctor/applications',   'DoctorController',       'getApplications'],
    ['GET',    '/doctor/patients',       'DoctorController',       'getPatients'],
    ['GET',    '/doctor/reports',        'DoctorController',       'reports'],

    // ── Hospital ──────────────────────────────────────────────────
    ['GET',    '/hospital/profile',      'HospitalController',     'getProfile'],
    ['PUT',    '/hospital/profile',      'HospitalController',     'updateProfile'],
    ['GET',    '/hospital/stats',        'HospitalController',     'stats'],
    ['GET',    '/hospital/jobs',         'HospitalController',     'listJobs'],
    ['POST',   '/hospital/jobs',         'HospitalController',     'createJob'],
    ['GET',    '/hospital/jobs/:id',     'HospitalController',     'getJob', 'id'],
    ['PUT',    '/hospital/jobs/:id',     'HospitalController',     'updateJob', 'id'],
    ['DELETE', '/hospital/jobs/:id',     'HospitalController',     'deleteJob', 'id'],
    ['GET',    '/hospital/jobs/:id/applications', 'HospitalController', 'getJobApplications', 'id'],
    ['GET',    '/hospital/applications', 'HospitalController',     'getAllApplications'],
    ['PATCH',  '/hospital/applications/:id/status', 'HospitalController', 'updateApplicationStatus', 'id'],
    ['GET',    '/hospital/appointments', 'HospitalController',     'getAppointments'],
    ['GET',    '/hospital/doctors',      'HospitalController',     'listDoctors'],
    ['POST',   '/hospital/doctors',      'HospitalController',     'addDoctor'],
    ['DELETE', '/hospital/doctors/:id',  'HospitalController',     'removeDoctor', 'id'],
    ['GET',    '/hospital/reports',      'HospitalController',     'reports'],

    // ── Staff ─────────────────────────────────────────────────────
    ['GET',    '/staff/profile',         'StaffController',        'getProfile'],
    ['PUT',    '/staff/profile',         'StaffController',        'updateProfile'],
    ['GET',    '/staff/stats',           'StaffController',        'stats'],
    ['GET',    '/staff/doctors',         'StaffController',        'findDoctors'],
    ['GET',    '/staff/doctors/:id/availability', 'StaffController', 'getDoctorAvailability', 'id'],
    ['POST',   '/staff/appointments',    'StaffController',        'bookAppointment'],
    ['GET',    '/staff/appointments',    'StaffController',        'getAppointments'],
    ['DELETE', '/staff/appointments/:id','StaffController',        'cancelAppointment', 'id'],
    ['GET',    '/staff/applications',    'StaffController',        'getApplications'],
    ['GET',    '/staff/jobs',            'StaffController',        'browseJobs'],
    ['POST',   '/staff/jobs/:id/apply',  'StaffController',        'applyForJob', 'id'],

    // ── Shared / Public ───────────────────────────────────────────
    ['GET',    '/jobs',                  null,                     'publicJobs'],
    ['GET',    '/jobs/:id',              null,                     'publicJobDetail', 'id'],
    ['GET',    '/doctors',              null,                     'publicDoctors'],
    ['POST',   '/contact',              'ContactController',      'submit'],
    ['POST',   '/files/upload',          'FileController',         'upload'],
    ['GET',    '/files/:id/download',    'FileController',         'download', 'id'],
    ['GET',    '/files',                 'FileController',         'myFiles'],
    ['GET',    '/notifications',         'NotificationController', 'index'],
    ['PATCH',  '/notifications/read',    'NotificationController', 'markRead'],
    ['GET',    '/settings',              'SettingController',      'index'],
    ['PUT',    '/settings',              'SettingController',      'update'],
];

// ── Match route ───────────────────────────────────────────────────
$matched = false;
foreach ($routes as $route) {
    [$routeMethod, $routePattern, $controllerName, $actionName] = $route;
    $idParam   = $route[4] ?? null;

    if ($method !== $routeMethod) continue;

    // Convert pattern :id to regex
    $regex = preg_replace('/:([a-zA-Z_]+)/', '([0-9]+)', $routePattern);
    $regex = '#^' . $regex . '$#';

    if (!preg_match($regex, $path, $matches)) continue;

    $matched = true;
    $id      = isset($matches[1]) ? (int)$matches[1] : null;
    $db      = getDbConnection();

    // Inline public endpoints (no controller)
    if ($controllerName === null) {
        handlePublicRoute($actionName, $id, $db);
        exit;
    }

    loadController($controllerName);
    $controller = new $controllerName($db);

    if ($id !== null) {
        $controller->{$actionName}($id);
    } else {
        $controller->{$actionName}();
    }
    exit;
}

if (!$matched) {
    jsonError('Endpoint not found.', 404);
}

// ── Inline public handlers ────────────────────────────────────────
function handlePublicRoute(string $action, ?int $id, PDO $db): void
{
    loadController('DoctorProfile'); // models used directly
    require_once dirname(__DIR__) . '/models/Job.php';
    require_once dirname(__DIR__) . '/models/DoctorProfile.php';

    match ($action) {
        'publicJobs' => (function () use ($db) {
            $model   = new Job($db);
            $page    = (int)($_GET['page'] ?? 1);
            $filters = [
                'specialization' => $_GET['specialization'] ?? '',
                'location'       => $_GET['location']       ?? '',
                'type'           => $_GET['type']           ?? '',
                'search'         => $_GET['search']         ?? '',
            ];
            jsonResponse($model->getAll($filters, $page, 12));
        })(),

        'publicJobDetail' => (function () use ($db, $id) {
            if (!$id) jsonError('Job ID required.', 422);
            $model = new Job($db);
            $job   = $model->getById($id);
            if (!$job) jsonError('Job not found.', 404);
            jsonResponse($job);
        })(),

        'publicDoctors' => (function () use ($db) {
            $model   = new DoctorProfile($db);
            $page    = (int)($_GET['page'] ?? 1);
            $filters = [
                'specialization' => $_GET['specialization'] ?? '',
                'city'           => $_GET['city']           ?? '',
                'search'         => $_GET['search']         ?? '',
            ];
            jsonResponse($model->getAll($filters, $page, 12));
        })(),

        default => jsonError('Unknown public route.', 404),
    };
}
