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

# Путь для сохранения дампа (относительно корня проекта)
BACKUP_DIR="${1:-${PROJECT_ROOT}/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.dump"

# Создаем директорию для бэкапов
mkdir -p "${BACKUP_DIR}"

# Экспорт БД
echo "📤 Создание дампа БД..."
PGPASSWORD="${DB_PASSWORD}" pg_dump \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    -F c \
    -b \
    -v \
    -f "${BACKUP_FILE}"

echo "✅ Дамп создан: ${BACKUP_FILE}"

