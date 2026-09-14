<?php

namespace Database\Seeders;

use App\Enums\PrivateLessonOfferStatus;
use App\Enums\PrivateLessonSessionType;
use App\Models\Grade;
use App\Models\PrivateLessonOffer;
use App\Models\PrivateLessonSlot;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Database\Seeder;

class PrivateLessonSeeder extends Seeder
{
    public function run(): void
    {
        $grade = Grade::query()->orderBy('order')->first();
        $subject = Subject::query()->orderBy('id')->first();
        $teacher = User::query()->where('email', 'teacher@example.com')->first();

        if (! $grade || ! $subject || ! $teacher) {
            return;
        }

        $withSlot = PrivateLessonOffer::query()->create([
            'grade_id' => $grade->id,
            'subject_id' => $subject->id,
            'teacher_id' => $teacher->id,
            'duration_minutes' => 60,
            'session_type' => PrivateLessonSessionType::Individual,
            'price' => 25.000,
            'max_students' => null,
            'status' => PrivateLessonOfferStatus::Active,
        ]);

        PrivateLessonSlot::query()->create([
            'private_lesson_offer_id' => $withSlot->id,
            'day_of_week' => null,
            'specific_date' => now()->addDays(5)->toDateString(),
            'start_time' => '14:00',
            'end_time' => '15:00',
            'capacity' => 1,
        ]);

        PrivateLessonOffer::query()->create([
            'grade_id' => $grade->id,
            'subject_id' => $subject->id,
            'teacher_id' => $teacher->id,
            'duration_minutes' => 90,
            'session_type' => PrivateLessonSessionType::Group,
            'price' => 15.000,
            'max_students' => 4,
            'status' => PrivateLessonOfferStatus::Active,
        ]);
    }
}
