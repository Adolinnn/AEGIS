<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('findings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('scan_run_id')->constrained()->cascadeOnDelete();
            $table->foreignId('target_id')->constrained()->cascadeOnDelete();
            $table->string('tool');
            $table->string('title');
            $table->string('category')->nullable();
            $table->string('severity')->default('info');
            $table->text('description')->nullable();
            $table->text('evidence')->nullable();
            $table->text('recommendation')->nullable();
            $table->text('raw_output')->nullable();
            $table->timestamp('detected_at')->nullable();
            $table->timestamps();

            $table->index(['scan_run_id', 'severity']);
            $table->index('tool');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('findings');
    }
};
