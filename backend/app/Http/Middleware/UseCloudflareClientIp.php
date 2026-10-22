<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Make $request->ip() return the visitor's real IP when the app runs behind Cloudflare.
 *
 * On Render every request goes visitor -> Cloudflare -> Render's proxy -> app. With
 * trustProxies('*') Laravel takes the right-most X-Forwarded-For entry, which is a
 * Cloudflare server, and that changes from request to request. Login, PIN and route
 * throttles keyed on the IP then never reached their limit, and unrelated visitors could
 * share a counter.
 *
 * Cloudflare always sets CF-Connecting-IP itself (a visitor cannot keep their own value),
 * so when it is present and valid it replaces X-Forwarded-For. The trusted-proxy rules then
 * resolve ip() to that value; X-Forwarded-Proto/Host are untouched.
 *
 * Enabled by `app.trust_cloudflare_ip` (TRUST_CLOUDFLARE_IP, on by default in production).
 * Keep it off where the app is reachable without Cloudflare, or the header could be forged.
 */
class UseCloudflareClientIp
{
    public function handle(Request $request, Closure $next): Response
    {
        if (config('app.trust_cloudflare_ip')) {
            $cfIp = trim((string) $request->headers->get('CF-Connecting-IP', ''));
            if ($cfIp !== '' && filter_var($cfIp, FILTER_VALIDATE_IP) !== false) {
                $request->headers->set('X-Forwarded-For', $cfIp);
            }
        }

        return $next($request);
    }
}
