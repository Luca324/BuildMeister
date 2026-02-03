#!/bin/sh
set -e

echo "🚀 Запуск entrypoint скрипта..."

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

