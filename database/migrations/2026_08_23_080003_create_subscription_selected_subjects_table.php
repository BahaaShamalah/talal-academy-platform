<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_selected_subjects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_plan_subscription_id')
                ->constrained('student_plan_subscriptions')
                ->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->restrictOnDelete();
            $table->timestamps();

            $table->unique(
                ['student_plan_subscription_id', 'subject_id'],
                'subscription_selected_subjects_unique',
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_selected_subjects');
    }
};
