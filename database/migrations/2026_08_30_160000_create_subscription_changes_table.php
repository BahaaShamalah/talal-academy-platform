<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_changes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_plan_subscription_id')
                ->constrained('student_plan_subscriptions')
                ->cascadeOnDelete();
            $table->string('change_type');
            $table->foreignId('old_plan_id')->nullable()->constrained('plans')->nullOnDelete();
            $table->foreignId('new_plan_id')->nullable()->constrained('plans')->nullOnDelete();
            $table->foreignId('subject_id')->nullable()->constrained('subjects')->nullOnDelete();
            $table->decimal('calculated_amount_difference', 12, 3);
            $table->decimal('final_amount_difference', 12, 3);
            $table->foreignId('supplementary_invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
            $table->foreignId('credit_transaction_id')->nullable()->constrained('credit_transactions')->nullOnDelete();
            $table->text('reason');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_changes');
    }
};
