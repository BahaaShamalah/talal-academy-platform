<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('private_lesson_offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('grade_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedSmallInteger('duration_minutes');
            $table->string('session_type');
            $table->decimal('price', 10, 2);
            $table->unsignedSmallInteger('max_students')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();
        });

        Schema::create('private_lesson_slots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('private_lesson_offer_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week')->nullable();
            $table->date('specific_date')->nullable();
            $table->time('start_time');
            $table->time('end_time');
            $table->unsignedSmallInteger('capacity')->default(1);
            $table->timestamps();
        });

        Schema::create('private_lesson_bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('private_lesson_slot_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('private_lesson_offer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('invoice_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status')->default('pending_coordination');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('private_lesson_bookings');
        Schema::dropIfExists('private_lesson_slots');
        Schema::dropIfExists('private_lesson_offers');
    }
};
