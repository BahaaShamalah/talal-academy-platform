<?php

namespace Tests\Unit\MyFatoorah;

use App\Models\PaymentWebhookEvent;
use App\Services\MyFatoorah\MyFatoorahSignatureVerifier;
use App\Services\MyFatoorah\MyFatoorahWebhookService;
use App\Services\SubscriptionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use PHPUnit\Framework\Attributes\Test;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class MyFatoorahWebhookIdempotencyTest extends TestCase
{
    use RefreshDatabase;

    private MyFatoorahWebhookService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new MyFatoorahWebhookService(
            new MyFatoorahSignatureVerifier,
            Mockery::mock(SubscriptionService::class),
        );
    }

    #[Test]
    public function claim_event_succeeds_the_first_time(): void
    {
        $this->assertTrue($this->service->claimEvent('WH-TEST-001'));
        $this->assertDatabaseHas('payment_webhook_events', [
            'event_id' => 'WH-TEST-001',
        ]);
    }

    #[Test]
    public function claim_event_ignores_duplicates_safely(): void
    {
        $this->assertTrue($this->service->claimEvent('WH-TEST-002'));
        $this->assertFalse($this->service->claimEvent('WH-TEST-002'));

        $this->assertSame(1, PaymentWebhookEvent::query()->where('event_id', 'WH-TEST-002')->count());
    }

    #[Test]
    public function handle_ignores_duplicate_event_without_calling_mark_paid(): void
    {
        config([
            'myfatoorah.webhook_secret' => 'unit-test-secret',
        ]);

        $subscriptionService = Mockery::mock(SubscriptionService::class);
        $subscriptionService->shouldNotReceive('markInvoicePaid');

        $service = new MyFatoorahWebhookService(
            new MyFatoorahSignatureVerifier,
            $subscriptionService,
        );

        $payload = [
            'Event' => [
                'Code' => 1,
                'Name' => 'PAYMENT_STATUS_CHANGED',
                'Reference' => 'WH-DUP-100',
            ],
            'Data' => [
                'Invoice' => [
                    'Id' => '99',
                    'Status' => 'FAILED',
                    'ExternalIdentifier' => 'INV-X',
                ],
                'Transaction' => [
                    'Status' => 'FAILED',
                    'PaymentId' => 'pay-x',
                ],
            ],
        ];

        $signature = (new MyFatoorahSignatureVerifier)->signPaymentStatusPayload(
            $payload,
            'unit-test-secret'
        );

        $first = $service->handle($payload, $signature);
        $second = $service->handle($payload, $signature);

        $this->assertSame('logged', $first['status']);
        $this->assertSame('ignored', $second['status']);
        $this->assertSame('Duplicate event.', $second['message']);
        $this->assertSame(1, PaymentWebhookEvent::query()->where('event_id', 'WH-DUP-100')->count());
    }

    #[Test]
    public function handle_rejects_invalid_signature_with_401(): void
    {
        config(['myfatoorah.webhook_secret' => 'unit-test-secret']);

        $this->expectException(HttpException::class);

        try {
            $this->service->handle([
                'Event' => ['Reference' => 'WH-BAD', 'Code' => 1, 'Name' => 'PAYMENT_STATUS_CHANGED'],
                'Data' => [
                    'Invoice' => ['Id' => '1', 'Status' => 'PAID', 'ExternalIdentifier' => ''],
                    'Transaction' => ['Status' => 'SUCCESS', 'PaymentId' => 'p'],
                ],
            ], 'bad-signature');
        } catch (HttpException $e) {
            $this->assertSame(401, $e->getStatusCode());
            throw $e;
        }
    }
}
