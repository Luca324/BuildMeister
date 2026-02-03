#!/bin/bash
set -e

# Определяем корневую директорию проекта
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "${SCRIPT_DIR}/.." && pwd )"

# Загружаем переменные окружения
ENV_FILE="${PROJECT_ROOT}/.env"
if [ ! -f "${ENV_FILE}" ]; then
    echo "❌ ОШИБКА: Файл .env не найден в ${PROJECT_ROOT}"
    echo "Создайте файл .env на основе .env.example"
    exit 1
fi

export $(cat "${ENV_FILE}" | grep -v '^#' | xargs)

# Проверяем наличие обязательных переменных
if [ -z "${DB_HOST}" ]; then
    echo "❌ ОШИБКА: DB_HOST не определена в .env файле"
    exit 1
fi
if [ -z "${DB_PORT}" ]; then
    echo "❌ ОШИБКА: DB_PORT не определена в .env файле"
    exit 1
fi
if [ -z "${DB_NAME}" ]; then
    echo "❌ ОШИБКА: DB_NAME не определена в .env файле"
    exit 1
fi
if [ -z "${DB_USER}" ]; then
    echo "❌ ОШИБКА: DB_USER не определена в .env файле"
    exit 1
fi
if [ -z "${DB_PASSWORD}" ]; then
    echo "❌ ОШИБКА: DB_PASSWORD не определена в .env файле"
    exit 1
fi

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

