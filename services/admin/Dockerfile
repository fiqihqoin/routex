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

# PHP-FPM Pool Configuration - Optimized for high throughput
# Increase from default 5 to 50 workers for better concurrency
RUN sed -i 's|^pm.max_children = .*|pm.max_children = 50|' \
    /usr/local/etc/php-fpm.d/www.conf && \
    sed -i 's|^pm.start_servers = .*|pm.start_servers = 10|' \
    /usr/local/etc/php-fpm.d/www.conf && \
    sed -i 's|^pm.min_spare_servers = .*|pm.min_spare_servers = 5|' \
    /usr/local/etc/php-fpm.d/www.conf && \
    sed -i 's|^pm.max_spare_servers = .*|pm.max_spare_servers = 20|' \
    /usr/local/etc/php-fpm.d/www.conf && \
    echo "pm.max_requests = 500" >> /usr/local/etc/php-fpm.d/www.conf && \
    echo "PHP-FPM pool config:" && \
    grep -E "^pm\." /usr/local/etc/php-fpm.d/www.conf

# Final setup
RUN rm -f .env && \
    php artisan storage:link 2>/dev/null || true && \
    chown -R www-data:www-data storage bootstrap/cache && \
    mkdir -p /run/nginx && \
    chown -R www-data:www-data /var/lib/nginx /run/nginx

EXPOSE 9000

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]