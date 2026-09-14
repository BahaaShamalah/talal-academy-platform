<?php

namespace Database\Seeders;

use App\Models\LeaveType;
use App\Models\StaffProfile;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Database\Seeder;

class LeaveTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            ['name' => 'سنوية', 'default_annual_balance' => 30],
            ['name' => 'مرضية', 'default_annual_balance' => 15],
            ['name' => 'طارئة', 'default_annual_balance' => 5],
        ];

        foreach ($types as $type) {
            LeaveType::query()->firstOrCreate(
                ['name' => $type['name']],
                ['default_annual_balance' => $type['default_annual_balance']],
            );
        }

        $math = Subject::query()->where('name', 'رياضيات')->first();
        if (! $math) {
            return;
        }

        foreach (['teacher@example.com', 'teacher2@example.com'] as $email) {
            $teacher = User::query()->where('email', $email)->first();
            if (! $teacher) {
                continue;
            }

            $profile = StaffProfile::query()->firstOrCreate(['user_id' => $teacher->id]);
            $profile->subjects()->syncWithoutDetaching([$math->id]);
        }
    }
}
