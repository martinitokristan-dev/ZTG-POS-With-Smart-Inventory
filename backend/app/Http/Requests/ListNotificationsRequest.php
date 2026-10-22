<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates the optional paging parameters for GET /notifications.
 *
 * - per_page:  how many notifications to return (enables paged mode).
 * - before_id: return only notifications older than this id (keyset cursor).
 */
class ListNotificationsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'per_page'  => 'sometimes|integer|min:1|max:100',
            'before_id' => 'sometimes|integer|min:1',
        ];
    }
}
