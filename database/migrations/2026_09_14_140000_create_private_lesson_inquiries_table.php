<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('private_lesson_inquiries', function (Blueprint $table) {
            $table->id();
            $table->string('student_name');
            $table->string('phone', 50);
            $table->string('phone_secondary', 50);
            $table->foreignId('grade_id')->constrained('grades')->restrictOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->restrictOnDelete();
            $table->unsignedTinyInteger('hours');
            $table->string('status')->default('new');
            $table->text('admin_notes')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('private_lesson_inquiries');
    }
};
