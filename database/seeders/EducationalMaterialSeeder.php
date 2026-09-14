<?php

namespace Database\Seeders;

use App\Enums\EducationalMaterialScope;
use App\Models\EducationalMaterial;
use App\Models\Grade;
use App\Models\ClassOffering;
use App\Models\Media;
use App\Models\Student;
use App\Models\Subject;
use App\Models\User;
use App\Services\AcademicPeriodService;
use App\Services\EducationalMaterialService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class EducationalMaterialSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->where('email', 'admin@example.com')->firstOrFail();
        $ahmed = Student::query()->where('full_name', 'أحمد محمد')->firstOrFail();
        $offering = ClassOffering::query()->with('grade')->orderBy('id')->firstOrFail();
        $grade = Grade::query()->where('id', $offering->grade_id)->firstOrFail();
        $subject = Subject::query()->findOrFail($offering->subject_id);

        /** @var AcademicPeriodService $periodService */
        $periodService = app(AcademicPeriodService::class);
        $period = $periodService->currentActive();

        if (! $period) {
            return;
        }

        $disk = (string) config('media.disk', 'public');
        $directory = trim((string) config('media.directory', 'media'), '/');
        $uuid = (string) Str::uuid();
        $relativePath = $directory.'/'.$uuid.'.pdf';
        $pdfContent = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF";

        Storage::disk($disk)->put($relativePath, $pdfContent);

        $media = Media::query()->create([
            'uuid' => $uuid,
            'original_filename' => 'memo-math-grade7.pdf',
            'disk' => $disk,
            'path' => $relativePath,
            'mime_type' => 'application/pdf',
            'width' => null,
            'height' => null,
            'size_bytes' => strlen($pdfContent),
            'alt_text' => 'مذكرة رياضيات تجريبية',
            'uploaded_by' => $admin->id,
            'created_at' => now(),
        ]);

        EducationalMaterial::query()->create([
            'title' => 'مذكرة رياضيات — الفصل الأول',
            'description' => 'مذكرة PDF عامة لطلاب الصف السابع في مادة الرياضيات.',
            'media_id' => $media->id,
            'scope' => EducationalMaterialScope::General,
            'grade_id' => $grade->id,
            'subject_id' => $subject->id,
            'student_id' => null,
            'class_offering_id' => null,
            'period_id' => $period->id,
            'uploaded_by' => $admin->id,
        ]);

        EducationalMaterial::query()->create([
            'title' => 'ملخص خاص — أحمد محمد',
            'description' => 'مادة تعليمية خاصة موجهة لأحمد محمد فقط.',
            'media_id' => $media->id,
            'scope' => EducationalMaterialScope::Targeted,
            'grade_id' => $grade->id,
            'subject_id' => $subject->id,
            'student_id' => $ahmed->id,
            'class_offering_id' => $offering->id,
            'period_id' => $period->id,
            'uploaded_by' => $admin->id,
        ]);

        /** @var EducationalMaterialService $service */
        $service = app(EducationalMaterialService::class);

        $sara = Student::query()->where('full_name', 'سارة محمد')->firstOrFail();
        $ahmedMaterials = $service->getVisibleMaterials($ahmed, $period->id);
        $saraMaterials = $service->getVisibleMaterials($sara, $period->id);

        if ($ahmedMaterials->count() !== 2) {
            throw new \RuntimeException('Seeder check failed: أحمد يجب أن يرى مادتين، رُصد '.$ahmedMaterials->count());
        }

        if ($saraMaterials->count() !== 1 || $saraMaterials->first()?->scope !== EducationalMaterialScope::General) {
            throw new \RuntimeException('Seeder check failed: سارة يجب أن ترى المادة العامة فقط');
        }
    }
}
