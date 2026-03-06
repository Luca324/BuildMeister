Образ сохранен с тегом `stable-20260306`.

## Процесс восстановления:

### Вариант 1: Быстрое восстановление (рекомендуется)

```bash
# 1. Остановите текущие контейнеры
docker compose down

# 2. Переименуйте стабильный образ обратно в latest
docker tag buildmeister-app:stable-20260306 buildmeister-app:latest

# 3. Запустите снова
docker compose up -d
```

### Вариант 2: Через docker-compose.yml (временно)

Если хотите запустить стабильную версию без изменения latest:

```bash
# Временно измените docker-compose.yml:
# В секции app замените:
#   build: 
#     context: .
#     dockerfile: Dockerfile
# На:
#   image: buildmeister-app:stable-20260306

# Затем:
docker compose down
docker compose up -d
```

### Проверка доступных стабильных версий:

```bash
# Посмотреть все сохраненные стабильные версии
docker images | grep "buildmeister-app.*stable"
```
