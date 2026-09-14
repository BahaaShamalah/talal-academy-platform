<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staff_profiles', function (Blueprint $table) {
            $table->time('expected_start_time')->nullable();
            $table->time('expected_end_time')->nullable();
        });

        Schema::create('staff_attendance_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->time('check_in_time')->nullable();
            $table->time('check_out_time')->nullable();
            $table->string('status')->default('present');
            $table->integer('late_minutes')->nullable();
            $table->integer('overtime_minutes')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('marked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_attendance_records');

        Schema::table('staff_profiles', function (Blueprint $table) {
            $table->dropColumn(['expected_start_time', 'expected_end_time']);
        });
    }
};
