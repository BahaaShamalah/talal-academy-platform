<?php

namespace App\Services;

use App\Models\NotificationTemplate;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class NotificationTemplateService
{
    /**
     * @return LengthAwarePaginator<int, NotificationTemplate>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(NotificationTemplate::class)
            ->allowedFilters(
                AllowedFilter::exact('event_key'),
                AllowedFilter::exact('channel'),
                AllowedFilter::exact('is_active'),
            )
            ->defaultSort('event_key')
            ->paginate($request->integer('per_page', 50))
            ->appends($request->query());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): NotificationTemplate
    {
        $this->assertUniqueEventChannel($data['event_key'], $data['channel']);

        return NotificationTemplate::query()->create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(NotificationTemplate $template, array $data): NotificationTemplate
    {
        $eventKey = $data['event_key'] ?? $template->event_key;
        $channel = $data['channel'] ?? $template->channel->value;

        $this->assertUniqueEventChannel($eventKey, $channel, $template->id);

        $template->update($data);

        return $template->refresh();
    }

    public function delete(NotificationTemplate $template): void
    {
        $template->delete();
    }

    private function assertUniqueEventChannel(string $eventKey, string $channel, ?int $ignoreId = null): void
    {
        $query = NotificationTemplate::query()
            ->where('event_key', $eventKey)
            ->where('channel', $channel);

        if ($ignoreId !== null) {
            $query->where('id', '!=', $ignoreId);
        }

        if ($query->exists()) {
            throw ValidationException::withMessages([
                'event_key' => ['يوجد قالب بنفس الحدث والقناة مسبقاً.'],
            ]);
        }
    }
}
