<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Contact\StorePublicContactMessageRequest;
use App\Http\Resources\ContactMessageResource;
use App\Services\ContactMessageService;
use Illuminate\Http\JsonResponse;

class PublicContactMessageController extends Controller
{
    public function __construct(
        private readonly ContactMessageService $contactMessageService,
    ) {}

    public function store(StorePublicContactMessageRequest $request): JsonResponse
    {
        $message = $this->contactMessageService->create($request->validated());

        return (new ContactMessageResource($message))
            ->response()
            ->setStatusCode(201);
    }
}
