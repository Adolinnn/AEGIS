<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lets a user supply their own LLM API key (for whichever provider is
 * configured in services.llm.provider) instead of relying solely on the
 * server-wide .env key. Stored encrypted at rest via the model cast.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->text('llm_api_key')->nullable()->after('remember_token');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('llm_api_key');
        });
    }
};
