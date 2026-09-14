<?php

namespace App\Services;

use App\Contracts\SmsServiceInterface;
use App\Enums\GuardianRelationship;
use App\Enums\OtpPurpose;
use App\Exceptions\OtpException;
use App\Models\Guardian;
use App\Models\OtpCode;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

class OtpService
{
    public function __construct(
        private readonly SmsServiceInterface $smsService,
    ) {}

    public function requestOtp(string $phone, OtpPurpose $purpose = OtpPurpose::GuardianAuth): string
    {
        $phone = $this->normalizePhone($phone);
        $key = "otp-request:{$purpose->value}:{$phone}";

        if (RateLimiter::tooManyAttempts($key, 3)) {
            throw new TooManyRequestsHttpException(
                retryAfter: RateLimiter::availableIn($key),
                message: 'تجاوزت الحد المسموح لطلب رمز التحقق. حاول بعد قليل.',
            );
        }

        RateLimiter::hit($key, 600);

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        OtpCode::query()->create([
            'phone' => $phone,
            'code_hash' => Hash::make($code),
            'purpose' => $purpose,
            'expires_at' => now()->addMinutes(5),
            'attempts' => 0,
        ]);

        $this->smsService->send(
            $phone,
            "رمز التحقق الخاص بك في معهد طلال أكاديمي: {$code}",
        );

        return $code;
    }

    /**
     * @return array{guardian: Guardian, token: string, is_new_guardian: bool}
     */
    public function verifyOtp(string $phone, string $code, OtpPurpose $purpose = OtpPurpose::GuardianAuth): array
    {
        $phone = $this->normalizePhone($phone);

        $otp = OtpCode::query()
            ->where('phone', $phone)
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->latest('id')
            ->first();

        if (! $otp) {
            throw new OtpException('اطلب رمز تحقق أولاً.');
        }

        if ($otp->expires_at->isPast()) {
            throw new OtpException('انتهت صلاحية الرمز، اطلب رمزًا جديدًا.');
        }

        if (! Hash::check($code, $otp->code_hash)) {
            $otp->increment('attempts');

            if ($otp->fresh()->attempts >= 5) {
                $otp->update(['consumed_at' => now()]);

                throw new OtpException('تجاوزت عدد المحاولات، اطلب رمز تحقق جديدًا.');
            }

            throw new OtpException('رمز التحقق غير صحيح.');
        }

        $otp->update(['consumed_at' => now()]);

        $guardian = Guardian::query()->where('phone', $phone)->first();
        $isNew = false;

        if (! $guardian) {
            $isNew = true;
            $guardian = Guardian::query()->create([
                'phone' => $phone,
                'full_name' => null,
                'relationship' => GuardianRelationship::Other,
            ]);
        }

        $token = $guardian->createToken('guardian')->plainTextToken;

        return [
            'guardian' => $guardian->fresh()->load('students'),
            'token' => $token,
            'is_new_guardian' => $isNew,
        ];
    }

    public function normalizePhone(string $phone): string
    {
        return preg_replace('/\s+/', '', trim($phone)) ?? trim($phone);
    }
}
