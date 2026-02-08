FROM nginx:alpine

# Копируем конфигурацию nginx
COPY ssl/nginx.conf /etc/nginx/nginx.conf

# Копируем SSL сертификаты
COPY ssl/cert.pem /etc/nginx/ssl/cert.pem
COPY ssl/key.pem /etc/nginx/ssl/key.pem

# Создаем директорию для логов
RUN mkdir -p /var/log/nginx

# Открываем порты
EXPOSE 80 443

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"]

