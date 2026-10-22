<?php

namespace App\Services\Products\Import\Images;

use CloudinaryLabs\CloudinaryLaravel\Facades\Cloudinary;

/**
 * Uploads import pictures to Cloudinary with the same options as the product form upload.
 *
 * @see \App\Http\Controllers\ProductController::uploadImage()
 */
class CloudinaryImportImageUploader implements ImportImageUploader
{
    /**
     * {@inheritDoc}
     */
    public function upload(string $path): string
    {
        $result = Cloudinary::uploadApi()->upload($path, [
            'folder'         => config('product_import.image_folder', 'products'),
            'resource_type'  => 'image',
            'transformation' => ['quality' => 'auto', 'fetch_format' => 'auto'],
        ]);

        $url = $result['secure_url'] ?? $result['url'] ?? null;
        if (!$url) {
            throw new \RuntimeException('Cloudinary returned no URL.');
        }

        return (string) $url;
    }
}
