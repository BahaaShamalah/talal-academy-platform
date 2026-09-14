<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('civil_id')->nullable()->unique();
            $table->date('date_of_birth')->nullable();
            $table->string('nationality')->nullable();
            $table->string('address')->nullable();
            $table->string('job_title')->nullable();
            $table->string('specialization')->nullable();
            $table->date('contract_start_date')->nullable();
            $table->date('contract_end_date')->nullable();
            $table->string('contract_type')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('staff_subjects', function (Blueprint $table) {
            $table->foreignId('staff_profile_id')->constrained('staff_profiles')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->primary(['staff_profile_id', 'subject_id']);
        });

        Schema::create('staff_grades', function (Blueprint $table) {
            $table->foreignId('staff_profile_id')->constrained('staff_profiles')->cascadeOnDelete();
            $table->foreignId('grade_id')->constrained()->cascadeOnDelete();
            $table->primary(['staff_profile_id', 'grade_id']);
        });

        Schema::create('staff_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_profile_id')->constrained('staff_profiles')->cascadeOnDelete();
            $table->foreignId('media_id')->constrained('media')->restrictOnDelete();
            $table->string('document_type');
            $table->timestamp('uploaded_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_documents');
        Schema::dropIfExists('staff_grades');
        Schema::dropIfExists('staff_subjects');
        Schema::dropIfExists('staff_profiles');
    }
};
