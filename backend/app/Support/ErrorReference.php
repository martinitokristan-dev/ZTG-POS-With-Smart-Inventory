<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * A short code that ties an error shown to a user to the full entry in the server log.
 *
 * The same code is written into the log context (bootstrap/app.php `context`) and returned
 * in the JSON error response, so "Reference: ERR-7K3QX2" on screen finds the exact log line.
 * One code per request.
 */
class ErrorReference
{
    private const CONTAINER_KEY = 'error.reference';

    /** The code for the current request, created the first time it is asked for. */
    public static function current(): string
    {
        $app = app();
        if (!$app->bound(self::CONTAINER_KEY)) {
            $app->instance(self::CONTAINER_KEY, 'ERR-' . strtoupper(Str::random(6)));
        }

        return $app->make(self::CONTAINER_KEY);
    }
}
