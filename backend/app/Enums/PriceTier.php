<?php

namespace App\Enums;

enum PriceTier: string
{
    case PRICE1 = 'price1';
    case PRICE2 = 'price2';
    /** P.O. price: only used when the payment method is P.O. (Pending). */
    case PO = 'po';
}
