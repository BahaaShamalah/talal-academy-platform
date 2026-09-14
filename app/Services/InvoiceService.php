<?php

namespace App\Services;

use App\Models\Invoice;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\AllowedInclude;
use Spatie\QueryBuilder\QueryBuilder;

class InvoiceService
{
    /**
     * @return LengthAwarePaginator<int, Invoice>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return QueryBuilder::for(Invoice::class)
            ->allowedFilters(
                AllowedFilter::exact('student_id'),
                AllowedFilter::exact('status'),
                AllowedFilter::exact('payment_method'),
            )
            ->allowedIncludes(
                AllowedInclude::relationship('student'),
                AllowedInclude::relationship('items'),
                AllowedInclude::relationship('coupon'),
            )
            ->defaultSort('-created_at')
            ->paginate($request->integer('per_page', 15))
            ->appends($request->query());
    }
}
