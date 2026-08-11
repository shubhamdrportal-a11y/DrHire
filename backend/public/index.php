<?php
/**
 * public/index.php
 * Entry point for all /api/* requests.
 * All traffic should be routed here via .htaccess or Railway config.
 */

declare(strict_types=1);

// Security: prevent direct access to non-public dirs
define('DRHIRE_APP', true);

// Route all requests through the API router
require_once dirname(__DIR__) . '/routes/api.php';
