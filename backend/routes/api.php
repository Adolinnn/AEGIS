<?php

use Illuminate\Support\Facades\Route;

Route::any('/siem/health', function () {
    return response()->json(['status' => 'ok', 'time' => now()->toIso8601String()]);
});

Route::middleware([\App\Http\Middleware\SiemAgentMiddleware::class])->group(function () {
    Route::post('/siem/heartbeat', \App\Http\Controllers\Api\SiemHeartbeatController::class);
    Route::post('/siem/ingest', \App\Http\Controllers\Api\SiemIngestController::class);
});
