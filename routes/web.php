<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\QuickScanController;
use App\Http\Controllers\TargetController;
use App\Http\Controllers\ScanController;
use App\Http\Controllers\ScanRunController;
use App\Http\Controllers\UptimeController;
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

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Quick Scan (whois / dig / sslscan / whatweb against a URL)
    Route::get('quick-scan', [QuickScanController::class, 'index'])->name('quick-scan.index');
    Route::post('quick-scan', [QuickScanController::class, 'run'])->name('quick-scan.run');

    // Targets
    Route::resource('targets', TargetController::class)
        ->names('targets');

    Route::post('targets/{target}/scan', [TargetController::class, 'scan'])->name('targets.scan');
    Route::post('targets/{target}/check-uptime', [TargetController::class, 'checkUptime'])->name('targets.check-uptime');
    Route::get('targets/{target}/vulnerabilities', [TargetController::class, 'vulnerabilities'])->name('targets.vulnerabilities');
    Route::get('targets/{target}/uptime-history', [TargetController::class, 'uptimeHistory'])->name('targets.uptime-history');

    // Scans
    Route::get('scans', [ScanController::class, 'index'])->name('scans.index');
    Route::get('scans/{scan}', [ScanController::class, 'show'])->name('scans.show');
    Route::post('scans/{vulnerability}/mark-resolved', [ScanController::class, 'markResolved'])->name('scans.mark-resolved');
    Route::post('scans/{vulnerability}/mark-unresolved', [ScanController::class, 'markUnresolved'])->name('scans.mark-unresolved');
    Route::post('scans/{vulnerability}/re-scan', [ScanController::class, 'reScan'])->name('scans.re-scan');

    // Uptime
    Route::get('uptime', [UptimeController::class, 'index'])->name('uptime.index');
    Route::get('uptime/{target}', [UptimeController::class, 'show'])->name('uptime.show');

    // AI Remediation
    Route::post('vulnerabilities/{vulnerability}/generate-patch', [ScanController::class, 'generatePatch'])->name('vulnerabilities.generate-patch');

    // Tool-driven scan runs
    Route::get('scan-runs', [ScanRunController::class, 'index'])->name('scan-runs.index');
    Route::get('scan-runs/{scanRun}', [ScanRunController::class, 'show'])->name('scan-runs.show');
    Route::post('targets/{target}/scan-run', [ScanRunController::class, 'store'])->name('targets.scan-run');
});

require __DIR__.'/auth.php';
require __DIR__.'/admin.php';