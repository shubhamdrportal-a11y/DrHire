<?php
declare(strict_types=1);

/**
 * StorageService.php
 * Handles file uploads to S3-compatible storage (Railway Bucket, AWS S3, MinIO, etc.)
 * Uses the AWS SDK via Composer OR a lightweight Guzzle-free approach.
 *
 * Environment variables required:
 *   S3_ENDPOINT  – e.g. https://your-bucket.railway.internal or https://s3.amazonaws.com
 *   S3_BUCKET    – bucket name
 *   S3_KEY       – access key ID
 *   S3_SECRET    – secret access key
 *   S3_REGION    – e.g. us-east-1
 */

class StorageService
{
    private string $endpoint;
    private string $bucket;
    private string $key;
    private string $secret;
    private string $region;

    public function __construct()
    {
        $this->endpoint = rtrim($_ENV['S3_ENDPOINT'] ?? getenv('S3_ENDPOINT') ?: '', '/');
        $this->bucket   = $_ENV['S3_BUCKET']   ?? getenv('S3_BUCKET')   ?: '';
        $this->key      = $_ENV['S3_KEY']       ?? getenv('S3_KEY')      ?: '';
        $this->secret   = $_ENV['S3_SECRET']    ?? getenv('S3_SECRET')   ?: '';
        $this->region   = $_ENV['S3_REGION']    ?? getenv('S3_REGION')   ?: 'us-east-1';
    }

    public function isConfigured(): bool
    {
        return !empty($this->endpoint) && !empty($this->bucket) && !empty($this->key) && !empty($this->secret);
    }

    /**
     * Upload a file and return the storage key.
     */
    public function upload(string $localPath, string $storageKey, string $mimeType): string
    {
        if (!$this->isConfigured()) {
            // Dev fallback: store locally in backend/storage/
            return $this->localUpload($localPath, $storageKey, $mimeType);
        }

        return $this->s3Upload($localPath, $storageKey, $mimeType);
    }

    /**
     * Generate a pre-signed URL valid for a limited time (private files).
     */
    public function getSignedUrl(string $storageKey, int $expiresIn = 3600): string
    {
        if (!$this->isConfigured()) {
            return '/api/files/local/' . urlencode($storageKey);
        }

        return $this->s3SignedUrl($storageKey, $expiresIn);
    }

    /**
     * Delete an object from storage.
     */
    public function delete(string $storageKey): void
    {
        if (!$this->isConfigured()) {
            $localPath = $this->localPath($storageKey);
            if (file_exists($localPath)) {
                unlink($localPath);
            }
            return;
        }

        $this->s3Delete($storageKey);
    }

    // ── S3 Helpers (AWS Signature V4) ────────────────────────────

    private function s3Upload(string $localPath, string $storageKey, string $mimeType): string
    {
        $content  = file_get_contents($localPath);
        $datetime = gmdate('Ymd\THis\Z');
        $date     = gmdate('Ymd');
        $hash     = hash('sha256', $content);
        $url      = "{$this->endpoint}/{$this->bucket}/{$storageKey}";

        $headers = [
            'Content-Type'        => $mimeType,
            'Host'                => parse_url($this->endpoint, PHP_URL_HOST),
            'x-amz-content-sha256' => $hash,
            'x-amz-date'         => $datetime,
        ];

        $sig = $this->signRequest('PUT', "/{$this->bucket}/{$storageKey}", '', $headers, $hash, $datetime, $date);

        $curlHeaders = array_map(fn($k, $v) => "{$k}: {$v}", array_keys($headers), $headers);
        $curlHeaders[] = "Authorization: {$sig}";

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_PUT            => true,
            CURLOPT_INFILESIZE     => strlen($content),
            CURLOPT_INFILE         => fopen($localPath, 'r'),
            CURLOPT_HTTPHEADER     => $curlHeaders,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 60,
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode < 200 || $httpCode >= 300) {
            error_log("S3 upload failed ({$httpCode}): {$response}");
            jsonError('File upload to storage failed.', 500);
        }

