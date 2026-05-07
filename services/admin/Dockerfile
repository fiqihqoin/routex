FROM php:8.4-fpm-alpine
WORKDIR /var/www/html

# Install system dependencies
RUN apk add --no-cache libpq-dev curl unzip icu-dev libzip-dev zlib-dev autoconf gcc g++ make

# Install PHP extensions
RUN docker-php-ext-install pdo_pgsql intl zip

# Install Redis extension via PECL
RUN pecl install redis && docker-php-ext-enable redis

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY composer.json composer.lock ./
RUN composer install --optimize-autoloader --no-scripts --ignore-platform-reqs
COPY . .
RUN rm -f .env
RUN php artisan storage:link 2>/dev/null || true
EXPOSE 9000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=9000"]
