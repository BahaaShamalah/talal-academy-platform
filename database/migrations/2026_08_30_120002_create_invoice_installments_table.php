<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_installments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('sequence');
            $table->decimal('amount', 12, 3);
            $table->date('due_date');
            $table->string('status')->default('pending');
            $table->timestamp('paid_at')->nullable();
            $table->string('payment_method')->nullable();
            $table->timestamps();

            $table->unique(['invoice_id', 'sequence']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_installments');
    }
};