        return $storageKey;
    }

    private function s3SignedUrl(string $storageKey, int $expiresIn): string
    {
        $datetime = gmdate('Ymd\THis\Z');
        $date     = gmdate('Ymd');
        $host     = parse_url($this->endpoint, PHP_URL_HOST);
        $path     = "/{$this->bucket}/{$storageKey}";

        $credentialScope = "{$date}/{$this->region}/s3/aws4_request";
        $credential      = "{$this->key}/{$credentialScope}";

        $queryParams = [
            'X-Amz-Algorithm'  => 'AWS4-HMAC-SHA256',
            'X-Amz-Credential' => $credential,
            'X-Amz-Date'       => $datetime,
            'X-Amz-Expires'    => (string)$expiresIn,
            'X-Amz-SignedHeaders' => 'host',
        ];
        ksort($queryParams);
        $queryString = http_build_query($queryParams);

        $canonicalRequest = "GET\n{$path}\n{$queryString}\nhost:{$host}\n\nhost\nUNSIGNED-PAYLOAD";
        $stringToSign     = "AWS4-HMAC-SHA256\n{$datetime}\n{$credentialScope}\n" . hash('sha256', $canonicalRequest);

        $signingKey = $this->getSigningKey($date);
        $signature  = hash_hmac('sha256', $stringToSign, $signingKey);

        return "{$this->endpoint}{$path}?{$queryString}&X-Amz-Signature={$signature}";
    }

    private function s3Delete(string $storageKey): void
    {
        $datetime = gmdate('Ymd\THis\Z');
        $date     = gmdate('Ymd');
        $url      = "{$this->endpoint}/{$this->bucket}/{$storageKey}";
        $host     = parse_url($this->endpoint, PHP_URL_HOST);
        $hash     = hash('sha256', '');

        $headers = [
            'Host'                 => $host,
            'x-amz-content-sha256' => $hash,
            'x-amz-date'          => $datetime,
        ];

        $sig = $this->signRequest('DELETE', "/{$this->bucket}/{$storageKey}", '', $headers, $hash, $datetime, $date);

        $curlHeaders   = array_map(fn($k, $v) => "{$k}: {$v}", array_keys($headers), $headers);
        $curlHeaders[] = "Authorization: {$sig}";

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST  => 'DELETE',
            CURLOPT_HTTPHEADER     => $curlHeaders,
            CURLOPT_RETURNTRANSFER => true,
        ]);
        curl_exec($ch);
        curl_close($ch);
    }

    private function signRequest(string $method, string $path, string $query, array $headers, string $payloadHash, string $datetime, string $date): string
    {
        ksort($headers);
        $canonicalHeaders = '';
        $signedHeaders    = '';
        foreach ($headers as $k => $v) {
            $lk               = strtolower($k);
            $canonicalHeaders .= "{$lk}:{$v}\n";
            $signedHeaders    .= "{$lk};";
        }
        $signedHeaders = rtrim($signedHeaders, ';');

        $canonicalRequest = "{$method}\n{$path}\n{$query}\n{$canonicalHeaders}\n{$signedHeaders}\n{$payloadHash}";
        $credentialScope  = "{$date}/{$this->region}/s3/aws4_request";
        $stringToSign     = "AWS4-HMAC-SHA256\n{$datetime}\n{$credentialScope}\n" . hash('sha256', $canonicalRequest);

        $signingKey = $this->getSigningKey($date);
        $signature  = hash_hmac('sha256', $stringToSign, $signingKey);

        return "AWS4-HMAC-SHA256 Credential={$this->key}/{$credentialScope}, SignedHeaders={$signedHeaders}, Signature={$signature}";
    }

    private function getSigningKey(string $date): string
    {
        $kDate    = hash_hmac('sha256', $date,          'AWS4' . $this->secret, true);
        $kRegion  = hash_hmac('sha256', $this->region,  $kDate,    true);
        $kService = hash_hmac('sha256', 's3',           $kRegion,  true);
        return hash_hmac('sha256', 'aws4_request',      $kService, true);
    }

    // ── Local dev fallback ────────────────────────────────────────

    private function localUpload(string $localPath, string $storageKey, string $mimeType): string
    {
        $dest = $this->localPath($storageKey);
        $dir  = dirname($dest);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        copy($localPath, $dest);
        return $storageKey;
    }

    private function localPath(string $storageKey): string
    {
        return dirname(__DIR__) . '/storage/' . $storageKey;
    }

    public function serveLocal(string $storageKey): void
    {
        $path = $this->localPath($storageKey);
        if (!file_exists($path)) {
            jsonError('File not found.', 404);
        }
        $mime = mime_content_type($path) ?: 'application/octet-stream';
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . filesize($path));
        header('Cache-Control: private, max-age=3600');
        readfile($path);
        exit;
    }
}
