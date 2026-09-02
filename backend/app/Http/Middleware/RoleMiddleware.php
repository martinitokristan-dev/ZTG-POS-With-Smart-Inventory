<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Get the string value of the role (handling backing enum if present)
        $userRole = is_object($user->role) ? $user->role->value : $user->role;

        if (! in_array($userRole, $roles)) {
            return response()->json(['message' => 'Access forbidden. Insufficient permissions.'], 403);
        }

        return $next($request);
    }
}
