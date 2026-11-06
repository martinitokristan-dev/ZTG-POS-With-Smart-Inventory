<?php

namespace App\Support;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

/**
 * Turns errors on API routes into plain sentences a cashier or admin can act on.
 *
 * - Messages written on purpose (validation, "Only pending transactions can be paid.", ...)
 *   are left alone.
 * - Laravel's built-in technical texts ("No query results for model [App\Models\...]",
 *   "This action is unauthorized.", "Too Many Attempts.", "Server Error") are replaced.
 * - An unexpected crash returns a friendly message plus a reference code; the full error is
 *   in the server log under the same code (see bootstrap/app.php). Internals (SQL, file paths)
 *   are only added as `debug` when APP_DEBUG is on, never in production.
 */
class ApiErrorResponse
{
    /** Built-in messages that are technical and get a plain replacement. */
    private const TECHNICAL_PATTERNS = [
        '/^$/',
        '/^No query results for model/i',
        '/^The route .* could not be found/i',
        '/^The \w+ method is not supported/i',
        '/^This action is unauthorized\.?$/i',
        '/^Too Many Attempts\.?$/i',
        '/^CSRF token mismatch\.?$/i',
        '/^(Server Error|Not Found|Forbidden|Unauthorized|Page Expired|Service Unavailable|Method Not Allowed|Content Too Large|Payload Too Large)$/i',
    ];

    /**
     * @return JsonResponse|null  null = let Laravel render it (message is already readable).
     */
    public static function for(Throwable $e): ?JsonResponse
    {
        if ($e instanceof ValidationException || $e instanceof HttpResponseException) {
            return null;
        }

        if ($e instanceof AuthenticationException) {
            return response()->json(['message' => 'Your session has expired. Please log in again.'], 401);
        }

        if ($e instanceof HttpExceptionInterface) {
            $status = $e->getStatusCode();
            if (!self::isTechnical($e->getMessage())) {
                return null;
            }
            if ($status >= 500) {
                return self::serverError($e, $status, $e->getHeaders());
            }

            return response()->json(['message' => self::plainMessage($status)], $status, $e->getHeaders());
        }

        return self::serverError($e, 500);
    }

    private static function isTechnical(string $message): bool
    {
        $message = trim($message);
        foreach (self::TECHNICAL_PATTERNS as $pattern) {
            if (preg_match($pattern, $message)) {
                return true;
            }
        }

        return false;
    }

    private static function plainMessage(int $status): string
    {
        return match ($status) {
            401     => 'Your session has expired. Please log in again.',
            403     => "You don't have permission to do this. Ask an Admin if you need access.",
            404     => 'This record was not found. It may have been deleted. Refresh the page and try again.',
            405     => 'This action is not available. Refresh the page and try again.',
            413     => 'The file is too large. Choose a smaller file and try again.',
            419     => 'Your session expired. Refresh the page and try again.',
            429     => 'Too many attempts. Please wait a minute and try again.',
            default => 'The request could not be completed. Please check your input and try again.',
        };
    }

    private static function serverError(Throwable $e, int $status, array $headers = []): JsonResponse
    {
        $reference = ErrorReference::current();
        $busy = in_array($status, [502, 503, 504], true);

        $body = [
            'message'   => $busy
                ? 'The server is busy or restarting. Please wait a moment and try again.'
                : "Something went wrong on our side. Please try again. If it keeps happening, tell the system admin this code: {$reference}.",
            'reference' => $reference,
        ];

        if (config('app.debug') && !app()->environment('production')) {
            $body['debug'] = [
                'error' => $e->getMessage(),
                'type'  => get_class($e),
                'at'    => basename($e->getFile()) . ':' . $e->getLine(),
            ];
        }

        return response()->json($body, $status, $headers);
    }
}
