<?php

namespace App\Services;

use App\Models\LeaveType;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class LeaveTypeService
{
    /**
     * @return LengthAwarePaginator<int, LeaveType>
     */
    public function list(Request $request): LengthAwarePaginator
    {
        return LeaveType::query()
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50))
            ->appends($request->query());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): LeaveType
    {
        return LeaveType::query()->create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(LeaveType $leaveType, array $data): LeaveType
    {
        $leaveType->update($data);

        return $leaveType->refresh();
    }

    public function delete(LeaveType $leaveType): void
    {
        if ($leaveType->requests()->exists()) {
            throw new ConflictHttpException('لا يمكن حذف نوع إجازة مرتبط بطلبات.');
        }

        $leaveType->balances()->delete();
        $leaveType->delete();
    }
}
