# Настройка SSL для Nginx

## ⚠️ ВАЖНО: Перед первым запуском

Nginx требует наличия SSL сертификатов для запуска. 

После получения SSL сертификата от провайдера, поместите файлы в папку `secrets/`:

## Структура файлов в secrets/:

```
secrets/
├── cert.pem      # SSL сертификат (или .crt файл)
└── key.pem       # Приватный ключ (уже должен быть там)
```

## Имена файлов

Nginx ожидает следующие имена файлов:
- **cert.pem** - SSL сертификат (может быть переименован из .crt или .pem)
- **key.pem** - Приватный ключ (уже должен быть создан при генерации CSR)

### Если у вас другие имена файлов

Если провайдер выдал файлы с другими именами (например, `certificate.crt` и `private.key`), переименуйте их:

```bash
# Пример: если получили certificate.crt и private.key
cp secrets/certificate.crt secrets/cert.pem
cp secrets/private.key secrets/key.pem
```

Или обновите пути в `nginx.conf`:
```nginx
ssl_certificate /etc/nginx/ssl/certificate.crt;
ssl_certificate_key /etc/nginx/ssl/private.key;
```

### Права доступа

Убедитесь, что файлы имеют правильные права:
```bash
chmod 644 secrets/cert.pem
chmod 600 secrets/key.pem
```

## Запуск

После размещения сертификатов в `secrets/`:

```bash
docker-compose down
docker-compose up -d
```

## Проверка

После запуска проверьте логи nginx:
```bash
docker-compose logs nginx
```

Если все правильно, сайт будет доступен по HTTPS: `https://buildmeister.no`

## Что было настроено

✅ Nginx добавлен в docker-compose.yml как reverse proxy  
✅ Настроен автоматический редирект HTTP → HTTPS  
✅ Настроены заголовки безопасности  
✅ Поддержка WebSocket для реального времени  
✅ Оптимизация для статических файлов  
