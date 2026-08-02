<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use CloudinaryLabs\CloudinaryLaravel\Facades\Cloudinary;

class ProfileAvatarController extends Controller
{
    /**
     * Upload a new profile photo for the authenticated user.
     *
     * Security guarantees:
     *  1. Validation rejects non-image files, enforces allowed MIME types and 12 MB cap.
     *  2. $request->user() scopes the update to the authenticated user — no ID in the request body.
     *  3. Old-file deletion is wrapped in its own try/catch; failure is logged but never
     *     blocks the new upload from succeeding.
     */
    public function upload(Request $request): JsonResponse
    {
        // ── 1. Validation ──────────────────────────────────────────────────────
        $request->validate([
            'avatar' => [
                'required',
                'file',
                'mimes:jpeg,jpg,png,gif,webp,heic,heif,avif,bmp',
                'max:12288',                          // 12 MB limit
            ],
        ]);

        // ── 2. Scope to authenticated user — no request-supplied ID ──────────
        $user = $request->user();

        // ── 3. Delete old avatar from Cloudinary — failure never blocks new upload ─
        if ($user->profile_photo) {
            $this->deleteCloudinaryImage($user->profile_photo);
        }

        // ── 4. Upload to Cloudinary ────────────────────────────────────────────
        $file = $request->file('avatar');
        $result = Cloudinary::upload($file->getRealPath(), [
            'folder'        => 'avatars',
            'resource_type' => 'image',
            'transformation' => ['quality' => 'auto', 'fetch_format' => 'auto'],
        ]);
        $url = $result->getSecurePath();

        $user->update(['profile_photo' => $url]);

        return response()->json([
            'message'       => 'Profile photo uploaded successfully.',
            'profile_photo' => $url,
        ]);
    }

    /**
     * Remove the authenticated user's profile photo.
     * Scoped to $request->user() — no request body needed.
     */
    public function remove(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->profile_photo) {
            $this->deleteCloudinaryImage($user->profile_photo);
            $user->update(['profile_photo' => null]);
        }

        return response()->json([
            'message'       => 'Profile photo removed.',
            'profile_photo' => null,
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
            Log::warning('ProfileAvatar: could not delete Cloudinary image.', [
                'url'     => $url,
                'error'   => $e->getMessage(),
            ]);
        }
    }
}
