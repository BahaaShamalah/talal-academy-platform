<?php

namespace App\Console\Commands;

use App\Services\ClassOfferingDedupeService;
use Illuminate\Console\Command;

class MergeDuplicateClassOfferingsCommand extends Command
{
    protected $signature = 'offerings:merge-duplicates {--dry-run : Show what would be merged without writing}';

    protected $description = 'Merge class offerings that were split per weekday into one offering with multiple schedules';

    public function handle(ClassOfferingDedupeService $service): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $result = $service->mergeDuplicates($dryRun);

        $prefix = $dryRun ? '[dry-run] ' : '';
        $this->info("{$prefix}Groups: {$result['groups']}, kept: {$result['kept']}, merged away: {$result['merged']}");

        return self::SUCCESS;
    }
}
