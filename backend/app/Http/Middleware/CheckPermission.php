<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  $module
     * @param  string  $action  'has_access' | 'can_view' | 'can_create' | 'can_edit' | 'can_delete'
     */
    public function handle(Request $request, Closure $next, string $module, string $action = 'can_view'): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Support multiple alternative modules (e.g. 'dashboard|reports')
        $modules = preg_split('/[\|,]/', $module);
        $hasAnyPermission = false;

        foreach ($modules as $mod) {
            $trimmedMod = trim($mod);
            if (!empty($trimmedMod) && $user->hasPermission($trimmedMod, $action)) {
                $hasAnyPermission = true;
                break;
            }
        }

        if (! $hasAnyPermission) {
            $firstMod = trim($modules[0] ?? $module);
            return response()->json([
                'message'    => $this->getFriendlyErrorMessage($firstMod, $action),
                'module'     => $firstMod,
                'action'     => $action,
                'error_type' => 'permission_denied',
            ], 403);
        }

        return $next($request);
    }

    /**
     * Generate context-aware, user-friendly permission error messages.
     */
    private function getFriendlyErrorMessage(string $module, string $action): string
    {
        $messages = [
            'dashboard' => [
                'has_access' => 'Permission Required. Your account does not have authorization to access the Dashboard.',
                'can_view'   => 'Permission Required. Your account does not have authorization to view KPI metrics and business analytics.',
            ],
            'products' => [
                'has_access' => 'Permission Required. Your account does not have authorization to access Product Management.',
                'can_view'   => 'Permission Required. Your account does not have authorization to view the product catalog.',
                'can_create' => 'Permission Required. Your account does not have authorization to add new products to the catalog.',
                'can_edit'   => 'Permission Required. Your account does not have authorization to edit product details, pricing, or specifications.',
                'can_delete' => 'Permission Required. Your account does not have authorization to delete products from the catalog.',
            ],
            'inventory' => [
                'has_access' => 'Permission Required. Your account does not have authorization to access Inventory Management.',
                'can_view'   => 'Permission Required. Your account does not have authorization to view inventory stock levels.',
                'can_create' => 'Permission Required. Your account does not have authorization to initiate inventory restocks or stock transfers.',
                'can_edit'   => 'Permission Required. Your account does not have authorization to modify stock quantities or warehouse locations.',
                'can_delete' => 'Permission Required. Your account does not have authorization to remove inventory records.',
            ],
            'reservations' => [
                'has_access' => 'Permission Required. Your account does not have authorization to access Order-Based reservations.',
                'can_view'   => 'Permission Required. Your account does not have authorization to view customer reservation orders.',
                'can_create' => 'Permission Required. Your account does not have authorization to create new reservation orders.',
                'can_edit'   => 'Permission Required. Your account does not have authorization to modify or fulfill customer reservation orders.',
                'can_delete' => 'Permission Required. Your account does not have authorization to cancel or delete customer reservation orders.',
            ],
            'pos' => [
                'has_access' => 'Permission Required. Your account does not have authorization to access the Point of Sale (POS) terminal.',
                'can_view'   => 'Permission Required. Your account does not have authorization to access POS checkout registers.',
                'can_create' => 'Permission Required. Your account does not have authorization to process new sales transactions.',
                'can_edit'   => 'Permission Required. Your account does not have authorization to apply discounts or modify active checkout orders.',
                'can_delete' => 'Permission Required. Your account does not have authorization to clear or void active POS registers.',
            ],
            'history_logs' => [
                'has_access' => 'Permission Required. Your account does not have authorization to access History Logs.',
                'can_view'   => 'Permission Required. Your account does not have authorization to view transaction audit history or logs.',
                'can_create' => 'Permission Required. Your account does not have authorization to record manual audit log entries.',
                'can_edit'   => 'Permission Required. Your account does not have authorization to modify transaction records or payment details.',
                'can_delete' => 'Permission Required. Your account does not have authorization to void, refund, or delete audit logs.',
            ],
            'sales_log' => [
                'has_access' => 'Permission Required. Your account does not have authorization to access the Sales Log.',
                'can_view'   => 'Permission Required. Your account does not have authorization to view daily sales records and customer receipts.',
                'can_create' => 'Permission Required. Your account does not have authorization to record manual sales entries.',
                'can_edit'   => 'Permission Required. Your account does not have authorization to modify sales receipts or transaction details.',
                'can_delete' => 'Permission Required. Your account does not have authorization to void or delete completed sales records.',
            ],
            'reports' => [
                'has_access' => 'Permission Required. Your account does not have authorization to access System Reports.',
                'can_view'   => 'Permission Required. Your account does not have authorization to view financial, sales, or inventory reports.',
                'can_create' => 'Permission Required. Your account does not have authorization to generate or export report summaries.',
                'can_edit'   => 'Permission Required. Your account does not have authorization to sign off or confirm report periods.',
                'can_delete' => 'Permission Required. Your account does not have authorization to delete generated reports.',
            ],
            'settings' => [
                'has_access' => 'Permission Required. Your account does not have authorization to access System Settings.',
                'can_view'   => 'Permission Required. Your account does not have authorization to view system configurations.',
                'can_create' => 'Permission Required. Your account does not have authorization to create new system configurations.',
                'can_edit'   => 'Permission Required. Your account does not have authorization to modify system preferences or store settings.',
                'can_delete' => 'Permission Required. Your account does not have authorization to reset or remove system settings.',
            ],
            'user_management' => [
                'has_access' => 'Permission Required. Your account does not have authorization to access User Management.',
                'can_view'   => 'Permission Required. Your account does not have authorization to view staff accounts and system roles.',
                'can_create' => 'Permission Required. Your account does not have authorization to register new staff accounts or create roles.',
                'can_edit'   => 'Permission Required. Your account does not have authorization to modify staff details or role permissions.',
                'can_delete' => 'Permission Required. Your account does not have authorization to deactivate or delete staff accounts or roles.',
            ],
        ];

        if (isset($messages[$module][$action])) {
            return $messages[$module][$action] . ' Please contact your administrator to request access.';
        }

        $verb = match ($action) {
            'can_create' => 'create items in',
            'can_edit'   => 'edit or update items in',
            'can_delete' => 'delete or remove items in',
            'can_view'   => 'view records in',
            default      => 'access',
        };

        $readableModule = ucwords(str_replace('_', ' ', $module));

        return "Permission Required. Your account does not have authorization to {$verb} {$readableModule}. Please contact your administrator to request access.";
    }
}
