# Быстрый запуск НЕ ЧЕРЕЗ DOCKER
docker только для запуска nginx.

## 1. Запустить приложение
```bash
npm start
```

## 2. Запустить nginx (в другом терминале)
```bash
docker compose -f docker-compose.nginx.yml up -d
```

## Остановка

Остановить приложение: `Ctrl+C`

Остановить nginx:
```bash
docker compose -f docker-compose.nginx.yml down
```

---

**Примечание:** Приложение работает на порту 3000, nginx проксирует с 80/443 на 3000.

