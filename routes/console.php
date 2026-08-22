<?php

use App\Jobs\CheckUptimeJob;
use App\Models\Target;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
 * Interval-based uptime monitoring.
 *
 * Every minute the scheduler checks which active targets are due for an uptime
 * check (based on each target's own uptime_check_interval_minutes, via
 * Target::isOverdueForCheck()) and queues a CheckUptimeJob for each. The queue
 * worker then performs the actual HTTP check. Requires BOTH a running
 * scheduler (php artisan schedule:work) and a queue worker (php artisan
 * queue:work) — start.sh runs both.
 */
Schedule::call(function () {
    Target::active()->get()
        ->filter(fn (Target $target) => $target->isOverdueForCheck())
        ->each(fn (Target $target) => CheckUptimeJob::dispatch($target->id));
})->everyMinute()->name('aegis:dispatch-due-uptime-checks')->withoutOverlapping();
