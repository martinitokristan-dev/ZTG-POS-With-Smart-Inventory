<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'broadcasting/auth', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // Production only accepts the live frontend (plus ALLOWED_ORIGINS). Local dev servers and
    // Cloudflare preview deployments (*.pos-hep.pages.dev) are accepted outside production, or
    // in production when CORS_ALLOW_PREVIEW_ORIGINS=true (e.g. while testing a preview build).
    'allowed_origins' => array_values(array_unique(array_merge(
        ['https://pos-hep.pages.dev'],
        (env('APP_ENV', 'production') !== 'production') ? [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:5173',
            'http://127.0.0.1:5173',
        ] : [],
        array_filter(
            array_map('trim', explode(',', env('ALLOWED_ORIGINS', ''))),
            fn($v) => $v !== ''
        )
    ))),

    'allowed_origins_patterns' => (env('APP_ENV', 'production') !== 'production'
        || filter_var(env('CORS_ALLOW_PREVIEW_ORIGINS', false), FILTER_VALIDATE_BOOLEAN))
        ? ['#^https://([a-zA-Z0-9-]+\.)?pos-hep\.pages\.dev$#']
        : [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
