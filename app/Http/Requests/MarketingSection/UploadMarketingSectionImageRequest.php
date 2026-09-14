<?php

namespace App\Http\Requests\MarketingSection;

use Illuminate\Foundation\Http\FormRequest;

class UploadMarketingSectionImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'path' => ['required', 'string', 'max:255'],
            'file' => ['nullable', 'required_without:media_id', 'image', 'max:10240'],
            'media_id' => ['nullable', 'required_without:file', 'integer', 'exists:media,id'],
        ];
    }
}
