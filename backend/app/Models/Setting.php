<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'value',
    ];

    /**
     * Build a business_snapshot array from the current settings table.
     *
     * Called at the moment a transaction is created to permanently freeze
     * the business identity details in force on that date.
     *
     * Logo is intentionally excluded — it always renders live at print time.
     */
    public static function getBusinessSnapshot(): array
    {
        $keys = [
            'business_name',
            'branch_location',
            'address',
            'contact_number',
            'email_address',
            'tax_rate',
            'tin',
        ];

        $rows = self::whereIn('key', $keys)->pluck('value', 'key');

        return [
            'business_name'   => $rows['business_name'] ?? '',
            'branch_location' => $rows['branch_location'] ?? '',
            'address'         => $rows['address'] ?? '',
            'contact_number'  => $rows['contact_number'] ?? '',
            'email_address'   => $rows['email_address'] ?? '',
            'tax_rate'        => $rows['tax_rate'] ?? '12',
            'tin'             => $rows['tin'] ?? '',
        ];
    }
}
