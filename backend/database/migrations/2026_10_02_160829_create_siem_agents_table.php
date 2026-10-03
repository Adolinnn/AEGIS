<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('siem_agents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('uuid')->unique();
            $table->string('name');
            $table->string('os_type')->default('linux');
            $table->string('secret_hash');
            $table->string('secret_last4');
            $table->string('install_token_hash')->nullable();
            $table->timestamp('install_token_expires_at')->nullable();
            $table->string('status')->default('pending');
            $table->json('config')->nullable();
            $table->string('hostname')->nullable();
            $table->string('ip_address')->nullable();
            $table->json('local_ips')->nullable();
            $table->string('os_info')->nullable();
            $table->string('agent_version')->nullable();
            $table->integer('tz_offset_minutes')->nullable();
            $table->json('host_stats')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamp('first_seen_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('siem_agents');
    }
};
