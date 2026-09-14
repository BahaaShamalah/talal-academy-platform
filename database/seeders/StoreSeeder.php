<?php

namespace Database\Seeders;

use App\Enums\FulfillmentType;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Models\DeliveryZone;
use App\Models\Product;
use App\Models\Student;
use App\Models\User;
use App\Services\OrderService;
use App\Services\SubscriptionService;
use Illuminate\Database\Seeder;

class StoreSeeder extends Seeder
{
    public function run(): void
    {

        $admin = User::query()->where('email', 'admin@example.com')->firstOrFail();

        $math = Product::query()->create([

            'name' => 'مذكرة رياضيات',

            'description' => 'مذكرة مراجعة رياضيات للصف',

            'price' => '5.000',

            'stock_quantity' => 50,

            'is_active' => true,

        ]);

        $arabic = Product::query()->create([

            'name' => 'مذكرة عربي',

            'description' => 'مذكرة مراجعة لغة عربية',

            'price' => '4.000',

            'stock_quantity' => 50,

            'is_active' => true,

        ]);

        $zone = DeliveryZone::query()->create([

            'name' => 'فروانية',

            'fee' => '2.000',

            'is_active' => true,

        ]);

        $student = Student::query()->where('full_name', 'خالد يوسف')->firstOrFail();

        /** @var OrderService $orderService */
        $orderService = app(OrderService::class);

        $order = $orderService->createOrder(

            $student,

            [

                ['product_id' => $math->id, 'quantity' => 2],

                ['product_id' => $arabic->id, 'quantity' => 1],

            ],

            FulfillmentType::Delivery,

            $admin,

            $zone->id,

            'فروانية، قطعة 5، شارع 10',

        );

        /** @var SubscriptionService $subscriptionService */
        $subscriptionService = app(SubscriptionService::class);

        $subscriptionService->markInvoicePaid($order->invoice, PaymentMethod::Cash);

        $order->refresh();

        $math->refresh();

        $arabic->refresh();

        if ($order->status !== OrderStatus::Processing) {

            throw new \RuntimeException('Expected order status processing after payment, got: '.$order->status->value);
        }

        if ($math->stock_quantity !== 48 || $arabic->stock_quantity !== 49) {

            throw new \RuntimeException(
                "Unexpected stock: math={$math->stock_quantity}, arabic={$arabic->stock_quantity}"

            );

        }

    }

}
