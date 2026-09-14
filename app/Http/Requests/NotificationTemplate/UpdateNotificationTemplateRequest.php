<?php

namespace App\Http\Requests\NotificationTemplate;

use App\Enums\NotificationChannel;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateNotificationTemplateRequest extends FormRequest
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
            'event_key' => ['sometimes', 'string', 'max:100'],
            'name_ar' => ['sometimes', 'string', 'max:255'],
            'channel' => ['sometimes', Rule::enum(NotificationChannel::class)],
            'subject' => ['nullable', 'string', 'max:255'],
            'body_template' => ['sometimes', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
