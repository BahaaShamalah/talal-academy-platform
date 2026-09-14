<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('group_subjects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_group_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->restrictOnDelete();
            $table->foreignId('teacher_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('hall_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('capacity')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();

            $table->unique(['course_group_id', 'subject_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('group_subjects');
    }
};
