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
use Illuminate\Support\Facades\Route;

// Public authentication & media routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [ForgotPasswordController::class, 'sendResetLink']);
Route::post('/reset-password', [ForgotPasswordController::class, 'resetPassword']);
Route::post('/auth/reveal-credentials', [StaffVerificationController::class, 'revealCredentials']);
Route::post('/auth/send-credential-backup', [StaffVerificationController::class, 'sendBackupEmail']);
Route::get('/media/{path}', [MediaController::class, 'show'])->where('path', '.*');

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

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

    // Admin-only management routes
    Route::middleware('role:Admin')->group(function () {
        // System health and incident root-cause analysis
        Route::get('/system-health/diagnostics', [SystemHealthController::class, 'diagnostics']);

        // General Settings update
        Route::put('/settings', [SettingController::class, 'update']);
        // Business logo — Admin-only (different from per-user avatar scoping)
        Route::post('/settings/logo', [SettingLogoController::class, 'upload']);
        Route::delete('/settings/logo', [SettingLogoController::class, 'remove']);

        // Category mutations
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::put('/categories/{category}', [CategoryController::class, 'update']);
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

        // Variant type and option mutations
        Route::post('/variants', [VariantController::class, 'storeType']);
        Route::put('/variants/{variant_type}', [VariantController::class, 'updateType']);
        Route::delete('/variants/{variant_type}', [VariantController::class, 'destroyType']);
        Route::post('/variants/{variant_type}/options', [VariantController::class, 'storeOption']);
        Route::put('/variant-options/{variant_option}', [VariantController::class, 'updateOption']);
        Route::delete('/variant-options/{variant_option}', [VariantController::class, 'destroyOption']);

        // Employee Management
        Route::get('/employees', [EmployeeController::class, 'index']);
        Route::post('/employees', [EmployeeController::class, 'store']);
        Route::put('/employees/{employee}', [EmployeeController::class, 'update']);
        Route::patch('/employees/{employee}/toggle', [EmployeeController::class, 'toggle']);

        // Checker Management
        Route::post('/checkers', [CheckerController::class, 'store']);
        Route::put('/checkers/{checker}', [CheckerController::class, 'update']);

        // Alert Rules
        Route::get('/alert-rules', [AlertRuleController::class, 'index']);
        Route::post('/alert-rules', [AlertRuleController::class, 'store']);
        Route::put('/alert-rules/{alert_rule}', [AlertRuleController::class, 'update']);
        Route::delete('/alert-rules/{alert_rule}', [AlertRuleController::class, 'destroy']);
        Route::patch('/alert-rules/{alert_rule}/toggle', [AlertRuleController::class, 'toggle']);

        // Products: write/mutation routes (Admin only)
        Route::post('/products', [ProductController::class, 'store']);
        Route::put('/products/{product}', [ProductController::class, 'update']);
        Route::delete('/products/{product}', [ProductController::class, 'destroy']);
        Route::post('/products/restock', [ProductController::class, 'restock']);
        Route::post('/products/{product}/damaged', [ProductController::class, 'logDamaged']);
        Route::post('/products/upload-image', [ProductController::class, 'uploadImage']);

        // Activity Logs & Active User Sessions (Admin only)
        Route::get('/activity-logs', [ActivityLogController::class, 'index']);
        Route::get('/activity-logs/summary', [ActivityLogController::class, 'summary']);
        Route::get('/activity-logs/active-sessions', [ActivityLogController::class, 'activeSessions']);
        Route::post('/activity-logs/active-sessions/{token_id}/revoke', [ActivityLogController::class, 'revokeSession']);
        Route::post('/activity-logs/users/{user_id}/force-logout', [ActivityLogController::class, 'forceLogoutUser']);
    });

    // POS routes: Admin and Cashier
    Route::middleware('role:Admin,Cashier')->group(function () {
        Route::get('/checkers', [CheckerController::class, 'index']);
        Route::get('/pos/products', [PosController::class, 'products']);
        Route::post('/pos/checkout', [PosController::class, 'checkout']);
    });

    // Transaction / History Log routes
    // Read: all authenticated roles; Write (refund/void): Admin + Cashier
    Route::get('/transactions', [TransactionController::class, 'index']);
    Route::get('/transactions/{transaction}', [TransactionController::class, 'show']);
    Route::post('/transactions/verify-pin', [TransactionController::class, 'verifyPin']);
    Route::middleware('role:Admin,Cashier')->group(function () {
        Route::post('/transactions/{transaction}/refund', [TransactionController::class, 'refund']);
        Route::post('/transactions/{transaction}/return', [TransactionController::class, 'return']);
        Route::post('/transactions/{transaction}/void', [TransactionController::class, 'void']);
        Route::post('/transactions/{transaction}/pay', [TransactionController::class, 'pay']);
    });

    // Reservation routes
    Route::get('/reservations', [ReservationController::class, 'index']);
    Route::get('/reservations/{reservation}', [ReservationController::class, 'show']);

    Route::middleware('role:Admin,Cashier')->group(function () {
        Route::post('/reservations', [ReservationController::class, 'store']);
        Route::post('/reservations/{reservation}/fulfill', [ReservationController::class, 'fulfill']);
        Route::post('/reservations/{reservation}/cancel', [ReservationController::class, 'cancel']);
    });


    // Notifications: accessible to all authenticated users
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);

    // Logs: Cashier + Admin
    Route::middleware('role:Admin,Cashier')->group(function () {
        Route::get('/daily-sales', [ReportController::class, 'dailySales']);
        Route::get('/customer-log', [ReportController::class, 'customerLog']);
    });

    // Admin Reports & Inventory summary
    Route::middleware('role:Admin')->group(function () {
        Route::get('/reports/generation-status', [ReportController::class, 'generationStatus']);
        Route::post('/reports/mark-generated', [ReportController::class, 'markGenerated']);
        Route::get('/reports/sales-summary', [ReportController::class, 'salesSummary']);
        Route::get('/reports/product-performance', [ReportController::class, 'productPerformance']);
        Route::get('/reports/refund-void-analysis', [ReportController::class, 'refundVoidAnalysis']);
        Route::get('/inventory', [ReportController::class, 'inventory']);
    });


    // Example routes for RBAC testing
    Route::get('/admin/dashboard', function () {
        return response()->json(['message' => 'Admin Access Confirmed']);
    })->middleware('role:Admin');

    Route::get('/cashier/pos', function () {
        return response()->json(['message' => 'Cashier Access Confirmed']);
    })->middleware('role:Cashier');
});

