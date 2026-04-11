# Настройка SSL для Nginx

## ⚠️ ВАЖНО: Перед первым запуском

Nginx требует наличия SSL сертификатов для запуска.

Файлы лежат в **`nginx/ssl/`**. В `docker-compose.yml` эта директория монтируется в контейнер как `/etc/nginx/ssl`.

## Структура файлов в `nginx/ssl/`

```
nginx/ssl/
├── cert.pem           # листовой сертификат домена (от провайдера, часто только «ваш» без цепочки)
├── intermediate.crt   # промежуточный сертификат CA (скачивается у издателя, например DigiCert)
├── fullchain.pem      # сцепка: сначала cert.pem, затем intermediate.crt — его указывает nginx
├── key.pem            # приватный ключ
└── nginx.conf         # отдельный конфиг для сценария `docker-compose.nginx.yml` (локально / host network)
```

Основной продовый конфиг: **`nginx/nginx.conf`** — там заданы `ssl_certificate` (обычно **`fullchain.pem`**) и `ssl_certificate_key` (**`key.pem`**).

### Промежуточный сертификат (цепочка доверия)

Имеет смысл помнить: **одного только `cert.pem` часто недостаточно.** Многие провайдеры отдают лист отдельно от промежуточного CA. Если nginx отдаёт только лист, клиенты получают ошибку неполной цепочки (`unable to verify the first certificate` и т.п.).

Нужно:

1. Скачать промежуточный сертификат у вашего CA (для GeoTrust TLS RSA CA G1 у DigiCert, например: `https://cacerts.digicert.com/GeoTrustTLSRSACAG1.crt.pem`) и сохранить как `nginx/ssl/intermediate.crt`.
2. Собрать цепочку (сначала лист, потом промежуточный):

   ```bash
   cat nginx/ssl/cert.pem nginx/ssl/intermediate.crt > nginx/ssl/fullchain.pem
   ```

3. В `nginx/nginx.conf` должно быть что-то вроде:

   ```nginx
   ssl_certificate     /etc/nginx/ssl/fullchain.pem;
   ssl_certificate_key /etc/nginx/ssl/key.pem;
   ```

4. Перезагрузить nginx (после `nginx -t`): например `docker compose exec nginx nginx -s reload` или `docker compose restart nginx`.

Проверка снаружи:

```bash
echo | openssl s_client -connect buildmeister.no:443 -servername buildmeister.no 2>&1
```

Ожидается: **`verify return code: 0 (ok)`** в выводе. 

### Права доступа

```bash
chmod 644 nginx/ssl/cert.pem nginx/ssl/fullchain.pem nginx/ssl/intermediate.crt
chmod 600 nginx/ssl/key.pem
```

## Запуск

После размещения сертификатов в **`nginx/ssl/`**:

```bash
docker compose down
docker compose up -d
```

## Проверка

Логи nginx:

```bash
docker compose logs nginx
```

Если всё настроено, сайт доступен по HTTPS, например `https://buildmeister.no`.