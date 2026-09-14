<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('group_subject_id')->constrained('group_subjects')->restrictOnDelete();
            $table->foreignId('class_session_id')->nullable()->constrained('class_sessions')->nullOnDelete();
            $table->decimal('numeric_score', 8, 2)->nullable();
            $table->decimal('numeric_score_max', 8, 2)->default(10);
            $table->string('level_rating')->nullable();
            $table->unsignedTinyInteger('participation_rating')->nullable();
            $table->unsignedTinyInteger('understanding_rating')->nullable();
            $table->unsignedTinyInteger('homework_rating')->nullable();
            $table->unsignedTinyInteger('discipline_rating')->nullable();
            $table->text('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluations');
    }
};
