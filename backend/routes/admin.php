<?php

use App\Http\Controllers\Admin\AuthenticatedSessionController as AdminSessionController;
use Illuminate\Support\Facades\Route;

Route::prefix('admin')->name('admin.')->group(function () {
    Route::middleware('guest:web')->group(function () {
        Route::get('login', [AdminSessionController::class, 'create'])->name('login');
        Route::post('login', [AdminSessionController::class, 'store']);
    });

    Route::middleware('admin')->group(function () {
        Route::get('dashboard', [AdminSessionController::class, 'dashboard'])->name('dashboard');
        Route::post('logout', [AdminSessionController::class, 'destroy'])->name('logout');
    });
});