<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates the optional paging parameters for GET /notifications.
 *
 * - per_page:  how many notifications to return (enables paged mode).
 * - before_id: return only notifications older than this id (keyset cursor).
 * - search:    text inside the title or message (product name, part no., S.I. no., ...).
 * - category:  stock | dead_stock | sales | security | other (see NotificationService::CATEGORIES).
 * - unread:    1 = only unread notifications.
 * - period:    today | week | month (absent = any time).
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
            'search'    => 'sometimes|nullable|string|max:100',
            'category'  => 'sometimes|nullable|string|in:' . implode(',', \App\Services\Notifications\NotificationService::CATEGORIES),
            'unread'    => 'sometimes|nullable|boolean',
            'period'    => 'sometimes|nullable|string|in:today,week,month',
        ];
    }

    public function messages(): array
    {
        return [
            'search.max'  => 'Search text can be at most 100 characters.',
            'category.in' => 'Unknown notification type. Choose one of the filter chips.',
            'period.in'   => 'Unknown date range. Choose Today, This week or This month.',
        ];
    }
}
