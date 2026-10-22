<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(
            \App\Services\Products\Import\Images\ImportImageUploader::class,
            \App\Services\Products\Import\Images\CloudinaryImportImageUploader::class
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Force HTTPS on production (Render reverse proxy).
        // Avoid request()->server() here — unsafe during config:cache boot on PHP 8.2
        if (app()->environment('production') || str_contains((string) config('app.url'), 'https://')) {
            \Illuminate\Support\Facades\URL::forceScheme('https');
        }

        // Realtime is best-effort: a Pusher outage is logged instead of failing the request
        // (see ResilientPusherBroadcaster). Same Pusher client Laravel would build itself.
        \Illuminate\Support\Facades\Broadcast::extend('pusher', function ($app, array $config) {
            return new \App\Broadcasting\ResilientPusherBroadcaster(
                $app->make(\Illuminate\Broadcasting\BroadcastManager::class)->pusher($config),
                $config['jsonp'] ?? false
            );
        });

        // Literal "contains" search: % and _ typed by the user are not wildcards (see LikeSearch).
        \Illuminate\Database\Query\Builder::macro('whereContains', function (string $column, string $term) {
            /** @var \Illuminate\Database\Query\Builder $this */
            return \App\Support\LikeSearch::apply($this, $column, $term, 'and');
        });
        \Illuminate\Database\Query\Builder::macro('orWhereContains', function (string $column, string $term) {
            /** @var \Illuminate\Database\Query\Builder $this */
            return \App\Support\LikeSearch::apply($this, $column, $term, 'or');
        });

        \App\Models\Product::observe(\App\Observers\ProductObserver::class);
        \App\Models\Transaction::observe(\App\Observers\TransactionObserver::class);
    }
}
