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
        Schema::table('siem_alerts', function (Blueprint $table) {
            if (!Schema::hasColumn('siem_alerts', 'evidence_event_ids')) {
                $table->json('evidence_event_ids')->nullable()->after('evidence');
            }
        });
    }

    public function down(): void
    {
        Schema::table('siem_alerts', function (Blueprint $table) {
            if (Schema::hasColumn('siem_alerts', 'evidence_event_ids')) {
                $table->dropColumn('evidence_event_ids');
            }
        });
    }
};
