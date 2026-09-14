<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('private_lesson_offers', function (Blueprint $table) {
            $table->foreignId('image_media_id')
                ->nullable()
                ->after('status')
                ->constrained('media')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('private_lesson_offers', function (Blueprint $table) {
            $table->dropConstrainedForeignId('image_media_id');
        });
    }
};
