<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds a `status` column so the UI can distinguish a tool that is currently
 * streaming output (running) from one that has finished (completed/failed).
 * Needed for the real-time terminal: without this the frontend can't tell a
 * still-running tool from a finished one until the whole row appears.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scan_tool_outputs', function (Blueprint $table) {
            $table->string('status')->default('completed')->after('tool');
        });
    }

    public function down(): void
    {
        Schema::table('scan_tool_outputs', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
