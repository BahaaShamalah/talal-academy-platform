<?php

namespace App\Services;

use App\Models\EducationalMaterial;
use App\Models\Guardian;
use App\Models\InstituteSetting;
use App\Models\MarketingSection;
use App\Models\Media;
use App\Models\PrivateLessonOffer;
use App\Models\Product;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;
use Throwable;

class MediaService
{
    private const MARKETING_IMAGE_KEYS = [
        'background_image',
        'symbol_logo',
        'image',
        'src',
    ];

    public function preferredFormat(): string
    {
        $override = config('media.output_format');
        if (in_array($override, ['avif', 'webp'], true)) {
            return $override;
        }

        static $detected = null;
        if ($detected !== null) {
            return $detected;
        }

        $manager = new ImageManager(new Driver);
        $probe = $manager->create(8, 8)->fill('000000');

        try {
            $encoded = (string) $probe->toAvif(80);
            if ($encoded !== '') {
                return $detected = 'avif';
            }
        } catch (Throwable) {
            // fall through to webp
        }

        try {
            $encoded = (string) $probe->toWebp(80);
            if ($encoded !== '') {
                return $detected = 'webp';
            }
        } catch (Throwable $e) {
            throw ValidationException::withMessages([
                'file' => ['تعذر ترميز الصور على هذا السيرفر (لا AVIF ولا WebP).'],
            ]);
        }

        throw ValidationException::withMessages([
            'file' => ['تعذر ترميز الصور على هذا السيرفر (لا AVIF ولا WebP).'],
        ]);
    }

    public function store(
        UploadedFile $file,
        ?string $altText = null,
        ?int $uploadedBy = null,
        ?string $forceFormat = null,
    ): Media {
        $this->assertValidImage($file);

        $format = $this->resolveOutputFormat($forceFormat);
        $quality = (int) config('media.quality', 80);
        $disk = (string) config('media.disk', 'public');
        $directory = trim((string) config('media.directory', 'media'), '/');
        $uuid = (string) Str::uuid();
        $extension = $format === 'jpeg' ? 'jpg' : $format;
        $relativePath = $directory.'/'.$uuid.'.'.$extension;

        $manager = new ImageManager(new Driver);
        $image = $manager->read($file->getRealPath());

        $encoded = match ($format) {
            'avif' => $image->toAvif($quality),
            'webp' => $image->toWebp($quality),
            'jpeg' => $image->toJpeg($quality),
            default => throw ValidationException::withMessages([
                'file' => ['صيغة الإخراج غير مدعومة.'],
            ]),
        };

        $binary = (string) $encoded;
        Storage::disk($disk)->put($relativePath, $binary);

        $mimeType = match ($format) {
            'avif' => 'image/avif',
            'webp' => 'image/webp',
            'jpeg' => 'image/jpeg',
        };

        $media = Media::query()->create([
            'uuid' => $uuid,
            'original_filename' => $file->getClientOriginalName(),
            'disk' => $disk,
            'path' => $relativePath,
            'mime_type' => $mimeType,
            'width' => $image->width(),
            'height' => $image->height(),
            'size_bytes' => strlen($binary),
            'alt_text' => $altText,
            'uploaded_by' => $uploadedBy,
            'created_at' => now(),
        ]);

        $media->forceFill([
            'original_filename' => $this->studioDisplayName($media),
        ])->save();

        return $media->refresh();
    }

    /**
     * @param  'avif'|'webp'|'jpeg'|null  $forceFormat
     */
    public function resolveOutputFormat(?string $forceFormat = null): string
    {
        if ($forceFormat !== null && $forceFormat !== '') {
            if (! in_array($forceFormat, ['avif', 'webp', 'jpeg'], true)) {
                throw ValidationException::withMessages([
                    'force_format' => ['الصيغة المسموحة: avif أو webp أو jpeg.'],
                ]);
            }

            return $forceFormat;
        }

        return $this->preferredFormat();
    }

    /** Unified studio name: ta-00001-26 (prefix + zero-padded id + 2-digit year). */
    public function studioDisplayName(Media $media): string
    {
        $year = $media->created_at?->format('y') ?? now()->format('y');

        return sprintf('ta-%05d-%s', $media->id, $year);
    }

