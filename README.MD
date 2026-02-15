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

### Автоматическая компиляция (рекомендуется)

Компиляция расширений и темы выполняется автоматически перед сборкой через `prebuild` hook:

```bash
npm run build  # Автоматически скомпилирует все расширения и тему перед сборкой
npm start
```
Подробнее в docs/QUICKSTART.md

### Ручная компиляция (опционально)

Если нужно скомпилировать расширения и тему вручную:

```bash
# Компиляция всех расширений и темы
npm run prebuild

# Или по отдельности:
cd themes/tech && npm run compile && cd ../..
cd extensions/categories_widget && npm run compile && cd ../..
cd extensions/order_status_display && npm run compile && cd ../..
```

**Важно:** При использовании `npm run build` ручная компиляция не требуется - она выполняется автоматически.

## Запуск в Docker

- Собрать приложение: `npm install && npm run build`

  Приложение необходимо собирать до docker, т.к. докер сборку не выполняет, а лишь копирует папку `.evershop/dist` в контейнер в целях экономии времени. 
  
  **Примечание:** Компиляция расширений и темы выполняется автоматически при `npm run build` через `prebuild` hook, поэтому убедитесь, что все зависимости установлены перед сборкой.
  
  Если вам нужно, чтобы проект собирался в докере, то необходимо изменить Dockerfile и закомментировать строку копирования папки `.evershop/dist` в контейнер, а также добавить строку `npm run build`.

- `docker compose down -v` (остановка и удаление контейнеров)
- `docker compose build --no-cache` (сборка контейнеров)
- `docker compose up` (запуск контейнеров)

# Работа с базой данных

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