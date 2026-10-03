<?php

use App\Http\Controllers\BillingController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\QuickScanController;
use App\Http\Controllers\TargetController;
use App\Http\Controllers\ScanRunController;
use App\Http\Controllers\UptimeController;
use App\Http\Controllers\VulnerabilityController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', [DashboardController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::patch('/profile/api-key', [ProfileController::class, 'updateApiKey'])->name('profile.api-key.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // AI chat sidebar (context-aware: reads targets/scan results, can add targets).
    Route::post('chat/send', [ChatController::class, 'send'])->name('chat.send');

    // Billing / subscription plans (no payment gateway — self-service tier switch).
    Route::get('billing', [BillingController::class, 'index'])->name('billing.index');
    Route::post('billing/subscribe', [BillingController::class, 'subscribe'])->name('billing.subscribe');
    Route::post('billing/cancel', [BillingController::class, 'cancel'])->name('billing.cancel');

    // Quick, synchronous recon scan (no persistence).
    Route::get('quick-scan', [QuickScanController::class, 'index'])->name('quick-scan.index');
    Route::post('quick-scan', [QuickScanController::class, 'run'])->name('quick-scan.run');

    // Targets.
    Route::resource('targets', TargetController::class)->names('targets');
    Route::post('targets/{target}/check-uptime', [TargetController::class, 'checkUptime'])->name('targets.check-uptime');
    Route::get('targets/{target}/vulnerabilities', [TargetController::class, 'vulnerabilities'])->name('targets.vulnerabilities');
    Route::get('targets/{target}/uptime-history', [TargetController::class, 'uptimeHistory'])->name('targets.uptime-history');

    // Scan runs (the unified tool + built-in scan engine).
    Route::get('scan-runs', [ScanRunController::class, 'index'])->name('scan-runs.index');
    Route::get('scan-runs/{scanRun}', [ScanRunController::class, 'show'])->name('scan-runs.show');
    Route::post('scan-runs/{scanRun}/generate-report', [ScanRunController::class, 'generateReport'])->name('scan-runs.generate-report');
    Route::post('targets/{target}/scan-run', [ScanRunController::class, 'store'])->name('targets.scan-run');

    // Vulnerabilities (aggregate over Findings).
    Route::get('vulnerabilities', [VulnerabilityController::class, 'index'])->name('vulnerabilities.index');
    Route::post('vulnerabilities/{finding}/resolve', [VulnerabilityController::class, 'resolve'])->name('vulnerabilities.resolve');
    Route::post('vulnerabilities/{finding}/unresolve', [VulnerabilityController::class, 'unresolve'])->name('vulnerabilities.unresolve');
    Route::post('vulnerabilities/{finding}/generate-patch', [VulnerabilityController::class, 'generatePatch'])->name('vulnerabilities.generate-patch');

    // Uptime monitoring.
    Route::get('uptime', [UptimeController::class, 'index'])->name('uptime.index');
    Route::get('uptime/{target}', [UptimeController::class, 'show'])->name('uptime.show');

    // SIEM
    Route::get('/siem/agents', [\App\Http\Controllers\SiemAgentController::class, 'index'])->name('siem.agents.index');
    Route::post('/siem/agents', [\App\Http\Controllers\SiemAgentController::class, 'store'])->name('siem.agents.store');
    Route::post('/siem/agents/{siemAgent}/rotate', [\App\Http\Controllers\SiemAgentController::class, 'rotate'])->name('siem.agents.rotate');
    Route::post('/siem/agents/{siemAgent}/revoke', [\App\Http\Controllers\SiemAgentController::class, 'revoke'])->name('siem.agents.revoke');
    Route::delete('/siem/agents/{siemAgent}', [\App\Http\Controllers\SiemAgentController::class, 'destroy'])->name('siem.agents.destroy');

    Route::get('/siem', [\App\Http\Controllers\SiemDashboardController::class, 'index'])->name('siem.overview');
    
    Route::get('/siem/events', [\App\Http\Controllers\SiemEventController::class, 'index'])->name('siem.events.index');

    Route::get('/siem/alerts', [\App\Http\Controllers\SiemAlertController::class, 'index'])->name('siem.alerts.index');
    Route::get('/siem/alerts/critical-unread', [\App\Http\Controllers\SiemAlertController::class, 'criticalUnread'])->name('siem.alerts.critical-unread');
    Route::get('/siem/alerts/{siemAlert}', [\App\Http\Controllers\SiemAlertController::class, 'show'])->name('siem.alerts.show');
    Route::post('/siem/alerts/{siemAlert}/status', [\App\Http\Controllers\SiemAlertController::class, 'updateStatus'])->name('siem.alerts.update-status');

    Route::get('/siem/rules', [\App\Http\Controllers\SiemRuleController::class, 'index'])->name('siem.rules.index');
    
    // AI Explain
    Route::post('/siem/events/{event}/explain', [\App\Http\Controllers\SiemEventController::class, 'explain'])->name('siem.events.explain');
});

Route::get('/siem/install/{token}', [\App\Http\Controllers\SiemInstallController::class, 'show'])->name('siem.install.show');

require __DIR__.'/auth.php';
require __DIR__.'/admin.php';
