<?php

namespace Tests\Unit\MyFatoorah;

use App\Services\MyFatoorah\MyFatoorahSignatureVerifier;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MyFatoorahSignatureVerifierTest extends TestCase
{
    private MyFatoorahSignatureVerifier $verifier;

    private string $secret = 'test-webhook-secret-key';

    protected function setUp(): void
    {
        parent::setUp();
        $this->verifier = new MyFatoorahSignatureVerifier;
    }

    /**
     * @return array<string, mixed>
     */
    private function samplePayload(): array
    {
        return [
            'Event' => [
                'Code' => 1,
                'Name' => 'PAYMENT_STATUS_CHANGED',
                'Reference' => 'WH-626519',
            ],
            'Data' => [
                'Invoice' => [
                    'Id' => '6409988',
                    'Status' => 'PAID',
                    'ExternalIdentifier' => 'INV-1001',
                ],
                'Transaction' => [
                    'Status' => 'SUCCESS',
                    'PaymentId' => '07076409988323998875',
                ],
            ],
        ];
    }

    #[Test]
    public function it_accepts_a_valid_hmac_signature(): void
    {
        $payload = $this->samplePayload();
        $signature = $this->verifier->signPaymentStatusPayload($payload, $this->secret);

        $this->assertTrue($this->verifier->isValid($payload, $signature, $this->secret));
    }

    #[Test]
    public function it_rejects_an_invalid_hmac_signature(): void
    {
        $payload = $this->samplePayload();

        $this->assertFalse(
            $this->verifier->isValid($payload, 'not-a-valid-signature', $this->secret)
        );
    }

    #[Test]
    public function it_rejects_when_payload_fields_are_tampered(): void
    {
        $payload = $this->samplePayload();
        $signature = $this->verifier->signPaymentStatusPayload($payload, $this->secret);

        $payload['Data']['Invoice']['Status'] = 'PENDING';

        $this->assertFalse($this->verifier->isValid($payload, $signature, $this->secret));
    }

    #[Test]
    public function it_builds_the_documented_signed_string_order(): void
    {
        $model = $this->verifier->paymentStatusDataModel($this->samplePayload()['Data']);

        $this->assertSame(
            [
                'Invoice.Id' => '6409988',
                'Invoice.Status' => 'PAID',
                'Transaction.Status' => 'SUCCESS',
                'Transaction.PaymentId' => '07076409988323998875',
                'Invoice.ExternalIdentifier' => 'INV-1001',
            ],
            $model
        );

        $expectedHash = base64_encode(hash_hmac(
            'sha256',
            'Invoice.Id=6409988,Invoice.Status=PAID,Transaction.Status=SUCCESS,Transaction.PaymentId=07076409988323998875,Invoice.ExternalIdentifier=INV-1001',
            $this->secret,
            true
        ));

        $this->assertSame($expectedHash, $this->verifier->hmacBase64($model, $this->secret));
    }

    #[Test]
    public function it_treats_null_external_identifier_as_empty_string(): void
    {
        $model = $this->verifier->paymentStatusDataModel([
            'Invoice' => [
                'Id' => '1',
                'Status' => 'PAID',
                'ExternalIdentifier' => null,
            ],
            'Transaction' => [
                'Status' => 'SUCCESS',
                'PaymentId' => 'pay-1',
            ],
        ]);

        $this->assertSame('', $model['Invoice.ExternalIdentifier']);
    }
}
