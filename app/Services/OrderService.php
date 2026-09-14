<?php

namespace App\Services;

use App\Enums\FulfillmentType;
use App\Enums\InvoiceStatus;
use App\Enums\OrderStatus;
use App\Models\Branch;
use App\Models\DeliveryZone;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Order;
use App\Models\Product;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class OrderService
{
    /**
     * @param  list<array{product_id: int, quantity: int}>  $items
     */
    public function createOrder(
        Student $student,
        array $items,
        FulfillmentType $fulfillmentType,
        User $createdBy,
        ?int $deliveryZoneId = null,
        ?string $deliveryAddress = null,
        ?int $branchId = null,
    ): Order {
        $this->validateFulfillment($fulfillmentType, $deliveryZoneId, $branchId);

        if ($items === []) {
            throw ValidationException::withMessages([
                'items' => ['يجب إضافة منتج واحد على الأقل.'],
            ]);
        }

        return DB::transaction(function () use (
            $student,
            $items,
            $fulfillmentType,
            $createdBy,
            $deliveryZoneId,
            $deliveryAddress,
            $branchId,
        ) {
            $deliveryZone = null;
            $deliveryFee = '0.000';

            if ($fulfillmentType === FulfillmentType::Delivery) {
                $deliveryZone = DeliveryZone::query()->lockForUpdate()->find($deliveryZoneId);

                if (! $deliveryZone || ! $deliveryZone->is_active) {
                    throw ValidationException::withMessages([
                        'delivery_zone_id' => ['منطقة التوصيل غير متاحة.'],
                    ]);
                }

                $deliveryFee = number_format((float) $deliveryZone->fee, 3, '.', '');
            }

            if ($fulfillmentType === FulfillmentType::Pickup) {
                if (! Branch::query()->whereKey($branchId)->exists()) {
                    throw ValidationException::withMessages([
                        'branch_id' => ['الفرع المحدد غير موجود.'],
                    ]);
                }
            }

            $productLines = [];
            $subtotal = 0.0;

            foreach ($items as $line) {
                $productId = (int) $line['product_id'];
                $quantity = (int) $line['quantity'];

                if ($quantity < 1) {
                    throw ValidationException::withMessages([
                        'items' => ['الكمية يجب أن تكون 1 على الأقل.'],
                    ]);
                }

                $product = Product::query()->lockForUpdate()->find($productId);

                if (! $product || ! $product->is_active) {
                    throw ValidationException::withMessages([
                        'items' => ["المنتج رقم {$productId} غير متاح."],
                    ]);
                }

                if ($product->stock_quantity < $quantity) {
                    throw new ConflictHttpException(
                        "الكمية المتاحة من «{$product->name}» هي {$product->stock_quantity} فقط."
                    );
                }

                $unitPrice = number_format((float) $product->price, 3, '.', '');
                $lineTotal = number_format((float) $unitPrice * $quantity, 3, '.', '');

                $product->decrement('stock_quantity', $quantity);

                $productLines[] = [
                    'product' => $product,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'line_total' => $lineTotal,
                ];

                $subtotal += (float) $lineTotal;
            }

            $subtotalFormatted = number_format($subtotal, 3, '.', '');
            $total = number_format($subtotal + (float) $deliveryFee, 3, '.', '');

            $invoice = Invoice::query()->create([
                'invoice_number' => $this->generateInvoiceNumber(),
                'student_id' => $student->id,
                'coupon_id' => null,
                'status' => InvoiceStatus::Pending,
                'subtotal' => $subtotalFormatted,
                'coupon_discount_amount' => '0.000',
                'family_discount_amount' => '0.000',
                'credit_applied_amount' => '0.000',
                'total' => $total,
                'created_by' => $createdBy->id,
            ]);

            foreach ($productLines as $line) {
                InvoiceItem::query()->create([
                    'invoice_id' => $invoice->id,
                    'itemable_type' => Product::class,
                    'itemable_id' => $line['product']->id,
                    'description' => $line['product']->name,
                    'unit_price' => $line['unit_price'],
                    'quantity' => $line['quantity'],
                    'line_total' => $line['line_total'],
                ]);
            }

            if ($fulfillmentType === FulfillmentType::Delivery && $deliveryZone !== null) {
                InvoiceItem::query()->create([
                    'invoice_id' => $invoice->id,
                    'itemable_type' => null,
                    'itemable_id' => null,
                    'description' => "رسوم توصيل - {$deliveryZone->name}",
                    'unit_price' => $deliveryFee,
                    'quantity' => 1,
                    'line_total' => $deliveryFee,
                ]);
            }

            $order = Order::query()->create([
                'student_id' => $student->id,
                'invoice_id' => $invoice->id,
                'fulfillment_type' => $fulfillmentType,
                'delivery_zone_id' => $fulfillmentType === FulfillmentType::Delivery ? $deliveryZoneId : null,
                'delivery_address' => $fulfillmentType === FulfillmentType::Delivery ? $deliveryAddress : null,
                'branch_id' => $fulfillmentType === FulfillmentType::Pickup ? $branchId : null,
                'status' => OrderStatus::PendingPayment,
            ]);

            foreach ($productLines as $line) {
                $order->items()->create([
                    'product_id' => $line['product']->id,
                    'product_name' => $line['product']->name,
                    'unit_price' => $line['unit_price'],
                    'quantity' => $line['quantity'],
                    'line_total' => $line['line_total'],
                ]);
            }

            return $order->load(['items', 'invoice.items', 'student', 'deliveryZone', 'branch']);
        });
    }

    private function validateFulfillment(
        FulfillmentType $fulfillmentType,
        ?int $deliveryZoneId,
        ?int $branchId,
    ): void {
        if ($fulfillmentType === FulfillmentType::Delivery && $deliveryZoneId === null) {
            throw ValidationException::withMessages([
                'delivery_zone_id' => ['منطقة التوصيل مطلوبة عند اختيار التوصيل.'],
            ]);
        }

        if ($fulfillmentType === FulfillmentType::Pickup && $branchId === null) {
            throw ValidationException::withMessages([
                'branch_id' => ['الفرع مطلوب عند اختيار الاستلام من الفرع.'],
            ]);
        }
    }

    private function generateInvoiceNumber(): string
    {
        $year = now()->format('Y');

        $maxSequence = Invoice::query()
            ->lockForUpdate()
            ->pluck('invoice_number')
            ->map(function (?string $invoiceNumber) use ($year) {
                if ($invoiceNumber === null || ! preg_match('/^INV-(\d{4})-(\d{5})$/', $invoiceNumber, $matches)) {
                    return 0;
                }

                if ($matches[1] !== $year) {
                    return 0;
                }

                return (int) $matches[2];
            })
            ->max() ?? 0;

        return sprintf('INV-%s-%05d', $year, $maxSequence + 1);
    }
}
