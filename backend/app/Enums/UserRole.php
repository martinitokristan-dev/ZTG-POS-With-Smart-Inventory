<?php

namespace App\Enums;

enum UserRole: string
{
    case ADMIN = 'Admin';
    case CASHIER = 'Cashier';
    case TECHNICAL_OPERATIONS = 'Technical Operations';
    case SUPERVISOR = 'Supervisor';
}
