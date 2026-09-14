<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Contact\UpdateContactMessageRequest;
use App\Http\Resources\ContactMessageResource;
use App\Models\ContactMessage;
use App\Services\ContactMessageService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ContactMessageController extends Controller
{
    public function __construct(
        private readonly ContactMessageService $contactMessageService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return ContactMessageResource::collection(
            $this->contactMessageService->list($request)
        );
    }

    public function show(ContactMessage $contactMessage): ContactMessageResource
    {
        return new ContactMessageResource(
            $contactMessage->load(['educationalStage', 'reviewer'])
        );
    }

    public function update(
        UpdateContactMessageRequest $request,
        ContactMessage $contactMessage,
    ): ContactMessageResource {
        return new ContactMessageResource(
            $this->contactMessageService->update(
                $contactMessage,
                $request->validated(),
                $request->user(),
            )
        );
    }
}
