<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('institute_settings', function (Blueprint $table) {
            $table->string('google_analytics_id')->nullable()->after('og_image_media_id');
            $table->string('google_search_console_verification', 512)->nullable()->after('google_analytics_id');
        });
    }

    public function down(): void
    {
        Schema::table('institute_settings', function (Blueprint $table) {
            $table->dropColumn(['google_analytics_id', 'google_search_console_verification']);
        });
    }
};
