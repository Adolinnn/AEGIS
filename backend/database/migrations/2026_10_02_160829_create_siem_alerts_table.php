<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('siem_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('agent_id')->constrained('siem_agents')->cascadeOnDelete();
            $table->string('rule_key');
            $table->string('title');
            $table->string('severity');
            $table->text('description')->nullable();
            $table->string('status')->default('open');
            $table->string('src_ip')->nullable();
            $table->string('username')->nullable();
            $table->integer('event_count')->default(1);
            $table->timestamp('first_seen_at');
            $table->timestamp('last_seen_at');
            $table->string('dedupe_key')->index();
            $table->json('evidence')->nullable();
            $table->string('mitre')->nullable();
            $table->text('ai_summary')->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('siem_alerts');
    }
};
