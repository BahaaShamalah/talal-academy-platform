<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('class_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_subject_id')->constrained('group_subjects')->cascadeOnDelete();
            $table->foreignId('class_schedule_id')->nullable()->constrained()->nullOnDelete();
            $table->date('session_date');
            $table->time('start_time');
            $table->time('end_time');
            $table->string('status')->default('scheduled');
            $table->timestamps();

            $table->unique(
                ['group_subject_id', 'session_date', 'class_schedule_id'],
                'class_sessions_group_subject_date_schedule_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_sessions');
    }
};
