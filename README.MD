# Подготовка после клонирования репозитория

## Создать файл .env

```env
# Database Configuration
DB_HOST=
DB_PORT=
DB_USER=
DB_NAME=
DB_PASSWORD=
POSTGRES_PASSWORD=
POSTGRES_HOST_AUTH_METHOD=scram-sha-256

# Application Configuration
PORT=80

# Google login data
GOOGLE_LOGIN_CLIENT_ID=""
GOOGLE_LOGIN_CLIENT_SECRET=""
GOOGLE_LOGIN_SUCCESS_REDIRECT_URL="https://buildmeister.no"
GOOGLE_LOGIN_FAILURE_REDIRECT_URL="https://buildmeister.no/account/login"

# AWS S3 Configuration для Yandex S3
# ID ключа доступа (в интерфейсе Yandex S3)
AWS_ACCESS_KEY_ID=  
# Секретный ключ доступа
AWS_SECRET_ACCESS_KEY=
# Имя бакета
AWS_BUCKET_NAME=    
# Регион  
AWS_REGION=ru-central1       
AWS_ENDPOINT=https://storage.yandexcloud.net 
AWS_S3_FORCE_PATH_STYLE=true

# мониторинг (опционально)
GRAFANA_ADMIN_USER=
GRAFANA_ADMIN_PASSWORD=
PROMETHEUS_RETENTION_TIME=30d
```

## Подготовка файлов

- Положить бэкап в `backups/`
Пример названия файла: backup_20260121_215645.dump, где 20260121_215645 это дата_время его создания. Такой бэкап создаётся скриптом db:export
- Положить данные SSL сертификата в `secrets/`:
  - `secrets/key.pem`
  - `secrets/cert.pem`

  Убедитесь, что файлы имеют правильные права:
```bash
chmod 644 secrets/cert.pem
chmod 600 secrets/key.pem
```

Подробнее см. в `nginx/README.md`

# Запуск приложения

## Локальный запуск

- Изменить HOST в .env

```env
DB_HOST=localhost
```
- Установить зависимости: `npm install`

- Собрать приложение: `npm run build` 
  
  **Примечание:** Компиляция расширений и темы выполняется автоматически при `npm run build` через `prebuild` hook, поэтому убедитесь, что все зависимости установлены перед сборкой.

- `npm start `

Подробнее в docs/QUICKSTART.md

## Запуск в Docker

- Изменить HOST в .env

```env
DB_HOST=database
```

- Установить зависимости: `npm install`

- Собрать приложение: `npm run build` 

  Приложение необходимо собирать до docker, т.к. докер сборку не выполняет, а лишь копирует папку `.evershop/dist` в контейнер в целях экономии времени. 
  
  **Примечание:** Компиляция расширений и темы выполняется автоматически при `npm run build` через `prebuild` hook, поэтому убедитесь, что все зависимости установлены перед сборкой.
  
  Если вам нужно, чтобы проект собирался в докере, то необходимо изменить Dockerfile и закомментировать строку копирования папки `.evershop/dist` в контейнер, а также добавить строку `npm run build`.

- `docker compose down -v` (остановка и удаление контейнеров)
- `docker compose build --no-cache` (сборка контейнеров)
- `docker compose up` (запуск контейнеров)

# Работа с базой данных
При создании контейнера restore БД выполняется автоматически. Но если понадобилось сделать это вручную:

Зайти в контейнер app:
- `docker compose exec -it app sh`

Там можно запустить restore БД:
- `npm run db:import backups/backup_name.dump`

ИЛИ

- `docker compose exec app npm run db:import backups/backup_name.dump`

## Создание дампа

- `docker compose exec app npm run db:export`

ИЛИ использовать команду с автоматическим определением последнего файла:

- `docker cp buildmeister-app-1:/backups/$(docker compose exec -T app sh -c 'ls -t /app/backups/backup_*.dump | head -1 | xargs basename') ./backups/`

## Копирование файла дампа в хост систему
- `docker compose cp app:/backups/backup_name.dump ./backups/`