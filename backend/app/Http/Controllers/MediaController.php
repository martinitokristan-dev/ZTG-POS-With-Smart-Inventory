<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MediaController extends Controller
{
    /**
     * Serve public uploaded assets via backend proxy (legacy fallback).
     * New images are served directly from Cloudinary CDN.
     * This proxy remains only for assets uploaded before the Cloudinary migration
     * that may still be stored on local or R2 disk.
     */
    public function show(string $path)
    {
        // Sanitize path against directory traversal
        $cleanPath = ltrim(str_replace('..', '', $path), '/');

        // Check local public storage (primary fallback for legacy files)
        if (Storage::disk('public')->exists($cleanPath)) {
            return response()->file(Storage::disk('public')->path($cleanPath), [
                'Cache-Control'              => 'public, max-age=31536000, immutable',
                'Access-Control-Allow-Origin' => '*',
            ]);
        }

        return response()->json(['message' => 'Media asset not found.'], 404);
    }
}
