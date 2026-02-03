#!/bin/sh
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

