<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('institute_settings', function (Blueprint $table) {
            $table->id();
            $table->string('institute_name_ar');
            $table->string('institute_name_en')->nullable();
            $table->foreignId('logo_media_id')->nullable()->constrained('media')->nullOnDelete();
            $table->foreignId('stamp_media_id')->nullable()->constrained('media')->nullOnDelete();
            $table->string('address')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('commercial_registration_number')->nullable();
            $table->text('invoice_footer_note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('institute_settings');
    }
};
