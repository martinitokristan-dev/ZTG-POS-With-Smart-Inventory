<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\VariantController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProfileAvatarController;
use App\Http\Controllers\AlertRuleController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\PosController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\ReservationController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\CheckerController;
use App\Http\Controllers\SettingLogoController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\SystemHealthController;
use App\Http\Controllers\ForgotPasswordController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\StaffVerificationController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\UserPermissionController;
use Illuminate\Support\Facades\Route;

// Public authentication & media routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [ForgotPasswordController::class, 'sendResetLink']);
Route::post('/reset-password', [ForgotPasswordController::class, 'resetPassword']);
Route::get('/auth/set-password', [StaffVerificationController::class, 'getSetPasswordPage']);
Route::post('/auth/set-password', [StaffVerificationController::class, 'setPassword']);
Route::get('/media/{path}', [MediaController::class, 'show'])->where('path', '.*');
// Public branding — returns only business_name & business_logo, no sensitive data
Route::get('/public/branding', [SettingController::class, 'publicBranding']);

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::get('/user/permissions', [UserPermissionController::class, 'me']);

    // System health diagnostics (Admin & Technical Operations / users with system_status permission)
    Route::middleware('permission:system_status,can_view')->group(function () {
        Route::get('/system-health/diagnostics', [SystemHealthController::class, 'diagnostics']);
    });

    // Profile self-management routes
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::put('/profile/password', [ProfileController::class, 'updatePassword']);
    Route::post('/profile/avatar', [ProfileAvatarController::class, 'upload']);
    Route::delete('/profile/avatar', [ProfileAvatarController::class, 'remove']);

    // General read routes (available to all roles)
    Route::get('/settings', [SettingController::class, 'index']);
    // SI numbering preview — read-only, no counter increment. Cashier calls this on checkout open.
    Route::get('/settings/si-preview', [SettingController::class, 'siPreview']);
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/variants', [VariantController::class, 'index']);

    // Products: read routes (all authenticated roles)
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{product}', [ProductController::class, 'show']);

    // User Management & Access Control (Guarded by user_management permission)
    Route::middleware('permission:user_management,can_view')->group(function () {
        // Roles & Permissions
        Route::get('/roles', [RoleController::class, 'index']);
        Route::get('/roles/modules', [RoleController::class, 'modules']);
        Route::get('/roles/{role}', [RoleController::class, 'show']);
        Route::get('/roles/{role}/users', [RoleController::class, 'users']);
        Route::get('/users/{user}/permissions', [UserPermissionController::class, 'show']);

        Route::post('/roles', [RoleController::class, 'store'])->middleware('permission:user_management,can_create');
        Route::put('/roles/{role}', [RoleController::class, 'update'])->middleware('permission:user_management,can_edit');
        Route::delete('/roles/{role}', [RoleController::class, 'destroy'])->middleware('permission:user_management,can_delete');
        Route::post('/roles/{role}/assign-user', [RoleController::class, 'assignUser'])->middleware('permission:user_management,can_edit');
        Route::post('/roles/{role}/remove-user', [RoleController::class, 'removeUser'])->middleware('permission:user_management,can_edit');
        Route::put('/users/{user}/permissions', [UserPermissionController::class, 'update'])->middleware('permission:user_management,can_edit');
        Route::delete('/users/{user}/permissions', [UserPermissionController::class, 'reset'])->middleware('permission:user_management,can_edit');

        // Employees & Checkers
        Route::get('/employees', [EmployeeController::class, 'index']);
        Route::post('/employees', [EmployeeController::class, 'store'])->middleware('permission:user_management,can_create');
        Route::put('/employees/{employee}', [EmployeeController::class, 'update'])->middleware('permission:user_management,can_edit');
        Route::patch('/employees/{employee}/toggle', [EmployeeController::class, 'toggle'])->middleware('permission:user_management,can_edit');
        Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy'])->middleware('permission:user_management,can_delete');
        Route::post('/employees/{employee}/resend-verification', [EmployeeController::class, 'resendVerification'])->middleware('permission:user_management,can_edit');

        Route::post('/checkers', [CheckerController::class, 'store'])->middleware('permission:user_management,can_create');
        Route::put('/checkers/{checker}', [CheckerController::class, 'update'])->middleware('permission:user_management,can_edit');
    });

    // System Settings & Branding mutations
    Route::middleware('permission:settings,can_edit')->group(function () {
        Route::put('/settings', [SettingController::class, 'update']);
        Route::post('/settings/logo', [SettingLogoController::class, 'upload']);
        Route::delete('/settings/logo', [SettingLogoController::class, 'remove']);

        Route::get('/alert-rules', [AlertRuleController::class, 'index']);
        Route::post('/alert-rules', [AlertRuleController::class, 'store']);
        Route::put('/alert-rules/{alert_rule}', [AlertRuleController::class, 'update']);
        Route::delete('/alert-rules/{alert_rule}', [AlertRuleController::class, 'destroy']);
        Route::patch('/alert-rules/{alert_rule}/toggle', [AlertRuleController::class, 'toggle']);
    });

    // Product & Catalog mutations (Guarded by products permissions)
    Route::middleware('permission:products,can_create')->group(function () {
        Route::post('/products', [ProductController::class, 'store']);
        Route::post('/products/restock', [ProductController::class, 'restock']);
        Route::post('/products/upload-image', [ProductController::class, 'uploadImage']);
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::post('/variants', [VariantController::class, 'storeType']);
        Route::post('/variants/{variant_type}/options', [VariantController::class, 'storeOption']);
    });

    Route::middleware('permission:products,can_edit')->group(function () {
        Route::put('/products/{product}', [ProductController::class, 'update']);
        Route::post('/products/{product}/damaged', [ProductController::class, 'logDamaged']);
        Route::put('/categories/{category}', [CategoryController::class, 'update']);
        Route::put('/variants/{variant_type}', [VariantController::class, 'updateType']);
        Route::put('/variant-options/{variant_option}', [VariantController::class, 'updateOption']);
    });

    Route::middleware('permission:products,can_delete')->group(function () {
        Route::delete('/products/{product}', [ProductController::class, 'destroy']);
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);
        Route::delete('/variants/{variant_type}', [VariantController::class, 'destroyType']);
        Route::delete('/variant-options/{variant_option}', [VariantController::class, 'destroyOption']);
    });

    // Activity Logs & Active User Sessions (Guarded by history_logs permission)
    Route::middleware('permission:history_logs,can_view')->group(function () {
        Route::get('/activity-logs', [ActivityLogController::class, 'index']);
        Route::get('/activity-logs/summary', [ActivityLogController::class, 'summary']);
        Route::get('/activity-logs/active-sessions', [ActivityLogController::class, 'activeSessions']);
        Route::post('/activity-logs/active-sessions/{token_id}/revoke', [ActivityLogController::class, 'revokeSession'])->middleware('permission:history_logs,can_delete');
        Route::post('/activity-logs/users/{user_id}/force-logout', [ActivityLogController::class, 'forceLogoutUser'])->middleware('permission:history_logs,can_delete');
    });

    // Checkers list (used by POS checkout, User Management checkers, and Settings)
    Route::get('/checkers', [CheckerController::class, 'index'])->middleware('permission:pos|user_management|settings,can_view');

    // POS routes: guarded by pos permission
    Route::middleware('permission:pos,can_view')->group(function () {
        Route::get('/pos/products', [PosController::class, 'products']);
        Route::post('/pos/checkout', [PosController::class, 'checkout'])->middleware('permission:pos,can_create');
    });

    // Transaction / History Log routes
    // Read: all authenticated roles; Write (refund/void/return/pay): strictly guarded by history_logs or sales_log permission (Admin / Supervisor)
    // Cashier is checkout only (POS) and cannot refund, return, void, or pay
    Route::get('/transactions', [TransactionController::class, 'index']);
    Route::get('/transactions/{transaction}', [TransactionController::class, 'show']);
    Route::post('/transactions/verify-pin', [TransactionController::class, 'verifyPin']);
    Route::middleware('permission:history_logs|sales_log,can_edit')->group(function () {
        Route::post('/transactions/{transaction}/refund', [TransactionController::class, 'refund']);
        Route::post('/transactions/{transaction}/return', [TransactionController::class, 'return']);
        Route::post('/transactions/{transaction}/void', [TransactionController::class, 'void']);
        Route::post('/transactions/{transaction}/pay', [TransactionController::class, 'pay']);
    });

    // Reservation routes: guarded by reservations permission
    Route::middleware('permission:reservations,can_view')->group(function () {
        Route::get('/reservations', [ReservationController::class, 'index']);
        Route::get('/reservations/{reservation}', [ReservationController::class, 'show']);
        Route::post('/reservations', [ReservationController::class, 'store'])->middleware('permission:reservations,can_create');
        Route::post('/reservations/{reservation}/fulfill', [ReservationController::class, 'fulfill'])->middleware('permission:reservations,can_edit');
        Route::post('/reservations/{reservation}/cancel', [ReservationController::class, 'cancel'])->middleware('permission:reservations,can_edit');
    });


    // Notifications: accessible to all authenticated users
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);

    // Logs: guarded by specific module permissions
    Route::get('/daily-sales', [ReportController::class, 'dailySales'])->middleware('permission:sales_log,can_view');
    Route::get('/customer-log', [ReportController::class, 'customerLog'])->middleware('permission:pos|sales_log|reports,can_view');

    // Dashboard & Reports Analytics (Accessible by dashboard or reports view permission)
    Route::get('/reports/sales-summary', [ReportController::class, 'salesSummary'])->middleware('permission:dashboard|reports,can_view');
    Route::get('/reports/product-performance', [ReportController::class, 'productPerformance'])->middleware('permission:dashboard|reports,can_view');

    // Full Reports Module (Generation Status, Finalizing, Refund/Void Analysis)
    Route::middleware('permission:reports,can_view')->group(function () {
        Route::get('/reports/generation-status', [ReportController::class, 'generationStatus']);
        Route::post('/reports/mark-generated', [ReportController::class, 'markGenerated']);
        Route::get('/reports/refund-void-analysis', [ReportController::class, 'refundVoidAnalysis']);
    });
    Route::get('/inventory', [ReportController::class, 'inventory'])->middleware('permission:inventory,can_view');


    // Example routes for RBAC testing
    Route::get('/admin/dashboard', function () {
        return response()->json(['message' => 'Admin Access Confirmed']);
    })->middleware('role:Admin');

    Route::get('/cashier/pos', function () {
        return response()->json(['message' => 'Cashier Access Confirmed']);
    })->middleware('role:Cashier');
});

