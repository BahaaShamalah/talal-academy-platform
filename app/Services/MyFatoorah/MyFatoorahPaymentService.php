<?php



namespace App\Services\MyFatoorah;



use App\Enums\InvoiceStatus;

use App\Models\Invoice;

use App\Models\InvoiceInstallment;

use MyFatoorah\Library\API\Payment\MyFatoorahPayment;

use MyFatoorah\Library\API\Payment\MyFatoorahPaymentStatus;

use RuntimeException;

use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

use Throwable;

use Illuminate\Support\Facades\Log;



class MyFatoorahPaymentService

{

    public function __construct(

        private readonly MyFatoorahWebhookService $webhookService,

    ) {}



    public function isConfigured(): bool

    {

        return (string) config('myfatoorah.api_key') !== '';

    }



    /**

     * @return array{status: string, message: string, invoice_status?: string}

     */

    public function confirmPayment(string $paymentId): array

    {

        $this->assertConfigured();



        try {

            $statusClient = new MyFatoorahPaymentStatus([

                'apiKey' => (string) config('myfatoorah.api_key'),

                'isTest' => (bool) config('myfatoorah.test_mode'),

                'vcCode' => (string) config('myfatoorah.country_iso'),

            ]);



            $data = $statusClient->getPaymentStatus($paymentId, 'PaymentId');

        } catch (Throwable $e) {

            Log::warning('MyFatoorah confirm: getPaymentStatus failed.', [

                'payment_id' => $paymentId,

                'message' => $e->getMessage(),

            ]);



            return [

                'status' => 'error',

                'message' => 'تعذّر التحقق من حالة الدفع.',

                'invoice_status' => 'unknown',

            ];

        }



        $invoiceStatus = (string) ($data->InvoiceStatus ?? '');

        $isPaid = in_array($invoiceStatus, ['Paid', 'DuplicatePayment'], true)

            || $this->hasSuccessfulTransaction($data);



        if (! $isPaid) {

            $error = (string) ($data->InvoiceError ?? $data->Error ?? '');



            return [

                'status' => 'failed',

                'message' => $error !== '' ? $error : 'لم تكتمل عملية الدفع.',

                'invoice_status' => $invoiceStatus !== '' ? $invoiceStatus : 'Pending',

            ];

        }



        $paidAmount = $data->InvoiceValue ?? $this->successfulTransactionAmount($data);



        $payload = [

            'Data' => [

                'Invoice' => [

                    'Status' => 'PAID',

                    'ExternalIdentifier' => (string) ($data->CustomerReference ?? ''),

                    'UserDefinedField' => (string) ($data->UserDefinedField ?? ''),

                ],

                'Transaction' => [

                    'Status' => 'SUCCESS',

                ],

                'Amount' => [

                    'ValueInDisplayCurrency' => $paidAmount,

                ],

            ],

        ];



        try {

            return $this->webhookService->fulfillPaidPayment($payload);

        } catch (Throwable $e) {

            Log::warning('MyFatoorah confirm: fulfill failed.', [

                'payment_id' => $paymentId,

                'message' => $e->getMessage(),

            ]);



            if ($invoiceStatus === 'Paid' || $invoiceStatus === 'DuplicatePayment') {

                return [

                    'status' => 'processed',

                    'message' => 'تم الدفع — حالة الفاتورة ستُحدَّث قريبًا.',

                ];

            }



            throw $e;

        }

    }



    /**

     * @return array{payment_url: string, myfatoorah_invoice_id: int|string}

     */

    public function initiatePayment(Invoice $invoice): array

    {

        if ($invoice->status !== InvoiceStatus::Pending) {

            throw new ConflictHttpException('هذه الفاتورة ليست بانتظار الدفع');

        }



        if ($invoice->hasInstallments()) {

            throw new ConflictHttpException('هذه الفاتورة مقسّطة — ادفع الدفعات من قائمة الأقساط');

        }



        return $this->initiatePaymentForAmount(

            $invoice,

            (float) $invoice->total,

            $invoice->invoice_number,

            (string) $invoice->id,

        );

    }



