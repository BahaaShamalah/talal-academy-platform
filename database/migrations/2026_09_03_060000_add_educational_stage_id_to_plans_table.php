<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->foreignId('educational_stage_id')
                ->nullable()
                ->after('grade_id')
                ->constrained('educational_stages')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropConstrainedForeignId('educational_stage_id');
        });
    }
};
