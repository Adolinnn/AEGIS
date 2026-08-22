<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Stores the raw output of each tool run within a scan run, so the UI can show
 * exactly what every tool did (command, exit code, stdout) even when the tool
 * produced no findings.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scan_tool_outputs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('scan_run_id')->constrained()->cascadeOnDelete();
            $table->string('tool');
            $table->longText('command')->nullable();
            $table->integer('exit_code')->nullable();
            $table->boolean('timed_out')->default(false);
            $table->longText('output')->nullable();
            $table->integer('findings_count')->default(0);
            $table->timestamps();

            $table->index('scan_run_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scan_tool_outputs');
    }
};
