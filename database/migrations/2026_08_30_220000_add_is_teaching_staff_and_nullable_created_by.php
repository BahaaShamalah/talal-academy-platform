<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_teaching_staff')->default(false)->after('phone');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->unsignedBigInteger('created_by')->nullable()->change();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });

        Schema::table('enrollments', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
        });

        Schema::table('enrollments', function (Blueprint $table) {
            $table->unsignedBigInteger('created_by')->nullable()->change();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
        });

        Schema::table('enrollments', function (Blueprint $table) {
            $table->unsignedBigInteger('created_by')->nullable(false)->change();
            $table->foreign('created_by')->references('id')->on('users')->restrictOnDelete();
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->unsignedBigInteger('created_by')->nullable(false)->change();
            $table->foreign('created_by')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_teaching_staff');
        });
    }
};
