<?php
// router.php
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// 1. Healthcheck Endpoint
if ($uri === '/health') {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'ok']);
    return true;
}

// Temporary Admin Setup Endpoint
if ($uri === '/api/setup-admin') {
    require __DIR__ . '/backend/config/app.php';
    require __DIR__ . '/backend/config/database.php';
    try {
        $db = getDbConnection();
        $sql = file_get_contents(__DIR__ . '/backend/database/seed_admin.sql');
        $db->exec($sql);
        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'message' => 'Admin account seeded successfully! You can now log in.']);
    } catch (\Exception $e) {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    return true;
}

// 2. API Routing
if (preg_match('#^/api/#', $uri)) {
    // Include the backend index.php
    $_SERVER['SCRIPT_NAME'] = '/backend/public/index.php';
    chdir(__DIR__ . '/backend/public');
    require 'index.php';
    return true;
}

// 3. Static Files Routing
$publicPaths = [];

if ($uri === '/' || $uri === '') {
    $publicPaths[] = __DIR__ . '/frontend/index.html';
} else {
    // Direct matches
    $publicPaths[] = __DIR__ . $uri;
    $publicPaths[] = __DIR__ . '/frontend' . $uri;
}

foreach ($publicPaths as $path) {
    if (file_exists($path) && is_file($path)) {
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $mimeTypes = [
            'html' => 'text/html',
            'css'  => 'text/css',
            'js'   => 'application/javascript',
            'png'  => 'image/png',
            'jpg'  => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif'  => 'image/gif',
            'svg'  => 'image/svg+xml',
            'json' => 'application/json',
            'woff' => 'font/woff',
            'woff2'=> 'font/woff2',
            'ttf'  => 'font/ttf',
            'txt'  => 'text/plain',
            'xml'  => 'application/xml',
            'ico'  => 'image/x-icon'
        ];
        if (isset($mimeTypes[$ext])) {
            header('Content-Type: ' . $mimeTypes[$ext]);
        }
        readfile($path);
        return true;
    }
}

// 4. Fallback for 404
http_response_code(404);
echo "404 Not Found";
return true;
