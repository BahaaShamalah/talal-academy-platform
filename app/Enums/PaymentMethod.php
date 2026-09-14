<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case Cash = 'cash';
    case ManualTransfer = 'manual_transfer';
    case Online = 'online';
}
