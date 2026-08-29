<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateSettingsRequest;
use App\Models\Setting;
use App\Services\Settings\SettingService;
use Illuminate\Http\JsonResponse;

class SettingController extends Controller
{
    protected SettingService $settingService;

    public function __construct(SettingService $settingService)
    {
        $this->settingService = $settingService;
    }

    /**
     * Display a listing of the resource settings.
     */
    public function index(): JsonResponse
    {
        return response()->json($this->settingService->getAll());
    }

    /**
     * Update the settings in bulk.
     */
    public function update(UpdateSettingsRequest $request): JsonResponse
    {
        $this->settingService->updateSettings($request->validated()['settings']);

        return response()->json([
            'message'  => 'Settings updated successfully.',
            'settings' => $this->settingService->getAll()
        ]);
    }

    /**
     * Return the current next SI number for each doc type (read-only, no increment).
     * Called by the Checkout Modal on open so it can pre-fill the SI field in Auto mode.
     * Cashier never sees the "mode" label — this is silently consumed by the frontend.
     */
    public function siPreview(): JsonResponse
    {
        return response()->json($this->settingService->getSiPreview());
    }

    /**
     * Return only the public-safe branding fields for the login page.
     * No authentication required — exposes only cosmetic identity fields.
     */
    public function publicBranding(): JsonResponse
    {
        return response()->json([
            'business_name' => Setting::where('key', 'business_name')->value('value'),
            'business_logo' => Setting::where('key', 'business_logo')->value('value'),
        ]);
    }
}

