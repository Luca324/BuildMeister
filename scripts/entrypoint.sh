#!/bin/sh
set -e

echo "🚀 Запуск entrypoint скрипта..."

# Загружаем переменные окружения из docker-compose
DB_HOST=${DB_HOST:-database}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-postgres}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}

# Ждем пока база данных будет готова
echo "⏳ Ожидание готовности базы данных..."
until PGPASSWORD="${DB_PASSWORD}" pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" > /dev/null 2>&1; do
    echo "База данных не готова, ждем..."
    sleep 2
done
echo "✅ База данных готова"

# Запускаем основное приложение (миграции применятся автоматически)
echo "🚀 Запускаем основное приложение..."
exec npm run start

