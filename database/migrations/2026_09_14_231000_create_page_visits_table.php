<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('page_visits', function (Blueprint $table) {
            $table->id();
            $table->string('path', 500);
            $table->string('referrer', 1000)->nullable();
            $table->string('utm_source', 100)->nullable();
            $table->string('utm_medium', 100)->nullable();
            $table->string('utm_campaign', 150)->nullable();
            $table->string('ip_hash', 64);
            $table->string('country_code', 2)->nullable();
            $table->string('device_type', 20);
            $table->boolean('is_bot')->default(false);
            $table->timestamp('visited_at');

            $table->index(['visited_at', 'is_bot']);
            $table->index(['path', 'visited_at']);
            $table->index(['ip_hash', 'visited_at']);
            $table->index(['country_code', 'visited_at']);
            $table->index(['device_type', 'visited_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('page_visits');
    }
};
