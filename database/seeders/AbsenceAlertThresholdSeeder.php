<?php

namespace Database\Seeders;

use App\Enums\AbsenceAlertLevel;
use App\Models\AbsenceAlertThreshold;
use Illuminate\Database\Seeder;

class AbsenceAlertThresholdSeeder extends Seeder
{
    public function run(): void
    {
        AbsenceAlertThreshold::query()->updateOrCreate(
            ['consecutive_absences_count' => 2],
            ['alert_level' => AbsenceAlertLevel::Notice, 'is_active' => true],
        );

        AbsenceAlertThreshold::query()->updateOrCreate(
            ['consecutive_absences_count' => 3],
            ['alert_level' => AbsenceAlertLevel::FollowUp, 'is_active' => true],
        );
    }
}
