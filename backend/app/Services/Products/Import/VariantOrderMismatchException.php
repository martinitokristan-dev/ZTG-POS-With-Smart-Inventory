<?php

namespace App\Services\Products\Import;

/**
 * The variants read back after a bulk insert did not match the rows that were written,
 * so their option links cannot be assigned safely. The family is rolled back and saved
 * again through the row-by-row path.
 */
class VariantOrderMismatchException extends \RuntimeException
{
}
