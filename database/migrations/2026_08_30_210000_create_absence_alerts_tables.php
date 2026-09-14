<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('absence_alert_thresholds', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('consecutive_absences_count')->unique();
            $table->string('alert_level');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('absence_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('group_subject_id')->constrained('group_subjects')->cascadeOnDelete();
            $table->unsignedInteger('consecutive_count');
            $table->string('alert_level');
            $table->timestamp('triggered_at');
            $table->boolean('acknowledged')->default(false);
            $table->foreignId('acknowledged_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('absence_alerts');
        Schema::dropIfExists('absence_alert_thresholds');
    }
};