    /**
     * @return LengthAwarePaginator<int, Media>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(Media::class)
            ->allowedFilters(
                AllowedFilter::exact('mime_type'),
            )
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 24))
            ->appends($request->query());
    }

    /**
     * @return list<string>
     */
    public function usageLabels(Media $media): array
    {
        $labels = [];

        $settings = InstituteSetting::query()->where('id', 1)->first();
        if ($settings?->logo_media_id === $media->id) {
            $labels[] = 'شعار المعهد (إعدادات المعهد)';
        }
        if ($settings?->stamp_media_id === $media->id) {
            $labels[] = 'ختم المعهد (إعدادات المعهد)';
        }
        if ($settings?->favicon_media_id === $media->id) {
            $labels[] = 'أيقونة الموقع Favicon (إعدادات السيو)';
        }
        if ($settings?->og_image_media_id === $media->id) {
            $labels[] = 'صورة معاينة المشاركة (إعدادات السيو)';
        }

        $products = Product::query()
            ->where('image_media_id', $media->id)
            ->pluck('name');
        foreach ($products as $name) {
            $labels[] = 'منتج: '.$name;
        }

        $offers = PrivateLessonOffer::query()
            ->where('image_media_id', $media->id)
            ->with(['subject:id,name', 'grade:id,name'])
            ->get();
        foreach ($offers as $offer) {
            $labels[] = 'عرض حصة خاصة: '.($offer->subject?->name ?? '#').' — '.($offer->grade?->name ?? '#');
        }

        foreach (MarketingSection::query()->get(['section_key', 'content']) as $section) {
            if ($this->contentUsesMediaId($section->content ?? [], $media->id)) {
                $labels[] = 'قسم تسويقي: '.$section->section_key;
            }
        }

        $materials = EducationalMaterial::query()
            ->where('media_id', $media->id)
            ->pluck('title');
        foreach ($materials as $title) {
            $labels[] = 'مادة تعليمية: '.$title;
        }

        $guardians = Guardian::query()
            ->where('avatar_media_id', $media->id)
            ->pluck('full_name');
        foreach ($guardians as $name) {
            $labels[] = 'صورة ولي الأمر: '.($name ?: '#');
        }

        return $labels;
    }

    public function delete(Media $media): void
    {
        $labels = $this->usageLabels($media);
        if ($labels !== []) {
            throw ValidationException::withMessages([
                'media' => ['لا يمكن حذف هذه الوسائط لأنها مستخدمة في: '.implode('، ', $labels)],
            ]);
        }

        Storage::disk($media->disk)->delete($media->path);
        $media->delete();
    }

    public function deleteIfOrphan(?int $mediaId): void
    {
        if (! $mediaId) {
            return;
        }

        $media = Media::query()->find($mediaId);
        if (! $media) {
            return;
        }

        if ($this->usageLabels($media) === []) {
            Storage::disk($media->disk)->delete($media->path);
            $media->delete();
        }
    }

    private function assertValidImage(UploadedFile $file): void
    {
        $max = (int) config('media.max_upload_bytes', 10 * 1024 * 1024);
        if ($file->getSize() > $max) {
            throw ValidationException::withMessages([
                'file' => ['حجم الصورة أكبر من المسموح (الحد الأقصى 10 ميغابايت).'],
            ]);
        }

        $ext = strtolower($file->getClientOriginalExtension() ?: '');
        $allowedExt = config('media.allowed_extensions', []);
        if (! in_array($ext, $allowedExt, true)) {
            throw ValidationException::withMessages([
                'file' => ['يُسمح فقط بصور JPG أو PNG أو WebP أو GIF.'],
            ]);
        }

        $mime = (string) ($file->getMimeType() ?: '');
        $allowedMimes = config('media.allowed_mimes', []);
        if (! in_array($mime, $allowedMimes, true)) {
            throw ValidationException::withMessages([
                'file' => ['الملف المرفوع ليس صورة صالحة.'],
            ]);
        }

        if (@getimagesize($file->getRealPath()) === false) {
            throw ValidationException::withMessages([
                'file' => ['الملف المرفوع ليس صورة صالحة.'],
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $content
     */
    private function contentUsesMediaId(array $content, int $mediaId): bool
    {
        $walker = function (mixed $value) use (&$walker, $mediaId): bool {
            if (is_int($value) || (is_string($value) && ctype_digit($value))) {
                return (int) $value === $mediaId;
            }
            if (! is_array($value)) {
                return false;
            }
            foreach ($value as $k => $v) {
                if (in_array($k, self::MARKETING_IMAGE_KEYS, true)) {
                    if (is_int($v) || (is_string($v) && ctype_digit($v))) {
                        if ((int) $v === $mediaId) {
                            return true;
                        }
                    }
                }
                if ($walker($v)) {
                    return true;
                }
            }

            return false;
        };

        return $walker($content);
    }
}
