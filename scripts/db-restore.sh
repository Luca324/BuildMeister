#!/bin/bash
set -e

# Определяем корневую директорию проекта
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "${SCRIPT_DIR}/.." && pwd )"

# Загружаем переменные окружения
ENV_FILE="${PROJECT_ROOT}/.env"
if [ -f "${ENV_FILE}" ]; then
    export $(cat "${ENV_FILE}" | grep -v '^#' | xargs)
fi

# Параметры подключения
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-postgres}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}

# Путь к файлу дампа
BACKUP_FILE="${1}"

if [ -z "${BACKUP_FILE}" ]; then
    echo "❌ Укажите путь к файлу дампа"
    echo "Использование: $0 <путь_к_файлу.dump>"
    exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "❌ Файл дампа не найден: ${BACKUP_FILE}"
    exit 1
fi

# Импорт БД
echo "📥 Восстановление БД из дампа..."
PGPASSWORD="${DB_PASSWORD}" pg_restore \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    -c \
    -v \
    "${BACKUP_FILE}"

echo "✅ БД восстановлена из: ${BACKUP_FILE}"

