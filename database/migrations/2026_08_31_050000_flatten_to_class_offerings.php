<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Flatten course_groups + group_subjects → class_offerings (preserve IDs & data).
 */
return new class extends Migration
{
    /** @var list<string> */
    private array $requiredChildTables = [
        'class_schedules',
        'class_sessions',
        'enrollments',
        'evaluations',
        'exams',
        'absence_alerts',
    ];

    public function up(): void
    {
        Schema::create('class_offerings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('grade_id')->constrained('grades')->restrictOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->restrictOnDelete();
            $table->foreignId('teacher_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('hall_id')->constrained('halls')->restrictOnDelete();
            $table->foreignId('period_id')->nullable()->constrained('academic_periods')->nullOnDelete();
            $table->string('status')->default('active');
            $table->timestamps();
        });

        // Preserve group_subjects.id → class_offerings.id for 1:1 FK remaps.
        DB::statement('
            INSERT INTO class_offerings (id, grade_id, subject_id, teacher_id, hall_id, period_id, status, created_at, updated_at)
            SELECT
                gs.id,
                cg.grade_id,
                gs.subject_id,
                gs.teacher_id,
                gs.hall_id,
                cg.period_id,
                gs.status,
                gs.created_at,
                gs.updated_at
            FROM group_subjects gs
            INNER JOIN course_groups cg ON cg.id = gs.course_group_id
        ');

        $gsCount = (int) DB::table('group_subjects')->count();
        $coCount = (int) DB::table('class_offerings')->count();
        if ($gsCount !== $coCount) {
            throw new RuntimeException("class_offerings copy mismatch: group_subjects={$gsCount} class_offerings={$coCount}");
        }

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("SELECT setval(pg_get_serial_sequence('class_offerings', 'id'), COALESCE((SELECT MAX(id) FROM class_offerings), 1))");
        }

        foreach ($this->requiredChildTables as $table) {
            $this->remapRequiredForeignKey($table);
        }

        $this->remapNullableForeignKey('educational_materials');

        // Recreate unique after group_subject_id column drop (PG drops dependent indexes with column).
        Schema::table('class_sessions', function (Blueprint $table) {
            $table->unique(
                ['class_offering_id', 'session_date', 'class_schedule_id'],
                'class_sessions_offering_date_schedule_unique'
            );
        });

        Schema::dropIfExists('group_subjects');
        Schema::dropIfExists('course_groups');
    }

    private function remapRequiredForeignKey(string $table): void
    {
        Schema::table($table, function (Blueprint $blueprint) {
            $blueprint->unsignedBigInteger('class_offering_id')->nullable();
        });

        DB::table($table)->update([
            'class_offering_id' => DB::raw('group_subject_id'),
        ]);

        $missing = (int) DB::table($table)->whereNull('class_offering_id')->count();
        if ($missing > 0) {
            throw new RuntimeException("{$table}: {$missing} rows missing class_offering_id after remap");
        }

        $before = (int) DB::table($table)->count();

        Schema::table($table, function (Blueprint $blueprint) {
            $blueprint->dropConstrainedForeignId('group_subject_id');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE {$table} ALTER COLUMN class_offering_id SET NOT NULL");
        }

        Schema::table($table, function (Blueprint $blueprint) {
            $blueprint->foreign('class_offering_id')
                ->references('id')
                ->on('class_offerings')
                ->restrictOnDelete();
        });

        $after = (int) DB::table($table)->count();
        if ($before !== $after) {
            throw new RuntimeException("{$table}: row count changed during remap ({$before} → {$after})");
        }
    }

    private function remapNullableForeignKey(string $table): void
    {
        Schema::table($table, function (Blueprint $blueprint) {
            $blueprint->unsignedBigInteger('class_offering_id')->nullable();
        });

        DB::table($table)->whereNotNull('group_subject_id')->update([
            'class_offering_id' => DB::raw('group_subject_id'),
        ]);

        Schema::table($table, function (Blueprint $blueprint) {
            $blueprint->dropConstrainedForeignId('group_subject_id');
        });

        Schema::table($table, function (Blueprint $blueprint) {
            $blueprint->foreign('class_offering_id')
                ->references('id')
                ->on('class_offerings')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        throw new RuntimeException('This migration cannot be reversed safely.');
    }
};
