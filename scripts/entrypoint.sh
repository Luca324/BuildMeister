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

# Автоматическое восстановление БД из самого позднего бэкапа
echo "🔍 Поиск самого позднего бэкапа..."
BACKUP_DIR="./backups"
if [ -d "${BACKUP_DIR}" ]; then
    # Находим самый поздний файл бэкапа по времени модификации (ls -t сортирует по времени, новый первый)
    LATEST_BACKUP=$(ls -t "${BACKUP_DIR}"/*.dump 2>/dev/null | head -1)
    
    if [ -n "${LATEST_BACKUP}" ] && [ -f "${LATEST_BACKUP}" ]; then
        echo "📥 Найден бэкап: ${LATEST_BACKUP}"
        echo "📥 Восстановление БД из дампа через npm run db:import..."
        npm run db:import "${LATEST_BACKUP}" || {
            echo "⚠️  Предупреждение: Не удалось восстановить БД из бэкапа. Продолжаем запуск..."
        }
    else
        echo "ℹ️  Бэкапы не найдены, пропускаем восстановление"
    fi
else
    echo "ℹ️  Директория backups не найдена, пропускаем восстановление"
fi

# Запускаем основное приложение (миграции применятся автоматически)
echo "🚀 Запускаем основное приложение..."
exec npm run start