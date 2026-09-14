<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grade_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('grade_id')->constrained()->restrictOnDelete();
            $table->foreignId('period_id')->nullable()->constrained('academic_periods')->nullOnDelete();
            $table->string('name');
            $table->string('gender')->nullable();
            $table->unsignedInteger('capacity')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();

            $table->unique(['grade_id', 'period_id', 'name', 'gender'], 'grade_sections_grade_period_name_gender_unique');
        });

        Schema::table('class_offerings', function (Blueprint $table) {
            $table->foreignId('grade_section_id')
                ->nullable()
                ->after('grade_id')
                ->constrained('grade_sections')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('class_offerings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('grade_section_id');
        });

        Schema::dropIfExists('grade_sections');
    }
};
