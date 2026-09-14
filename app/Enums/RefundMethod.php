<?php

namespace App\Enums;

enum RefundMethod: string
{
    case Cash = 'cash';
    case BankTransfer = 'bank_transfer';
    case Credit = 'credit';
}
