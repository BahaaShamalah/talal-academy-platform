<?php

namespace App\Http\Requests\Order;

use App\Enums\FulfillmentType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOrderRequest extends FormRequest
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
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'fulfillment_type' => ['required', Rule::enum(FulfillmentType::class)],
            'delivery_zone_id' => ['nullable', 'integer', 'exists:delivery_zones,id'],
            'delivery_address' => ['nullable', 'string', 'max:2000'],
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
        ];
    }
}
