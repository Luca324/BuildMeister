#!/bin/sh
set -e

# Определяем корневую директорию проекта
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "${SCRIPT_DIR}/.." && pwd )"

# Определяем режим работы: local или docker (по умолчанию)
MODE="docker"
BACKUP_FILE=""

# Парсим аргументы
if [ "$1" = "local" ]; then
    MODE="local"
    BACKUP_FILE="${2}"
elif [ "$1" = "--local" ]; then
    MODE="local"
    BACKUP_FILE="${2}"
else
    BACKUP_FILE="${1}"
fi

# Загружаем переменные окружения в зависимости от режима
if [ "${MODE}" = "local" ]; then
    # Локальный режим: загружаем из .env файла
    ENV_FILE="${PROJECT_ROOT}/.env"
    if [ ! -f "${ENV_FILE}" ]; then
        echo "❌ ОШИБКА: Файл .env не найден: ${ENV_FILE}"
        exit 1
    fi
    echo "📋 Локальный режим: загрузка переменных из ${ENV_FILE}"
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

# Проверяем наличие пути к файлу дампа
if [ -z "${BACKUP_FILE}" ]; then
    echo "❌ Укажите путь к файлу дампа"
    echo "Использование:"
    echo "  $0 <путь_к_файлу.dump>              # Docker режим (по умолчанию)"
    echo "  $0 local <путь_к_файлу.dump>        # Локальный режим"
    echo "  $0 --local <путь_к_файлу.dump>      # Локальный режим (альтернативный синтаксис)"
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
