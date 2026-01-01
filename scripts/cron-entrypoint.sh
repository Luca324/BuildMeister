#!/bin/sh

# Entrypoint скрипт для запуска cron и основного приложения
echo "🚀 Запускаем cron в фоне...*"
# Запускаем cron в фоне
crond -f -l 2 &

# Сохраняем PID cron процесса
CRON_PID=$!

echo "✅ Cron запущен (PID: $CRON_PID)*"
echo "📅 Расписание: каждое воскресенье в 00:00 UTC*"

# Запускаем основное приложение
echo "🚀 Запускаем основное приложение...*"
exec npm run start

