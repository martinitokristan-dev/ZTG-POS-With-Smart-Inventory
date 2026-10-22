<?php

namespace App\Enums;

enum TransactionStatus: string
{
    case COMPLETED = 'Completed';
    case REFUND = 'Refund';
    case RETURN = 'Return';
    case VOID = 'Void';
    case PENDING = 'Pending';
    case DEPOSIT = 'Deposit';
    case PAID = 'Paid';
    case RESTOCKED = 'Restocked';
    case DAMAGED = 'Damaged';
    case IMPORTED = 'Imported';
    case IMPORT_UNDONE = 'Import Undone';
    case SECURITY_ALERT = 'Security Alert';
}
