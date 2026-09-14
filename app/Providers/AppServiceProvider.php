<?php

namespace App\Providers;

use App\Contracts\SmsServiceInterface;
use App\Models\AppNotification;
use App\Models\ClassSession;
use App\Models\Guardian;
use App\Models\Invoice;
use App\Models\PrivateLessonBooking;
use App\Models\PrivateLessonOffer;
use App\Models\PrivateLessonSlot;
use App\Models\StaffCompensationComponent;
use App\Models\Student;
use App\Models\User;
use App\Services\Sms\LogSmsService;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(
            SmsServiceInterface::class,
            LogSmsService::class,
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Route::bind('session', function (string $value) {
            return ClassSession::query()->findOrFail($value);
        });

        Route::bind('teacher', function (string $value) {
            return User::query()->findOrFail($value);
        });

        Route::bind('component', function (string $value) {
            return StaffCompensationComponent::query()->findOrFail($value);
        });

        Gate::define('guardian-own-student', function (Guardian $guardian, Student $student): bool {
            return (int) $student->guardian_id === (int) $guardian->id;
        });

        Route::bind('offer', function (string $value) {
            return PrivateLessonOffer::query()->findOrFail($value);
        });

        Route::bind('booking', function (string $value) {
            return PrivateLessonBooking::query()->findOrFail($value);
        });

        Route::bind('slot', function (string $value) {
            return PrivateLessonSlot::query()->findOrFail($value);
        });

        Route::bind('notification', function (string $value) {
            return AppNotification::query()->findOrFail($value);
        });

        Gate::define('guardian-own-invoice', function (Guardian $guardian, Invoice $invoice): bool {
            return (int) $invoice->student()->value('guardian_id') === (int) $guardian->id;
        });
    }
}
