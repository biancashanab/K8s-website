FROM vvveb/vvvebcms:latest

COPY ./project/html /var/www/html

RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html \
    && chmod -R 775 /var/www/html/public/page-cache /var/www/html/storage/cache

EXPOSE 80
