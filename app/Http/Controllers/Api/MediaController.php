<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Media\StoreMediaRequest;
use App\Http\Requests\Media\UpdateMediaRequest;
use App\Http\Resources\MediaResource;
use App\Models\Media;
use App\Services\MediaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

class MediaController extends Controller
{
    public function __construct(
        private readonly MediaService $mediaService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return MediaResource::collection($this->mediaService->list($request));
    }

    public function store(StoreMediaRequest $request): JsonResponse
    {
        $media = $this->mediaService->store(
            $request->file('file'),
            $request->validated('alt_text'),
            $request->user()?->id,
            $request->validated('force_format'),
        );

        return (new MediaResource($media))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateMediaRequest $request, Media $media): MediaResource
    {
        $media->update($request->validated());

        return new MediaResource($media->refresh());
    }

    public function destroy(Media $media): JsonResponse
    {
        $labels = $this->mediaService->usageLabels($media);
        if ($labels !== []) {
            return response()->json([
                'message' => 'لا يمكن حذف هذه الوسائط لأنها مستخدمة حاليًا.',
                'used_in' => $labels,
            ], 409);
        }

        try {
            $this->mediaService->delete($media);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => collect($e->errors())->flatten()->first() ?: 'تعذر الحذف.',
                'errors' => $e->errors(),
            ], 409);
        }

        return response()->json(['message' => 'تم حذف الوسائط بنجاح.']);
    }
}
