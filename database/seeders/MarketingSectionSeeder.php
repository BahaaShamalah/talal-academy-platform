<?php

namespace Database\Seeders;

use App\Models\MarketingSection;
use Illuminate\Database\Seeder;

class MarketingSectionSeeder extends Seeder
{
    public function run(): void
    {
        $sections = require __DIR__.'/data/marketing_sections.php';

        foreach ($sections as $section) {
            MarketingSection::query()->updateOrCreate(
                ['section_key' => $section['section_key']],
                [
                    'content' => $section['content'],
                    'is_active' => $section['is_active'],
                    'display_order' => $section['display_order'],
                ],
            );
        }
    }
}
