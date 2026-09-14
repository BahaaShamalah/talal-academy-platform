<?php

namespace App\Enums;

enum CreditTransactionType: string
{
    case RefundCredit = 'refund_credit';
    case ManualAdjustment = 'manual_adjustment';
    case AppliedToInvoice = 'applied_to_invoice';
}
