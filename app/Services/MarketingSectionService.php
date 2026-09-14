<?php

namespace App\Services;

use App\Models\MarketingSection;
use App\Models\Media;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;

class MarketingSectionService
{
    public function __construct(
        private readonly MediaService $mediaService,
    ) {}

    /**
     * @return Collection<int, MarketingSection>
     */
    public function list(bool $activeOnly = false)
    {
        return MarketingSection::query()
            ->when($activeOnly, fn ($q) => $q->where('is_active', true))
            ->orderByRaw('display_order IS NULL')
            ->orderBy('display_order')
            ->orderBy('id')
            ->get();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): MarketingSection
    {
        return MarketingSection::query()->create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(MarketingSection $section, array $data): MarketingSection
    {
        $section->update($data);

        return $section->refresh();
    }

    public function delete(MarketingSection $section): void
    {
        $section->delete();
    }

    public function upload(MarketingSection $section, string $contentPath, UploadedFile $file): MarketingSection
    {
        $media = $this->mediaService->store($file, null, auth()->id());

        return $this->attachMedia($section, $contentPath, $media->id);
    }

    public function attachMedia(MarketingSection $section, string $contentPath, int $mediaId): MarketingSection
    {
        $content = $section->content ?? [];
        $previous = Arr::get($content, $contentPath);
        Arr::set($content, $contentPath, $mediaId);
        $section->update(['content' => $content]);

        if (is_int($previous) || (is_string($previous) && ctype_digit($previous))) {
            $prevId = (int) $previous;
            if ($prevId !== $mediaId) {
                $this->mediaService->deleteIfOrphan($prevId);
            }
        }

        return $section->refresh();
    }

    /**
     * Resolve stored media ids (or legacy path strings) to public URLs.
     *
     * @param  array<string, mixed>  $content
     * @return array<string, mixed>
     */
    public function resolveContentMedia(string $sectionKey, array $content): array
    {
        $ids = $this->collectMediaIds($content);
        $mediaById = $ids === []
            ? collect()
            : Media::query()->whereIn('id', $ids)->get()->keyBy('id');

        $resolve = function (mixed $value) use ($mediaById): mixed {
            if (is_int($value) || (is_string($value) && ctype_digit($value))) {
                $media = $mediaById->get((int) $value);

                return $media?->url();
            }

            if (! is_string($value) || $value === '') {
                return $value;
            }

            if (str_starts_with($value, 'http://') || str_starts_with($value, 'https://') || str_starts_with($value, '/assets/')) {
                return $value;
            }

            if (str_starts_with($value, '/storage/')) {
                return rtrim((string) config('app.url'), '/').$value;
            }

            return Storage::disk('public')->url($value);
        };

        return match ($sectionKey) {
            'hero' => [
                ...$content,
                'background_image' => $resolve($content['background_image'] ?? null),
                'symbol_logo' => $resolve($content['symbol_logo'] ?? null) ?? ($content['symbol_logo'] ?? null),
            ],
            'registration' => [
                ...$content,
                'aside_image' => $resolve($content['aside_image'] ?? null),
            ],
            'programs' => [
                ...$content,
                'stage_cards' => array_map(function (array $card) use ($resolve) {
                    $card['image'] = $resolve($card['image'] ?? null);

                    return $card;
                }, $content['stage_cards'] ?? []),
            ],
            'about' => [
                ...$content,
                'studio_items' => array_map(function (array $item) use ($resolve) {
                    $item['src'] = $resolve($item['src'] ?? null);

                    return $item;
                }, $content['studio_items'] ?? []),
            ],
            'private-lessons' => [
                ...$content,
                'default_card_image' => $resolve($content['default_card_image'] ?? null),
                'offer_cards' => array_map(function (array $card) use ($resolve) {
                    $card['image'] = $resolve($card['image'] ?? null);

                    return $card;
                }, $content['offer_cards'] ?? []),
            ],
            default => $content,
        };
    }

    /**
     * @param  array<string, mixed>  $content
     * @return list<int>
     */
    private function collectMediaIds(array $content): array
    {
        $ids = [];
        $walker = function (mixed $value, ?string $key = null) use (&$walker, &$ids): void {
            if (is_array($value)) {
                foreach ($value as $k => $v) {
                    $walker($v, is_string($k) ? $k : $key);
                }

                return;
            }

            if ($key !== null && in_array($key, ['background_image', 'symbol_logo', 'image', 'src', 'aside_image', 'default_card_image'], true)) {
                if (is_int($value) || (is_string($value) && ctype_digit($value))) {
                    $ids[] = (int) $value;
                }
            }
        };
        $walker($content);

        return array_values(array_unique($ids));
    }
}
