<?php

namespace App\Enums;

enum ReservationStatus: string
{
    case PENDING = 'Pending';
    case ORDER_RECEIVED = 'Order Received';
    case COMPLETED = 'Completed';
    case CANCELLED = 'Cancelled';
    case EXPIRED = 'Expired';
}
