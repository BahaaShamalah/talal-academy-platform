<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('has_all_branch_access')->default(false)->after('is_teaching_staff');
        });

        Schema::create('user_branches', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->primary(['user_id', 'branch_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_branches');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('has_all_branch_access');
        });
    }
};
