<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PrivateLesson\UpdatePrivateLessonInquiryRequest;
use App\Http\Resources\PrivateLessonInquiryResource;
use App\Models\PrivateLessonInquiry;
use App\Services\PrivateLessonInquiryService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PrivateLessonInquiryController extends Controller
{
    public function __construct(
        private readonly PrivateLessonInquiryService $inquiryService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return PrivateLessonInquiryResource::collection(
            $this->inquiryService->list($request)
        );
    }

    public function show(PrivateLessonInquiry $privateLessonInquiry): PrivateLessonInquiryResource
    {
        return new PrivateLessonInquiryResource(
            $privateLessonInquiry->load(['grade', 'subject', 'reviewer'])
        );
    }

    public function update(
        UpdatePrivateLessonInquiryRequest $request,
        PrivateLessonInquiry $privateLessonInquiry,
    ): PrivateLessonInquiryResource {
        return new PrivateLessonInquiryResource(
            $this->inquiryService->update(
                $privateLessonInquiry,
                $request->validated(),
                $request->user(),
            )
        );
    }
}
