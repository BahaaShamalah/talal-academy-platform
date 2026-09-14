<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\PrivateLesson\StorePublicPrivateLessonInquiryRequest;
use App\Http\Resources\PrivateLessonInquiryResource;
use App\Services\PrivateLessonInquiryService;
use Illuminate\Http\JsonResponse;

class PublicPrivateLessonInquiryController extends Controller
{
    public function __construct(
        private readonly PrivateLessonInquiryService $inquiryService,
    ) {}

    public function store(StorePublicPrivateLessonInquiryRequest $request): JsonResponse
    {
        $inquiry = $this->inquiryService->create($request->validated());

        return (new PrivateLessonInquiryResource($inquiry))
            ->response()
            ->setStatusCode(201);
    }
}
