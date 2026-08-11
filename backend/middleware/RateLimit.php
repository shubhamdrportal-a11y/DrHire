<?php
/**
 * RateLimit.php
 * Simple file-based rate limiter for sensitive endpoints (login, register, password reset).
 */

declare(strict_types=1);

class RateLimit
{
    private static string $storageDir = '';

    public static function init(): void
    {
        self::$storageDir = sys_get_temp_dir() . '/drhire_ratelimit/';
        if (!is_dir(self::$storageDir)) {
            mkdir(self::$storageDir, 0700, true);
        }
    }

    /**
     * Check if the current IP has exceeded the limit.
     * @param string $bucket  Unique name for the rate-limit bucket (e.g. 'login')
     * @param int    $maxHits Maximum allowed attempts
     * @param int    $window  Time window in seconds
     */
    public static function check(string $bucket, int $maxHits = 10, int $window = 60): void
    {
        self::init();

        $ip   = self::getIp();
        $key  = preg_replace('/[^a-zA-Z0-9_-]/', '_', $bucket . '_' . $ip);
        $file = self::$storageDir . $key . '.json';

        $data = ['hits' => 0, 'reset_at' => time() + $window];

        if (file_exists($file)) {
            $raw = @json_decode(file_get_contents($file), true);
            if (is_array($raw)) {
                $data = $raw;
            }
        }

        // Reset window if expired
        if (time() > $data['reset_at']) {
            $data = ['hits' => 0, 'reset_at' => time() + $window];
        }

        $data['hits']++;
        file_put_contents($file, json_encode($data), LOCK_EX);

        if ($data['hits'] > $maxHits) {
            $remaining = $data['reset_at'] - time();
            header("Retry-After: {$remaining}");
            jsonError("Too many requests. Please wait {$remaining} seconds and try again.", 429);
        }
    }

    private static function getIp(): string
    {
        foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'] as $key) {
            if (!empty($_SERVER[$key])) {
                return explode(',', $_SERVER[$key])[0];
            }
        }
        return '0.0.0.0';
    }
}
