<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('siem_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('agent_id')->constrained('siem_agents')->cascadeOnDelete();
            $table->timestamp('occurred_at');
            $table->timestamp('received_at');
            $table->string('source');
            $table->string('event_type')->default('unknown');
            $table->string('severity')->default('info');
            $table->string('src_ip')->nullable()->index();
            $table->string('username')->nullable();
            $table->string('message')->nullable();
            $table->json('fields')->nullable();
            $table->text('raw')->nullable();

            $table->index(['user_id', 'occurred_at']);
            $table->index(['agent_id', 'occurred_at']);
            $table->index(['agent_id', 'event_type', 'src_ip', 'occurred_at'], 'siem_events_composite_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('siem_events');
    }
};
