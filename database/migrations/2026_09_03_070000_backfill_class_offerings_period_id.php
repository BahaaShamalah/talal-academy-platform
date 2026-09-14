<?php

use App\Enums\AcademicPeriodStatus;
use App\Models\AcademicPeriod;
use App\Models\ClassOffering;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $activePeriodId = AcademicPeriod::query()
            ->where('status', AcademicPeriodStatus::Active)
            ->value('id');

        if (! $activePeriodId) {
            return;
        }

        ClassOffering::query()
            ->whereNull('period_id')
            ->update(['period_id' => $activePeriodId]);
    }

    public function down(): void
    {
        // لا نفك الربط: الحصص القديمة كانت بلا فترة.
    }
};
