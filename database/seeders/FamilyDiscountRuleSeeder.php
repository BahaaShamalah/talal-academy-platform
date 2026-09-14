<?php

namespace Database\Seeders;

use App\Models\FamilyDiscountRule;
use Illuminate\Database\Seeder;

class FamilyDiscountRuleSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            ['min_children_count' => 2, 'discount_percentage' => 5],
            ['min_children_count' => 3, 'discount_percentage' => 10],
            ['min_children_count' => 4, 'discount_percentage' => 15],
        ] as $row) {
            FamilyDiscountRule::query()->create([
                ...$row,
                'is_active' => true,
            ]);
        }
    }
}
