<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use CloudinaryLabs\CloudinaryLaravel\Facades\Cloudinary;

/**
 * Business Logo Upload / Remove — Admin-only endpoint.
 * Uploads to Cloudinary for reliable, permanent CDN URLs.
 */
class SettingLogoController extends Controller
{
    /**
     * Upload or replace the business logo.
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'logo' => [
                'required',
                'file',
                'mimes:jpeg,jpg,png,gif,webp,heic,heif,avif,bmp',
                'max:12288',
            ],
            'sidebar_logo' => [
                'nullable',
                'file',
                'mimes:jpeg,jpg,png,gif,webp,heic,heif,avif,bmp',
                'max:12288',
            ],
        ]);

        $existing = Setting::where('key', 'business_logo')->first();

        // Delete old logo from Cloudinary if present
        if ($existing && $existing->value) {
            $this->deleteCloudinaryImage($existing->value);
        }

        $file = $request->file('logo');
        $result = Cloudinary::upload($file->getRealPath(), [
            'folder'        => 'logos',
            'resource_type' => 'image',
            'transformation' => ['quality' => 'auto', 'fetch_format' => 'auto'],
        ]);
        $url = $result->getSecurePath();

        Setting::updateOrCreate(
            ['key' => 'business_logo'],
            ['value' => $url]
        );

        $sidebarUrl = null;

        // Handle optional sidebar_logo (circle cropped image)
        if ($request->hasFile('sidebar_logo')) {
            $existingSidebar = Setting::where('key', 'sidebar_logo')->first();
            if ($existingSidebar && $existingSidebar->value) {
                $this->deleteCloudinaryImage($existingSidebar->value);
            }

            $sidebarFile = $request->file('sidebar_logo');
            $sidebarResult = Cloudinary::upload($sidebarFile->getRealPath(), [
                'folder'        => 'logos',
                'resource_type' => 'image',
                'transformation' => ['quality' => 'auto', 'fetch_format' => 'auto'],
            ]);
            $sidebarUrl = $sidebarResult->getSecurePath();

            Setting::updateOrCreate(
                ['key' => 'sidebar_logo'],
                ['value' => $sidebarUrl]
            );
        } else {
            $existingSidebar = Setting::where('key', 'sidebar_logo')->first();
            $sidebarUrl = $existingSidebar ? $existingSidebar->value : null;
        }

        return response()->json([
            'message'          => 'Business logo uploaded successfully.',
            'logo_url'         => $url,
            'sidebar_logo_url' => $sidebarUrl,
        ]);
    }

    /**
     * Remove the business logo.
     */
    public function remove(Request $request): JsonResponse
    {
        $setting = Setting::where('key', 'business_logo')->first();
        if ($setting && $setting->value) {
            $this->deleteCloudinaryImage($setting->value);
            $setting->update(['value' => null]);
        }

        $sidebarSetting = Setting::where('key', 'sidebar_logo')->first();
        if ($sidebarSetting && $sidebarSetting->value) {
            $this->deleteCloudinaryImage($sidebarSetting->value);
            $sidebarSetting->update(['value' => null]);
        }

        return response()->json([
            'message'          => 'Business logo removed.',
            'logo_url'         => null,
            'sidebar_logo_url' => null,
        ]);
    }

    /**
     * Delete an image from Cloudinary by extracting its public_id from the URL.
     */
    private function deleteCloudinaryImage(?string $url): void
    {
        if (!$url || !str_contains($url, 'res.cloudinary.com')) return;
        try {
            if (preg_match('/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z]+)?$/i', $url, $matches)) {
                Cloudinary::destroy($matches[1]);
            }
        } catch (\Throwable $e) {
            Log::warning('SettingLogo: could not delete Cloudinary image.', [
                'url'   => $url,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
