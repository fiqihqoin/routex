FROM php:8.4-fpm-alpine
WORKDIR /var/www/html

# Install system dependencies
RUN apk add --no-cache curl unzip libpq-dev

# Use mlocati/php-extension-installer to install extensions reliably
# This tool handles all necessary library dependencies and cross-compilation quirks automatically
COPY --from=mlocati/php-extension-installer /usr/bin/install-php-extensions /usr/local/bin/
RUN install-php-extensions pdo_pgsql intl zip redis

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Pre-install dependencies to leverage Docker cache
COPY composer.json composer.lock ./
RUN composer install --optimize-autoloader --no-scripts --ignore-platform-reqs

# Copy application files
COPY . .

# Cleanup and final setup
RUN rm -f .env && \
    php artisan storage:link 2>/dev/null || true && \
    chown -R www-data:www-data storage bootstrap/cache

EXPOSE 9000
CMD ["php-fpm"]
