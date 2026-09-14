<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_freezes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_plan_subscription_id')
                ->constrained('student_plan_subscriptions')
                ->cascadeOnDelete();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->text('reason');
            $table->boolean('pauses_installments')->default(false);
            $table->boolean('pauses_attendance_expectation')->default(false);
            $table->boolean('extends_subscription')->default(false);
            $table->string('previous_status');
            $table->string('status')->default('active');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_freezes');
    }
};
