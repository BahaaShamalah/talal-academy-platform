<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('class_sessions', function (Blueprint $table) {
            $table->foreignId('teacher_id')->nullable()->after('class_schedule_id')->constrained('users')->nullOnDelete();
            $table->foreignId('hall_id')->nullable()->after('teacher_id')->constrained('halls')->nullOnDelete();
            $table->boolean('modified_from_schedule')->default(false)->after('status');
            $table->boolean('is_makeup')->default(false)->after('modified_from_schedule');
            $table->text('cancellation_reason')->nullable()->after('is_makeup');
        });
    }

    public function down(): void
    {
        Schema::table('class_sessions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('teacher_id');
            $table->dropConstrainedForeignId('hall_id');
            $table->dropColumn(['modified_from_schedule', 'is_makeup', 'cancellation_reason']);
        });
    }
};
