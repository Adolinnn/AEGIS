<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lets a user fully configure their own AI provider from the Profile page —
 * provider (openai/anthropic/openrouter/custom), base URL, and model —
 * instead of only overriding the API key on top of the server's fixed
 * services.llm.provider config. When llm_provider is set, it takes priority
 * over the server-wide LLM_PROVIDER env value for that user's requests.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('llm_provider')->nullable()->after('llm_api_key');
            $table->string('llm_base_url')->nullable()->after('llm_provider');
            $table->string('llm_model')->nullable()->after('llm_base_url');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['llm_provider', 'llm_base_url', 'llm_model']);
        });
    }
};
