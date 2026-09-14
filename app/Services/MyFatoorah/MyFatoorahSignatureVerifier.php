<?php

namespace App\Services\MyFatoorah;

/**
 * Verifies MyFatoorah webhook HMAC signatures (v2 PAYMENT_STATUS_CHANGED field order).
 *
 * @see https://docs.myfatoorah.com/docs/webhook-signature
 * @see https://docs.myfatoorah.com/docs/webhook-v2-payment-status-data-model
 */
class MyFatoorahSignatureVerifier
{
    /**
     * Ordered Data keys used to sign PAYMENT_STATUS_CHANGED (Event.Code = 1).
     *
     * @var list<string>
     */
    public const PAYMENT_STATUS_SIGNED_FIELDS = [
        'Invoice.Id',
        'Invoice.Status',
        'Transaction.Status',
        'Transaction.PaymentId',
        'Invoice.ExternalIdentifier',
    ];

    /**
     * @param  array<string, mixed>  $payload  Full webhook JSON (Event + Data)
     */
    public function isValid(array $payload, string $signature, string $secret): bool
    {
        if ($secret === '' || $signature === '') {
            return false;
        }

        $expected = $this->signPaymentStatusPayload($payload, $secret);

        return hash_equals($expected, $signature);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function signPaymentStatusPayload(array $payload, string $secret): string
    {
        $dataModel = $this->paymentStatusDataModel($payload['Data'] ?? []);

        return $this->hmacBase64($dataModel, $secret);
    }

    /**
     * @param  array<string, mixed>  $data  Nested Data object from webhook
     * @return array<string, string>
     */
    public function paymentStatusDataModel(array $data): array
    {
        $invoice = is_array($data['Invoice'] ?? null) ? $data['Invoice'] : [];
        $transaction = is_array($data['Transaction'] ?? null) ? $data['Transaction'] : [];

        return [
            'Invoice.Id' => $this->stringOrEmpty($invoice['Id'] ?? null),
            'Invoice.Status' => $this->stringOrEmpty($invoice['Status'] ?? null),
            'Transaction.Status' => $this->stringOrEmpty($transaction['Status'] ?? null),
            'Transaction.PaymentId' => $this->stringOrEmpty($transaction['PaymentId'] ?? null),
            'Invoice.ExternalIdentifier' => $this->stringOrEmpty($invoice['ExternalIdentifier'] ?? null),
        ];
    }

    /**
     * @param  array<string, string|null>  $dataModel
     */
    public function hmacBase64(array $dataModel, string $secret): string
    {
        $parts = [];
        foreach ($dataModel as $key => $value) {
            $parts[] = sprintf('%s=%s', $key, $value ?? '');
        }

        $output = implode(',', $parts);

        return base64_encode(hash_hmac('sha256', $output, $secret, true));
    }

    private function stringOrEmpty(mixed $value): string
    {
        if ($value === null) {
            return '';
        }

        return (string) $value;
    }
}
