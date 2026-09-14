<?php

use App\Enums\CompensationComponentType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_compensation_components', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('component_type');
            $table->decimal('amount', 10, 3);
            $table->boolean('is_active')->default(true);
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'is_active']);
            $table->index(['effective_from', 'effective_to']);
        });

        if (Schema::hasTable('teacher_compensation_settings')) {
            $rows = DB::table('teacher_compensation_settings')->get();
            $now = now();

            foreach ($rows as $row) {
                $type = $row->compensation_type;
                $amount = null;
                $componentType = null;

                if ($type === 'fixed_monthly' && $row->fixed_monthly_amount !== null) {
                    $componentType = CompensationComponentType::BaseSalary->value;
                    $amount = $row->fixed_monthly_amount;
                } elseif ($type === 'per_session' && $row->per_session_rate !== null) {
                    $componentType = CompensationComponentType::PerSessionRate->value;
                    $amount = $row->per_session_rate;
                }

                if ($componentType === null || $amount === null) {
                    continue;
                }

                DB::table('staff_compensation_components')->insert([
                    'user_id' => $row->teacher_id,
                    'component_type' => $componentType,
                    'amount' => $amount,
                    'is_active' => true,
                    'effective_from' => $row->created_at
                        ? date('Y-m-d', strtotime((string) $row->created_at))
                        : $now->toDateString(),
                    'effective_to' => null,
                    'created_at' => $row->created_at ?? $now,
                    'updated_at' => $row->updated_at ?? $now,
                ]);
            }

            Schema::dropIfExists('teacher_compensation_settings');
        }
    }

    public function down(): void
    {
        Schema::create('teacher_compensation_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('compensation_type');
            $table->decimal('fixed_monthly_amount', 10, 3)->nullable();
            $table->decimal('per_session_rate', 10, 3)->nullable();
            $table->timestamps();
        });

        Schema::dropIfExists('staff_compensation_components');
    }
};
