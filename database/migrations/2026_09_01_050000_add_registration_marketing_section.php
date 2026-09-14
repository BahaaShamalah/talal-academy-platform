<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Ensure marketing section "registration" exists for onboarding aside image & copy.
 */
return new class extends Migration
{
    public function up(): void
    {
        $exists = DB::table('marketing_sections')
            ->where('section_key', 'registration')
            ->exists();

        if ($exists) {
            return;
        }

        $maxOrder = (int) DB::table('marketing_sections')->max('display_order');

        DB::table('marketing_sections')->insert([
            'section_key' => 'registration',
            'display_order' => $maxOrder + 1,
            'is_active' => true,
            'content' => json_encode([
                'guide_name' => 'سارة',
                'guide_role' => 'مرشدة التسجيل',
                'aside_image' => null,
                'mascot_lines' => [
                    'أهلاً! أنا سارة. لنبدأ — أي مرحلة دراسية يدرس فيها ابنك؟',
                    'جميل. الآن حدّد صفه بالتحديد.',
                    'ممتاز! اختر الباقة المناسبة لابنك — السعر يظهر فورًا.',
                    'نحتاج التحقق من رقمك لنبقيك على اطّلاع بتقدّم ابنك.',
                    'بيانات الطالب تساعد المعلمين على متابعته من اليوم الأول.',
                    'اختر طريقة الدفع الأنسب لك — كامل، تقسيط، أو في المعهد.',
                    'تم! أهلاً بابنك في طلال أكاديمي. سنتواصل معك قريبًا.',
                ],
                'step_labels' => [
                    'اختر المرحلة',
                    'اختر الصف',
                    'اختر الباقة',
                    'بيانات ولي الأمر',
                    'بيانات الطالب',
                    'الدفع',
                    'تم التسجيل',
                ],
            ], JSON_UNESCAPED_UNICODE),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('marketing_sections')->where('section_key', 'registration')->delete();
    }
};
