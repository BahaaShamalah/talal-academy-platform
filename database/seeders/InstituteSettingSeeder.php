<?php

namespace Database\Seeders;

use App\Models\InstituteSetting;
use Illuminate\Database\Seeder;

class InstituteSettingSeeder extends Seeder
{
    public function run(): void
    {
        InstituteSetting::query()->firstOrCreate(
            ['id' => 1],
            [
                'institute_name_ar' => 'معهد طلال أكاديمي',
                'institute_name_en' => null,
                'logo_media_id' => null,
                'stamp_media_id' => null,
                'address' => null,
                'phone' => '96550001234',
                'email' => null,
                'commercial_registration_number' => null,
                'invoice_footer_note' => null,
            ],
        );
    }
}
