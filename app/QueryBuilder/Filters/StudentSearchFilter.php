<?php

namespace App\QueryBuilder\Filters;

use App\Models\Student;
use Illuminate\Database\Eloquent\Builder;
use Spatie\QueryBuilder\Filters\Filter;

class StudentSearchFilter implements Filter
{
    /**
     * @param  Builder<Student>  $query
     */
    public function __invoke(Builder $query, mixed $value, string $property): void
    {
        $search = (string) $value;

        $query->where(function (Builder $builder) use ($search) {
            $builder->where('full_name', 'LIKE', "%{$search}%")
                ->orWhere('civil_id', 'LIKE', "%{$search}%")
                ->orWhere('file_number', 'LIKE', "%{$search}%");
        });
    }
}
