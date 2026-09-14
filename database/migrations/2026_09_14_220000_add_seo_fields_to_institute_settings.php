<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('institute_settings', function (Blueprint $table) {
            $table->string('seo_title')->nullable()->after('director_name');
            $table->text('seo_description')->nullable()->after('seo_title');
            $table->foreignId('favicon_media_id')->nullable()->after('seo_description')->constrained('media')->nullOnDelete();
            $table->foreignId('og_image_media_id')->nullable()->after('favicon_media_id')->constrained('media')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('institute_settings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('favicon_media_id');
            $table->dropConstrainedForeignId('og_image_media_id');
            $table->dropColumn(['seo_title', 'seo_description']);
        });
    }
};
