<?php

namespace App\Services\Products\Import\Images;

/**
 * Uploads a picture taken from the Excel file and returns its public URL.
 */
interface ImportImageUploader
{
    /**
     * Upload a local picture.
     *
     * @param string $path Absolute path of the picture.
     * @return string Public URL to store in `products.image`.
     * @throws \Throwable When the upload fails (the product is then saved without a picture).
     */
    public function upload(string $path): string;
}
