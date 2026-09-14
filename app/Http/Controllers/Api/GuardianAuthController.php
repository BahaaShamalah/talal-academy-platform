<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\OtpException;
use App\Http\Controllers\Controller;
use App\Http\Requests\GuardianAuth\RequestOtpRequest;
use App\Http\Requests\GuardianAuth\UpdateGuardianProfileRequest;
use App\Http\Requests\GuardianAuth\VerifyOtpRequest;
use App\Http\Resources\GuardianResource;
use App\Models\Guardian;
use App\Services\MediaService;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

class GuardianAuthController extends Controller
{
    public function __construct(
        private readonly OtpService $otpService,
        private readonly MediaService $mediaService,
    ) {}

    public function requestOtp(RequestOtpRequest $request): JsonResponse
    {
        try {
            $code = $this->otpService->requestOtp($request->validated('phone'));
        } catch (TooManyRequestsHttpException $e) {
            return response()->json(['message' => $e->getMessage()], 429);
        }

        $payload = [
            'message' => 'تم إرسال رمز التحقق.',
        ];

        if (config('app.env') !== 'production') {
            $payload['debug_otp_code'] = $code;
        }

        return response()->json($payload);
    }

    public function verifyOtp(VerifyOtpRequest $request): JsonResponse
    {
        try {
            $result = $this->otpService->verifyOtp(
                $request->validated('phone'),
                $request->validated('code'),
            );
        } catch (OtpException $e) {
            return response()->json(['message' => $e->getMessage()], $e->status);
        }

        return response()->json([
            'token' => $result['token'],
            'token_type' => 'Bearer',
            'is_new_guardian' => $result['is_new_guardian'],
            'guardian' => (new GuardianResource($result['guardian']))->resolve(),
        ]);
    }

    public function me(Request $request): GuardianResource
    {
        /** @var Guardian $guardian */
        $guardian = $request->user('guardian');

        return new GuardianResource($guardian->load(['students', 'avatarMedia']));
    }

    public function updateMe(UpdateGuardianProfileRequest $request): GuardianResource
    {
        /** @var Guardian $guardian */
        $guardian = $request->user('guardian');
        $guardian->update($request->validated());

        return new GuardianResource($guardian->fresh()->load(['students', 'avatarMedia']));
    }

    public function uploadAvatar(Request $request): GuardianResource
    {
        /** @var Guardian $guardian */
        $guardian = $request->user('guardian');

        $request->validate([
            'avatar' => ['required', 'file', 'image', 'max:5120'],
        ]);

        $oldId = $guardian->avatar_media_id ? (int) $guardian->avatar_media_id : null;
        $media = $this->mediaService->store($request->file('avatar'), 'صورة ولي الأمر');

        $guardian->forceFill(['avatar_media_id' => $media->id])->save();
        $this->mediaService->deleteIfOrphan($oldId);

        return new GuardianResource($guardian->fresh()->load(['students', 'avatarMedia']));
    }

    public function deleteAvatar(Request $request): GuardianResource
    {
        /** @var Guardian $guardian */
        $guardian = $request->user('guardian');

        $oldId = $guardian->avatar_media_id ? (int) $guardian->avatar_media_id : null;
        $guardian->forceFill(['avatar_media_id' => null])->save();
        $this->mediaService->deleteIfOrphan($oldId);

        return new GuardianResource($guardian->fresh()->load(['students', 'avatarMedia']));
    }

    public function logout(Request $request): JsonResponse
    {
        /** @var Guardian $guardian */
        $guardian = $request->user('guardian');
        $guardian->currentAccessToken()?->delete();

        return response()->json(['message' => 'تم تسجيل الخروج بنجاح.']);
    }
}
