# Pinned to a patched release: 8.2.35 fixes PHP2Shell (CVE-2026-109618, CVE-2026-109619).
# A floating tag like 8.2-apache can come from an old build cache. Bump this on every PHP security release.
FROM php:8.2.35-apache

# Install dependencies
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg62-turbo-dev \
    libfreetype-dev \
    libwebp-dev \
    libzip-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    curl \
    libpq-dev

# Clear cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
# - zip: required by phpoffice/phpspreadsheet (Excel product import)
# - gd with JPEG/WebP/FreeType: the import reads pictures from the sheet and writes JPEG thumbnails
RUN docker-php-ext-configure gd --with-jpeg --with-freetype --with-webp \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd pdo_pgsql zip

# Get latest Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Increase PHP upload limit to match frontend's 12MB validation limit
RUN echo "upload_max_filesize = 15M" > /usr/local/etc/php/conf.d/uploads.ini \
    && echo "post_max_size = 20M" >> /usr/local/etc/php/conf.d/uploads.ini

# Don't advertise the PHP version (the X-Powered-By header showed it to everyone).
RUN echo "expose_php = Off" > /usr/local/etc/php/conf.d/security.ini

# Set working directory
WORKDIR /var/www/html

# Copy existing application directory contents
COPY . .

# Copy custom Apache virtual host file
COPY vhost.conf /etc/apache2/sites-available/000-default.conf

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# Install Laravel dependencies
RUN composer install --no-interaction --prefer-dist --optimize-autoloader

# Set permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
RUN chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Expose port 80
EXPOSE 80

# Make startup script executable
RUN chmod +x start.sh

# Run startup script
CMD ["/var/www/html/start.sh"]
