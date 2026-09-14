<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('class_offerings', function (Blueprint $table) {
            $table->string('gender')->nullable()->after('period_id');
        });
    }

    public function down(): void
    {
        Schema::table('class_offerings', function (Blueprint $table) {
            $table->dropColumn('gender');
        });
    }
};
