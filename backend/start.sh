#!/usr/bin/env bash

# Clear any stale cached config from previous deploy
php artisan config:clear
php artisan route:clear

# Cache configuration, routes, and events for production performance.
# No `php artisan optimize` here: it would only add view:cache, which fails
# because this API has no resources/views folder.
php artisan config:cache
php artisan route:cache
php artisan event:cache

# Run migrations (force since it's in production)
php artisan migrate --force

# Start Apache in the foreground
exec apache2-foreground
