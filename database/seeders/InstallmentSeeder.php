<?php

namespace Database\Seeders;

use App\Models\InstallmentTemplate;
use App\Models\Plan;
use Illuminate\Database\Seeder;

class InstallmentSeeder extends Seeder
{
    public function run(): void
    {
        $template = InstallmentTemplate::query()->create([
            'name' => 'دفعتين 50/50',
            'number_of_installments' => 2,
            'split_percentages' => [50, 50],
            'due_offset_days' => [0, 30],
        ]);

        $plan = Plan::query()->orderBy('id')->first();

        if ($plan) {
            $plan->update(['installment_template_id' => $template->id]);
        }
    }
}
