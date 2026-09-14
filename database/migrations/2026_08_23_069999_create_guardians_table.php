<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guardians', function (Blueprint $table) {
            $table->id();
            $table->string('full_name')->nullable();
            $table->string('civil_id')->nullable()->unique();
            $table->string('phone')->unique();
            $table->string('phone_secondary')->nullable();
            $table->string('email')->nullable();
            $table->string('password')->nullable();
            $table->string('relationship');
            $table->text('address')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guardians');
    }
};
