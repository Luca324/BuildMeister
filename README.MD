# Подготовка после клонирования репозитория

## Создать файл .env

```env
# Database Configuration
DB_HOST=
DB_PORT=
DB_USER=
DB_NAME=
DB_PASSWORD=

# Application Configuration
PORT=80

# Google login data
GOOGLE_LOGIN_CLIENT_ID=""
GOOGLE_LOGIN_CLIENT_SECRET=""
GOOGLE_LOGIN_SUCCESS_REDIRECT_URL="https://buildmeister.no"
GOOGLE_LOGIN_FAILURE_REDIRECT_URL="https://buildmeister.no/account/login"
```

## Подготовка файлов

- Положить бэкап в `backups/`
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

- В папке `themes/tech/` выполнить команду: `npm run compile`
- В папке для каждого extension, например, `extensions/categories_widget/` выполнить команду: `npm run compile`
- В корне проекта выполнить:
  - `npm run build`
  - `npm start`

## Запуск в Docker

- Собрать приложение: `npm install && npm run build`

  Приложение необходимо собирать до docker, т.к. докер сборку не выполняет, а лишь копирует папку `.evershop/dist` в контейнер в целях экономии времени. Если вам нужно, чтобы проект собирался в докере, то необходимо изменить Dockerfile и закомментировать строку копирования папки `.evershop/dist` в контейнер, а также добавить строку `npm run build`.

- `docker compose down -v` (остановка и удаление контейнеров)
- `docker compose build --no-cache` (сборка контейнеров)

# Работа с контейнером

Если нужно попасть в контейнер app:
- `docker compose exec -it app sh`

Там можно запустить restore БД:
- `npm run db:import backups/backup_name.dump`

ИЛИ

- `docker compose exec app npm run db:import backups/backup_name.dump`

# Работа с базой данных

## Создание дампа

- `docker compose exec app npm run db:export`

ИЛИ использовать команду с автоматическим определением последнего файла:

- `docker cp buildmeister-app-1:/backups/$(docker compose exec -T app sh -c 'ls -t /app/backups/backup_*.dump | head -1 | xargs basename') ./backups/`
