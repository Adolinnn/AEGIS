<?php

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
        Schema::table('scan_runs', function (Blueprint $table) {
            $table->boolean('generate_report')->default(false)->after('consent_text');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('scan_runs', function (Blueprint $table) {
            $table->dropColumn('generate_report');
        });
    }
};