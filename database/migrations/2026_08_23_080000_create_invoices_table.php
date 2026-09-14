<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number')->unique();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('period_id')->nullable()->constrained('academic_periods')->nullOnDelete();
            $table->foreignId('coupon_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status')->default('pending');
            $table->decimal('subtotal', 10, 3);
            $table->decimal('coupon_discount_amount', 10, 3)->default(0);
            $table->decimal('family_discount_percentage', 5, 2)->nullable();
            $table->decimal('family_discount_amount', 10, 3)->default(0);
            $table->decimal('credit_applied_amount', 10, 3)->default(0);
            $table->decimal('total', 10, 3);
            $table->string('payment_method')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