    /**

     * @return array{payment_url: string, myfatoorah_invoice_id: int|string}

     */

    public function initiateInstallmentPayment(Invoice $invoice, InvoiceInstallment $installment): array

    {

        if ($invoice->status !== InvoiceStatus::Pending) {

            throw new ConflictHttpException('هذه الفاتورة ليست بانتظار الدفع');

        }



        if ($installment->invoice_id !== $invoice->id) {

            throw new ConflictHttpException('الدفعة لا تنتمي لهذه الفاتورة');

        }



        if ($installment->status->value !== 'pending') {

            throw new ConflictHttpException('هذه الدفعة مسدَّدة أصلاً');

        }



        $reference = sprintf('%s-I%d', $invoice->invoice_number, $installment->id);

        $userDefined = sprintf('%d:%d', $invoice->id, $installment->id);



        return $this->initiatePaymentForAmount(

            $invoice,

            (float) $installment->amount,

            $reference,

            $userDefined,

        );

    }



    /**

     * @return array{payment_url: string, myfatoorah_invoice_id: int|string}

     */

    protected function initiatePaymentForAmount(

        Invoice $invoice,

        float $amount,

        string $customerReference,

        string $userDefinedField,

    ): array {

        $this->assertConfigured();



        $invoice->loadMissing('student');



        $mf = $this->makePaymentClient();



        $postFields = [

            'InvoiceValue' => $amount,

            'DisplayCurrencyIso' => 'KWD',

            'CustomerName' => $invoice->student?->full_name ?: 'Student',

            'CustomerReference' => $customerReference,

            'CustomerIdentifier' => $customerReference,

            'UserDefinedField' => $userDefinedField,

            'NotificationOption' => 'Lnk',

            'CallBackUrl' => (string) config('myfatoorah.callback_url'),

            'ErrorUrl' => (string) config('myfatoorah.error_url'),

            'Language' => 'ar',

        ];



        $result = $mf->getInvoiceURL($postFields, 0, $customerReference);



        $paymentUrl = $result['invoiceURL'] ?? $result['InvoiceURL'] ?? null;

        $mfInvoiceId = $result['invoiceId'] ?? $result['InvoiceId'] ?? null;



        if (! is_string($paymentUrl) || $paymentUrl === '') {

            throw new RuntimeException('تعذر إنشاء رابط الدفع.');

        }



        return [

            'payment_url' => $paymentUrl,

            'myfatoorah_invoice_id' => $mfInvoiceId,

        ];

    }



    protected function makePaymentClient(): MyFatoorahPayment

    {

        return new MyFatoorahPayment([

            'apiKey' => (string) config('myfatoorah.api_key'),

            'isTest' => (bool) config('myfatoorah.test_mode'),

            'vcCode' => (string) config('myfatoorah.country_iso'),

        ]);

    }



    protected function assertConfigured(): void

    {

        if (! $this->isConfigured()) {

            throw new RuntimeException('بوابة الدفع غير مهيأة — أضف MYFATOORAH_API_KEY في ملف .env');

        }

    }



    private function hasSuccessfulTransaction(object $data): bool

    {

        $transactions = $data->InvoiceTransactions ?? null;

        if (! is_array($transactions) && ! ($transactions instanceof \Traversable)) {

            return false;

        }



        foreach ($transactions as $tx) {

            $status = strtoupper((string) ($tx->TransactionStatus ?? ''));

            if (in_array($status, ['SUCCESS', 'SUCCSS', 'SUCCE'], true)) {

                return true;

            }

        }



        return false;

    }



    private function successfulTransactionAmount(object $data): mixed

    {

        $transactions = $data->InvoiceTransactions ?? null;

        if (! is_array($transactions) && ! ($transactions instanceof \Traversable)) {

            return null;

        }



        foreach ($transactions as $tx) {

            $status = strtoupper((string) ($tx->TransactionStatus ?? ''));

            if (in_array($status, ['SUCCESS', 'SUCCSS', 'SUCCE'], true)) {

                return $tx->DueValue ?? $tx->TransationValue ?? $tx->TransactionValue ?? null;

            }

        }



        return null;

    }

}

