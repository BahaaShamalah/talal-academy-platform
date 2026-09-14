<?php

namespace App\Http\Resources;

use App\Models\PrivateLessonBooking;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PrivateLessonBooking */
class PrivateLessonBookingResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'private_lesson_slot_id' => $this->private_lesson_slot_id,
            'private_lesson_offer_id' => $this->private_lesson_offer_id,
            'student_id' => $this->student_id,
            'invoice_id' => $this->invoice_id,
            'status' => $this->status?->value,
            'preferred_period_name' => $this->preferred_period_name,
            'preferred_start_time' => $this->preferred_start_time
                ? substr((string) $this->preferred_start_time, 0, 5)
                : null,
            'preferred_end_time' => $this->preferred_end_time
                ? substr((string) $this->preferred_end_time, 0, 5)
                : null,
            'offer' => new PrivateLessonOfferResource($this->whenLoaded('offer')),
            'slot' => new PrivateLessonSlotResource($this->whenLoaded('slot')),
            'invoice' => new InvoiceResource($this->whenLoaded('invoice')),
            'student' => $this->whenLoaded('student', function () {
                $guardian = $this->student->relationLoaded('guardian') ? $this->student->guardian : null;
                $guardianPhone = $guardian?->phone ?: $guardian?->phone_secondary;
                $contactPhone = $guardianPhone ?: ($this->student->phone ?: $this->student->phone_secondary);

                return [
                    'id' => $this->student->id,
                    'full_name' => $this->student->full_name,
                    'file_number' => $this->student->file_number,
                    'phone' => $this->student->phone,
                    'guardian' => $guardian ? [
                        'id' => $guardian->id,
                        'full_name' => $guardian->full_name,
                        'phone' => $guardian->phone,
                        'phone_secondary' => $guardian->phone_secondary,
                    ] : null,
                    'contact_phone' => $contactPhone,
                ];
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
