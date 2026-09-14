<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_run_id')->constrained()->cascadeOnDelete();
            $table->foreignId('teacher_id')->constrained('users')->restrictOnDelete();
            $table->string('compensation_type');
            $table->unsignedInteger('sessions_count')->nullable();
            $table->decimal('base_amount', 10, 3)->nullable();
            $table->decimal('deductions', 10, 3)->default(0);
            $table->decimal('bonus', 10, 3)->default(0);
            $table->decimal('net_amount', 10, 3)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['payroll_run_id', 'teacher_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_items');
    }
};
