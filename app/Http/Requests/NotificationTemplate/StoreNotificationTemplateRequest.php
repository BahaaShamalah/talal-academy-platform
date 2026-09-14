<?php

namespace App\Http\Requests\NotificationTemplate;

use App\Enums\NotificationChannel;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreNotificationTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'event_key' => ['required', 'string', 'max:100'],
            'name_ar' => ['required', 'string', 'max:255'],
            'channel' => ['required', Rule::enum(NotificationChannel::class)],
            'subject' => ['nullable', 'string', 'max:255'],
            'body_template' => ['required', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
