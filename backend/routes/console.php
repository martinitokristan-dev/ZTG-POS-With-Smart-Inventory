<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('app:remind-daily-sales')->cron('30 16 * * 1-6');
Schedule::command('app:remind-daily-sales')->cron('0 17 * * 1-6');
Schedule::command('app:release-expired-reservations')->daily();
Schedule::command('app:identify-dead-stock')->daily();
// Delete login tokens that expired more than a day ago (see config/sanctum.php 'expiration').
Schedule::command('sanctum:prune-expired --hours=24')->daily();
