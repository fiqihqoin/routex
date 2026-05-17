FROM php:8.4-fpm-alpine
WORKDIR /var/www/html

# Install system dependencies + NGINX + Supervisor
RUN apk add --no-cache \
    curl unzip libpq-dev \
    nginx \
    supervisor

# Install PHP extensions
COPY --from=mlocati/php-extension-installer \
    /usr/bin/install-php-extensions \
    /usr/local/bin/
RUN install-php-extensions pdo_pgsql intl zip redis

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Pre-install dependencies
COPY composer.json composer.lock ./
RUN composer install \
    --optimize-autoloader \
    --no-scripts \
    --ignore-platform-reqs

# Copy application files
COPY . .

# Copy configs
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY supervisord.conf /etc/supervisord.conf

# PHP-FPM listen di 9001 (9000 dipakai NGINX)
# Fix di www.conf DAN docker.conf (docker.conf yang jadi override)
RUN sed -i 's|^listen = .*|listen = 127.0.0.1:9001|' \
    /usr/local/etc/php-fpm.d/www.conf && \
    sed -i 's|^listen = .*|listen = 127.0.0.1:9001|' \
    /usr/local/etc/php-fpm.d/docker.conf && \
    echo "PHP-FPM listen config:" && \
    grep "^listen" /usr/local/etc/php-fpm.d/docker.conf

# Final setup
RUN rm -f .env && \
    php artisan storage:link 2>/dev/null || true && \
    chown -R www-data:www-data storage bootstrap/cache && \
    mkdir -p /run/nginx && \
    chown -R www-data:www-data /var/lib/nginx /run/nginx

EXPOSE 9000

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]