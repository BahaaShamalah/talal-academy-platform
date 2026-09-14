<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->string('itemable_type')->nullable();
            $table->unsignedBigInteger('itemable_id')->nullable();
            $table->string('description');
            $table->decimal('unit_price', 10, 3);
            $table->unsignedInteger('quantity')->default(1);
            $table->decimal('line_total', 10, 3);
            $table->timestamps();

            $table->index(['itemable_type', 'itemable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_items');
    }
};
