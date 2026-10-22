<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Broadcaster
    |--------------------------------------------------------------------------
    | This option controls the default broadcaster that will be used by the
    | framework when an event needs to be broadcast. You may set this to
    | any of the connections defined in the "connections" array below.
    |
    | Supported: "pusher", "ably", "reverb", "redis", "log", "null"
    */

    'default' => env('BROADCAST_CONNECTION', 'null'),

    /*
    |--------------------------------------------------------------------------
    | Broadcast Connections
    |--------------------------------------------------------------------------
    */

    'connections' => [

        'pusher' => [
            'driver' => 'pusher',
            'key'    => env('PUSHER_APP_KEY'),
            'secret' => env('PUSHER_APP_SECRET'),
            'app_id' => env('PUSHER_APP_ID'),
            'options' => [
                'cluster'   => env('PUSHER_APP_CLUSTER'),
                'useTLS'    => true,
                'encrypted' => true,
            ],
            'client_options' => [
                // Guzzle options. Laravel's default waits up to 30 s for Pusher on every
                // broadcast, which froze saves when Pusher was unreachable. Fail fast instead;
                // the request continues either way (ResilientPusherBroadcaster).
                'connect_timeout' => (float) env('PUSHER_CONNECT_TIMEOUT', 3),
                'timeout'         => (float) env('PUSHER_TIMEOUT', 5),
            ],
        ],

        'ably' => [
            'driver' => 'ably',
            'key'    => env('ABLY_KEY'),
        ],

        'reverb' => [
            'driver'  => 'reverb',
            'key'     => env('REVERB_APP_KEY'),
            'secret'  => env('REVERB_APP_SECRET'),
            'app_id'  => env('REVERB_APP_ID'),
            'options' => [
                'host'     => env('REVERB_HOST', '0.0.0.0'),
                'port'     => env('REVERB_PORT', 8080),
                'scheme'   => env('REVERB_SCHEME', 'http'),
                'useTLS'   => env('REVERB_SCHEME', 'http') === 'https',
            ],
        ],

        'log' => [
            'driver' => 'log',
        ],

        'null' => [
            'driver' => 'null',
        ],

    ],

];
