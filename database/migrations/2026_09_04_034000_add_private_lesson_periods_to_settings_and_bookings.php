<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('institute_settings', function (Blueprint $table) {
            $table->json('private_lesson_periods')->nullable()->after('director_name');
        });

        Schema::table('private_lesson_bookings', function (Blueprint $table) {
            $table->string('preferred_period_name')->nullable()->after('status');
            $table->time('preferred_start_time')->nullable()->after('preferred_period_name');
            $table->time('preferred_end_time')->nullable()->after('preferred_start_time');
        });
    }

    public function down(): void
    {
        Schema::table('private_lesson_bookings', function (Blueprint $table) {
            $table->dropColumn(['preferred_period_name', 'preferred_start_time', 'preferred_end_time']);
        });

        Schema::table('institute_settings', function (Blueprint $table) {
            $table->dropColumn('private_lesson_periods');
        });
    }
};
