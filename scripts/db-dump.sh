#!/bin/sh
set -e

# Парсим аргументы сначала, чтобы знать режим работы
MODE="docker"
BACKUP_DIR=""
if [ "$1" = "local" ]; then
    MODE="local"
    BACKUP_DIR="${2}"
elif [ "$1" = "--local" ]; then
    MODE="local"
    BACKUP_DIR="${2}"
else
    BACKUP_DIR="${1}"
fi

# Определяем корневую директорию проекта в зависимости от режима
if [ "${MODE}" = "local" ]; then
    # Локальный режим: используем $0 (работает в sh)
    SCRIPT_DIR="$( cd "$( dirname "$0" )" && pwd )"
else
    # Docker режим: используем BASH_SOURCE если доступен
    if [ -n "${BASH_VERSION:-}" ]; then
        SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    else
        SCRIPT_DIR="$( cd "$( dirname "$0" )" && pwd )"
    fi
fi
PROJECT_ROOT="$( cd "${SCRIPT_DIR}/.." && pwd )"

# Загружаем переменные окружения в зависимости от режима
if [ "${MODE}" = "local" ]; then
    # Локальный режим: загружаем из .env файла
    ENV_FILE="${PROJECT_ROOT}/.env"
    if [ ! -f "${ENV_FILE}" ]; then
        echo "❌ ОШИБКА: Файл .env не найден: ${ENV_FILE}"
        exit 1
    fi
    echo "📋 Локальный режим: загрузка переменных из ${ENV_FILE}"
    # Простая загрузка переменных из .env файла (игнорируем комментарии)
    export $(cat "${ENV_FILE}" | grep -v '^#' | xargs)
else
    # Docker режим: переменные уже должны быть в окружении
    echo "🐳 Docker режим: использование переменных из окружения"
fi

# Проверяем наличие обязательных переменных
if [ -z "${DB_HOST}" ]; then
    if [ "${MODE}" = "local" ]; then
        echo "❌ ОШИБКА: DB_HOST не определена в .env файле"
    else
        echo "❌ ОШИБКА: DB_HOST не определена в переменных окружения"
    fi
    exit 1
fi
if [ -z "${DB_PORT}" ]; then
    if [ "${MODE}" = "local" ]; then
        echo "❌ ОШИБКА: DB_PORT не определена в .env файле"
    else
        echo "❌ ОШИБКА: DB_PORT не определена в переменных окружения"
    fi
    exit 1
fi
if [ -z "${DB_NAME}" ]; then
    if [ "${MODE}" = "local" ]; then
        echo "❌ ОШИБКА: DB_NAME не определена в .env файле"
    else
        echo "❌ ОШИБКА: DB_NAME не определена в переменных окружения"
    fi
    exit 1
fi
if [ -z "${DB_USER}" ]; then
    if [ "${MODE}" = "local" ]; then
        echo "❌ ОШИБКА: DB_USER не определена в .env файле"
    else
        echo "❌ ОШИБКА: DB_USER не определена в переменных окружения"
    fi
    exit 1
fi
if [ -z "${DB_PASSWORD}" ]; then
    if [ "${MODE}" = "local" ]; then
        echo "❌ ОШИБКА: DB_PASSWORD не определена в .env файле"
    else
        echo "❌ ОШИБКА: DB_PASSWORD не определена в переменных окружения"
    fi
    exit 1
fi

# Путь для сохранения дампа (относительно корня проекта)
if [ -z "${BACKUP_DIR}" ]; then
    BACKUP_DIR="${PROJECT_ROOT}/backups"
fi
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

