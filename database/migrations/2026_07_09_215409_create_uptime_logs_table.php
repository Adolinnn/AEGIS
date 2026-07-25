<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('uptime_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('target_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('status_code')->nullable();
            $table->unsignedInteger('response_time_ms')->nullable();
            $table->enum('status', ['up', 'down', 'degraded', 'unknown'])->default('unknown');
            $table->text('error_message')->nullable();
            $table->json('response_headers')->nullable();
            $table->timestamp('checked_at')->useCurrent();

            $table->index(['target_id', 'checked_at']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('uptime_logs');
    }
};