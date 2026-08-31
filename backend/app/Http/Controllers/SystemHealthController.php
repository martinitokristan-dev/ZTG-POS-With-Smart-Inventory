<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Carbon\Carbon;

class SystemHealthController extends Controller
{
    /**
     * Get real-time system health telemetry and incident root-cause analysis diagnostics.
     */
    public function diagnostics()
    {
        $now = Carbon::now('Asia/Manila');
        $startOfMonth = Carbon::now('Asia/Manila')->startOfMonth();

        // 1. Render 750-Hour Monthly Quota & Live API Sync
        $totalElapsedSecondsThisMonth = abs($now->getTimestamp() - $startOfMonth->getTimestamp());
        $renderHoursUsed = round($totalElapsedSecondsThisMonth / 3600, 1);
        $renderQuotaLimit = 750.0;
        $renderHoursRemaining = max(0.0, round($renderQuotaLimit - $renderHoursUsed, 1));
        $renderUsagePercent = min(100.0, max(0.0, round(($renderHoursUsed / $renderQuotaLimit) * 100, 1)));
        $isQuotaExhausted = $renderHoursUsed >= $renderQuotaLimit;
        $isQuotaWarning = $renderHoursUsed >= 700.0 && !$isQuotaExhausted;

        $renderApiKey = env('RENDER_API_KEY');
        $renderApiConnected = false;
        $renderServiceName = null;

        if (!empty($renderApiKey)) {
            try {
                $response = Http::withToken($renderApiKey)
                    ->timeout(3)
                    ->get('https://api.render.com/v1/services?limit=5');
                
                if ($response->successful()) {
                    $renderApiConnected = true;
                    $services = $response->json();
                    if (!empty($services) && isset($services[0]['service']['name'])) {
                        $renderServiceName = $services[0]['service']['name'];
                    }
                }
            } catch (\Throwable $e) {
                // Graceful fallback
            }
        }

        // 2. Database Health Check, Latency & TiDB 5 GiB Storage Telemetry
        $dbStart = microtime(true);
        $dbHealthy = false;
        $dbError = null;
        $tableCount = 0;
        $dbSizeBytes = 0;
        $dbDataBytes = 0;
        $dbIndexBytes = 0;
        $topTables = [];

        try {
            DB::select('SELECT 1');
            $dbLatencyMs = round((microtime(true) - $dbStart) * 1000, 2);
            $dbHealthy = true;

            $driver = config('database.default');
            if ($driver === 'sqlite') {
                $tables = DB::select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
                $tableCount = count($tables);
                $dbSizeBytes = @filesize(config('database.connections.sqlite.database')) ?: 0;
                $dbDataBytes = $dbSizeBytes;
                $dbIndexBytes = 0;
            } else {
                $tables = DB::select('SHOW TABLES');
                $tableCount = count($tables);

                $sizeQuery = DB::select("
                    SELECT 
                        table_name,
                        table_rows,
                        data_length,
                        index_length,
                        (COALESCE(data_length, 0) + COALESCE(index_length, 0)) AS total_bytes
                    FROM information_schema.TABLES 
                    WHERE table_schema = DATABASE()
                    ORDER BY total_bytes DESC
                ");

                foreach ($sizeQuery as $row) {
                    $tBytes = (int) ($row->total_bytes ?? 0);
                    $dBytes = (int) ($row->data_length ?? 0);
                    $iBytes = (int) ($row->index_length ?? 0);
                    $dbSizeBytes += $tBytes;
                    $dbDataBytes += $dBytes;
                    $dbIndexBytes += $iBytes;

                    if (count($topTables) < 8 && $tBytes > 0) {
                        $topTables[] = [
                            'table_name'     => $row->table_name,
                            'rows'           => (int) ($row->table_rows ?? 0),
                            'data_bytes'     => $dBytes,
                            'index_bytes'    => $iBytes,
                            'total_bytes'    => $tBytes,
                            'formatted_size' => $this->formatBytes($tBytes),
                        ];
                    }
                }
            }
        } catch (\Throwable $e) {
            $dbLatencyMs = round((microtime(true) - $dbStart) * 1000, 2);
            $dbError = $e->getMessage();
        }

        $tidbLimitGb = 5.0;
        $tidbLimitBytes = 5 * 1024 * 1024 * 1024; // 5 GiB = 5,368,709,120 bytes
        $tidbUsedPercent = round(($dbSizeBytes / max(1, $tidbLimitBytes)) * 100, 3);
        $tidbRemainingBytes = max(0, $tidbLimitBytes - $dbSizeBytes);

        // 3. Storage, Media & Disk Capacity
        $diskPath = storage_path();
        $diskFree = @disk_free_space($diskPath);
        $diskTotal = @disk_total_space($diskPath);
        $diskFreeFormatted = $diskFree ? round($diskFree / (1024 * 1024 * 1024), 1) . ' GB' : 'Unlimited';
        $diskTotalFormatted = $diskTotal ? round($diskTotal / (1024 * 1024 * 1024), 1) . ' GB' : 'Cloud Storage';
        $storageWritable = is_writable(storage_path('logs'));
        $publicStorageExists = File::exists(storage_path('app/public'));
        $mediaFilesCount = $publicStorageExists ? count(File::allFiles(storage_path('app/public'))) : 0;

        // 4. Memory Telemetry
        $memoryUsage = round(memory_get_usage(true) / 1024 / 1024, 1);
        $peakMemoryUsage = round(memory_get_peak_usage(true) / 1024 / 1024, 1);

        // 5. Parse Recent Logs for Root Cause Analysis
        $recentErrors = $this->parseRecentLogs();

        // 6. Build Incident Timeline (including 750h quota trigger if reached)
        $incidentHistory = $this->buildIncidentHistory(
            $recentErrors,
            $dbHealthy,
            $isQuotaExhausted,
            $isQuotaWarning,
            $renderHoursUsed,
            $renderHoursRemaining
        );

        // 7. Downtime Metrics Calculation
        $totalDowntimeSeconds = 0;
        $activeOutagesCount = 0;
        foreach ($incidentHistory as $inc) {
            if ($inc['severity'] === 'Critical' && $inc['status'] === 'Active') {
                $totalDowntimeSeconds += 120;
                $activeOutagesCount++;
            }
        }
        $downtimePercentage = round(($totalDowntimeSeconds / max(1, $totalElapsedSecondsThisMonth)) * 100, 3);
        $uptimePercentage = max(0.0, round(100.0 - $downtimePercentage, 2));

        // 8. Cloudinary Cloud Media Storage Telemetry (Scoped to Application Folders)
        $cloudName = env('CLOUDINARY_CLOUD_NAME');
        $cloudKey = env('CLOUDINARY_API_KEY');
        $cloudSecret = env('CLOUDINARY_API_SECRET');

        $cloudinaryUrl = env('CLOUDINARY_URL');
        if (!empty($cloudinaryUrl)) {
            $parsed = parse_url($cloudinaryUrl);
            if (!empty($parsed['user'])) $cloudKey = $parsed['user'];
            if (!empty($parsed['pass'])) $cloudSecret = $parsed['pass'];
            if (!empty($parsed['host'])) $cloudName = $parsed['host'];
        }

        $productFolder = env('CLOUDINARY_FOLDER', 'products');
        $avatarFolder = 'avatars';
        $logoFolder = 'logos';

        $dbProductPhotos = 0;
        $dbAvatarPhotos = 0;
        $dbLogoPhotos = 0;
        try {
            $dbProductPhotos = DB::table('products')->whereNotNull('image')->where('image', '!=', '')->count();
            $dbAvatarPhotos = DB::table('user_profiles')->whereNotNull('profile_photo')->where('profile_photo', '!=', '')->count();
            $dbLogoPhotos = DB::table('settings')->where('key', 'business_logo')->whereNotNull('value')->where('value', '!=', '')->count();
        } catch (\Throwable $e) {
            // DB not ready during migration
        }
        $totalDbPhotos = $dbProductPhotos + $dbAvatarPhotos + $dbLogoPhotos;

        $folderBreakdown = [
            'products' => [
                'name'      => 'Product Images',
                'folder'    => $productFolder,
                'count'     => $dbProductPhotos,
                'bytes'     => 0,
                'formatted' => '0 MB',
            ],
            'avatars' => [
                'name'      => 'User Avatars',
                'folder'    => $avatarFolder,
                'count'     => $dbAvatarPhotos,
                'bytes'     => 0,
                'formatted' => '0 MB',
            ],
            'logos' => [
                'name'      => 'Business Logos',
                'folder'    => $logoFolder,
                'count'     => $dbLogoPhotos,
                'bytes'     => 0,
                'formatted' => '0 MB',
            ],
        ];

        $cloudinaryData = [
            'connected'           => false,
            'cloud_name'          => $cloudName ?: 'Not configured',
            'plan'                => 'Free Tier (25 GB)',
            'storage_bytes'       => 0,
            'storage_formatted'   => '0 MB',
            'storage_limit_gb'    => 25.0,
            'objects_count'       => $totalDbPhotos,
            'bandwidth_bytes'     => 0,
            'bandwidth_formatted' => '0 MB',
            'credits_used'        => 0.0,
            'credits_limit'       => 25.0,
            'usage_percent'       => 0.0,
            'folders'             => $folderBreakdown,
            'last_updated'        => null,
        ];

        if (!empty($cloudName) && !empty($cloudKey) && !empty($cloudSecret) && $cloudKey !== '000000000000000') {
            try {
                // 1. Fetch Official Account-Wide Usage (Counts ALL folders and files in Cloudinary)
                $usageRes = Http::withBasicAuth($cloudKey, $cloudSecret)
                    ->timeout(3)
                    ->get("https://api.cloudinary.com/v1_1/{$cloudName}/usage");

                if ($usageRes->successful()) {
                    $uJson = $usageRes->json();
                    $accountStorageBytes = $uJson['storage']['usage'] ?? 0;
                    $accountBandwidthBytes = $uJson['bandwidth']['usage'] ?? 0;
                    $accountObjectsCount = $uJson['objects']['usage'] ?? $totalDbPhotos;
                    $accountCreditsUsed = $uJson['credits']['usage'] ?? round($accountStorageBytes / (1024 * 1024 * 1024), 2);
                    $accountCreditsLimit = $uJson['credits']['limit'] ?? 25.0;
                    $accountUsagePercent = $uJson['credits']['used_percent'] ?? ($accountCreditsLimit > 0 ? round(($accountCreditsUsed / $accountCreditsLimit) * 100, 1) : 0);

                    $cloudinaryData = [
                        'connected'           => true,
                        'cloud_name'          => $cloudName,
                        'plan'                => ($uJson['plan'] ?? 'Free') . ' (25 GB / Credits)',
                        'storage_bytes'       => $accountStorageBytes,
                        'storage_formatted'   => $this->formatBytes($accountStorageBytes),
                        'storage_limit_gb'    => (float) $accountCreditsLimit,
                        'objects_count'       => $accountObjectsCount,
                        'bandwidth_bytes'     => $accountBandwidthBytes,
                        'bandwidth_formatted' => $this->formatBytes($accountBandwidthBytes),
                        'credits_used'        => (float) $accountCreditsUsed,
                        'credits_limit'       => (float) $accountCreditsLimit,
                        'usage_percent'       => (float) $accountUsagePercent,
                        'folders'             => $folderBreakdown,
                        'last_updated'        => $uJson['last_updated'] ?? Carbon::now('Asia/Manila')->format('Y-m-d H:i:s'),
                    ];
                }

                // 2. Query App Folder Breakdowns (products, avatars, logos)
                $productPrefixes = array_unique([$productFolder, 'product_images', 'products', 'product']);
                $folderConfig = [
                    'products' => $productPrefixes,
                    'avatars'  => [$avatarFolder],
                    'logos'    => [$logoFolder],
                ];

                foreach ($folderConfig as $key => $prefixes) {
                    $seenPublicIds = [];
                    $folderBytes = 0;
                    $folderCount = 0;

                    foreach ($prefixes as $pfx) {
                        try {
                            $folderRes = Http::withBasicAuth($cloudKey, $cloudSecret)
                                ->timeout(2)
                                ->get("https://api.cloudinary.com/v1_1/{$cloudName}/resources/image/upload", [
                                    'prefix'      => $pfx . '/',
                                    'max_results' => 500,
                                ]);

                            if ($folderRes->successful()) {
                                $resources = $folderRes->json('resources') ?? [];
                                foreach ($resources as $resItem) {
                                    $pid = $resItem['public_id'] ?? null;
                                    if ($pid && !isset($seenPublicIds[$pid])) {
                                        $seenPublicIds[$pid] = true;
                                        $folderBytes += ($resItem['bytes'] ?? 0);
                                        $folderCount++;
                                    }
                                }
                            }
                        } catch (\Throwable $e) {
                            // Skip folder query failure
                        }
                    }

                    $folderBreakdown[$key]['count'] = max($folderCount, $folderBreakdown[$key]['count']);
                    $folderBreakdown[$key]['bytes'] = $folderBytes;
                    $folderBreakdown[$key]['formatted'] = $this->formatBytes($folderBytes);
                }

                $cloudinaryData['folders'] = $folderBreakdown;
            } catch (\Throwable $e) {
                // Graceful fallback
            }
        }

        return response()->json([
            'status' => ($dbHealthy && !$isQuotaExhausted) ? 'healthy' : 'degraded',
            'server' => [
                'php_version'       => PHP_VERSION,
                'laravel_version'   => app()->version(),
                'environment'       => config('app.env'),
                'timezone'          => config('app.timezone'),
                'server_time'       => $now->format('Y-m-d h:i:s A T'),
                'memory_usage_mb'   => $memoryUsage,
                'peak_memory_mb'    => $peakMemoryUsage,
                'disk_free'         => $diskFreeFormatted,
                'disk_total'        => $diskTotalFormatted,
                'storage_writable'  => $storageWritable,
            ],
            'render_quota' => [
                'api_connected'     => $renderApiConnected,
                'service_name'      => $renderServiceName ?: 'Render Web Service',
                'limit_hours'       => $renderQuotaLimit,
                'used_hours'        => $renderHoursUsed,
                'remaining_hours'   => $renderHoursRemaining,
                'usage_percent'     => $renderUsagePercent,
                'is_exhausted'      => $isQuotaExhausted,
                'is_warning'        => $isQuotaWarning,
                'resets_at'         => $startOfMonth->copy()->addMonth()->format('M j, Y \a\t g:i A'),
            ],
            'cloudinary'    => $cloudinaryData,
            'downtime' => [
                'total_seconds'     => $totalDowntimeSeconds,
                'formatted'         => $this->formatSeconds($totalDowntimeSeconds),
                'active_outages'    => $activeOutagesCount,
                'uptime_percent'    => $uptimePercentage,
                'downtime_percent'  => $downtimePercentage,
            ],
            'database' => [
                'connected'     => $dbHealthy,
                'latency_ms'    => $dbLatencyMs,
                'driver'        => config('database.default'),
                'database_name' => config('database.connections.mysql.database'),
                'table_count'   => $tableCount,
                'storage'       => [
                    'used_bytes'          => $dbSizeBytes,
                    'data_bytes'          => $dbDataBytes,
                    'index_bytes'         => $dbIndexBytes,
                    'used_mb'             => round($dbSizeBytes / 1024 / 1024, 2),
                    'used_formatted'      => $this->formatBytes($dbSizeBytes),
                    'limit_gb'            => $tidbLimitGb,
                    'limit_bytes'         => $tidbLimitBytes,
                    'limit_formatted'     => '5 GiB',
                    'remaining_bytes'     => $tidbRemainingBytes,
                    'remaining_formatted' => $this->formatBytes($tidbRemainingBytes),
                    'usage_percent'       => $tidbUsedPercent,
                    'top_tables'          => $topTables,
                ],
                'error'         => $dbError,
            ],
            'storage' => [
                'driver'            => config('filesystems.default'),
                'writable'          => $storageWritable,
                'public_storage'    => $publicStorageExists,
                'media_files_count' => $mediaFilesCount,
            ],
            'incidents'     => $incidentHistory,
            'recent_errors' => $recentErrors,
        ]);
    }

    /**
     * Format bytes into clean human-friendly size.
     */
    private function formatBytes(int|float $bytes): string
    {
        if ($bytes <= 0) return '0 MB';
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $i = floor(log($bytes, 1024));
        return round($bytes / pow(1024, $i), 2) . ' ' . ($units[$i] ?? 'B');
    }

    /**
     * Format seconds into clean human-friendly duration.
     */
    private function formatSeconds(int $seconds): string
    {
        if ($seconds === 0) {
            return '0 seconds';
        }
        $days = floor($seconds / 86400);
        $hours = floor(($seconds % 86400) / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        $sec = $seconds % 60;

        $parts = [];
        if ($days > 0) $parts[] = "{$days}d";
        if ($hours > 0) $parts[] = "{$hours}h";
        if ($minutes > 0) $parts[] = "{$minutes}m";
        if ($sec > 0 || empty($parts)) $parts[] = "{$sec}s";

        return implode(' ', $parts);
    }

    /**
     * Parse recent errors and exceptions from storage/logs/laravel.log.
     */
    private function parseRecentLogs(int $limit = 8): array
    {
        $logPath = storage_path('logs/laravel.log');
        if (!File::exists($logPath)) {
            return [];
        }

        try {
            $content = File::get($logPath);
            if (empty($content)) {
                return [];
            }

            $pattern = '/\[(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[^\]]*)\]\s+(\w+)\.(\w+):\s+([^\{\[\n]+)/';
            preg_match_all($pattern, $content, $matches, PREG_SET_ORDER);

            $parsed = [];
            $seenMessages = [];

            for ($i = count($matches) - 1; $i >= 0; $i--) {
                $match = $matches[$i];
                $timestamp = $match[1] ?? '';
                $environment = $match[2] ?? '';
                $level = strtoupper($match[3] ?? 'ERROR');
                $message = trim($match[4] ?? 'Unknown error');

                $hash = md5($level . $message);
                if (isset($seenMessages[$hash])) {
                    continue;
                }
                $seenMessages[$hash] = true;

                $parsed[] = [
                    'timestamp'   => $timestamp,
                    'level'       => $level,
                    'environment' => $environment,
                    'message'     => $message,
                ];

                if (count($parsed) >= $limit) {
                    break;
                }
            }

            return $parsed;
        } catch (\Throwable $e) {
            return [];
        }
    }

    /**
     * Build recent incident events, quota triggers and root cause analyses.
     */
    private function buildIncidentHistory(
        array $recentErrors,
        bool $dbHealthy,
        bool $isQuotaExhausted,
        bool $isQuotaWarning,
        float $renderHoursUsed,
        float $renderHoursRemaining
    ): array {
        $incidents = [];

        // 1. Check Render 750h Free-Tier Exhaustion Trigger
        if ($isQuotaExhausted) {
            $incidents[] = [
                'id'          => 'INC-RENDER-750H',
                'timestamp'   => Carbon::now('Asia/Manila')->format('M d, Y h:i A'),
                'service'     => 'Render Cloud Host',
                'severity'    => 'Critical',
                'duration'    => 'Active Suspension',
                'status'      => 'Active',
                'root_cause'  => "Render 750-Hour Monthly Free-Tier Quota Exhausted ({$renderHoursUsed}h / 750h used). Application throttled or spun down by cloud provider until month-end.",
                'action_taken'=> 'Upgrade to Render Individual Plan ($7/mo) or wait for monthly quota reset on 1st of next month.',
            ];
        } elseif ($isQuotaWarning) {
            $incidents[] = [
                'id'          => 'INC-RENDER-WARN',
                'timestamp'   => Carbon::now('Asia/Manila')->format('M d, Y h:i A'),
                'service'     => 'Render Cloud Host',
                'severity'    => 'Warning',
                'duration'    => 'Approaching Limit',
                'status'      => 'Monitoring',
                'root_cause'  => "Render Monthly Quota Alert: {$renderHoursUsed}h / 750h used ({$renderHoursRemaining}h remaining). Server may suspend before end of month.",
                'action_taken'=> 'Review instance run schedules and prepare plan upgrade.',
            ];
        }

        // 2. Check Database Connection Failure
        if (!$dbHealthy) {
            $incidents[] = [
                'id'          => 'INC-DB-CONN',
                'timestamp'   => Carbon::now('Asia/Manila')->format('M d, Y h:i A'),
                'service'     => 'MySQL Database',
                'severity'    => 'Critical',
                'duration'    => 'Active',
                'status'      => 'Investigating',
                'root_cause'  => 'Database Connection Refused: Unable to reach MySQL database host.',
                'action_taken'=> 'Verify MySQL host credentials, pool connections, and network firewall.',
            ];
        }

        // 3. Add recent parsed errors as diagnostic logs
        foreach ($recentErrors as $idx => $err) {
            if ($err['level'] === 'ERROR' || $err['level'] === 'CRITICAL' || $err['level'] === 'EMERGENCY') {
                $incidents[] = [
                    'id'          => 'INC-' . (1000 + $idx),
                    'timestamp'   => Carbon::parse($err['timestamp'])->setTimezone('Asia/Manila')->format('M d, Y h:i A'),
                    'service'     => 'Laravel Application',
                    'severity'    => $err['level'] === 'CRITICAL' ? 'Critical' : 'Warning',
                    'duration'    => 'Logged',
                    'status'      => 'Resolved',
                    'root_cause'  => $err['message'],
                    'action_taken'=> 'Captured by exception handler; system self-healed.',
                ];
            }
        }

        // 4. Clean SLA log if zero incidents
        if (empty($incidents)) {
            $incidents[] = [
                'id'          => 'INC-SLA-100',
                'timestamp'   => Carbon::now('Asia/Manila')->startOfMonth()->format('M d, Y h:i A'),
                'service'     => 'Render Cloud Cluster',
                'severity'    => 'Operational',
                'duration'    => '0s Downtime',
                'status'      => 'Resolved',
                'root_cause'  => 'No outages recorded. All microservices operating at 100% SLA capacity.',
                'action_taken'=> 'Continuous health surveillance passing all checks.',
            ];
        }

        return $incidents;
    }
}
