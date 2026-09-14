<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('installment_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedTinyInteger('number_of_installments');
            $table->json('split_percentages');
            $table->json('due_offset_days');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('installment_templates');
    }
};
