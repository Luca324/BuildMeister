# Подготовка .env файла

В проекте есть два файла с переменными окружения:
- `local.env` - для локального запуска (DB_HOST обычно `localhost`)
- `docker.env` - для Docker запуска (DB_HOST обычно `database`)

**Перед запуском приложения необходимо переименовать нужный файл в `.env`:**
- Для локального запуска: `cp local.env .env`
- Для Docker запуска: `cp docker.env .env`

# Локальный НЕ ЧЕРЕЗ DOCKER
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

---

## Prometheus (открыть через SSH-туннель)

Prometheus **не доступен из интернета напрямую** (без пароля), его можно открыть только через SSH-туннель.

### Почему это работает

В `docker-compose.yml` (строки **65–66**) у сервиса `prometheus` задано:
- `ports:`
- `- "127.0.0.1:9090:9090"`

Роль этой настройки: **порт 9090 слушается только на localhost сервера** (`127.0.0.1`), поэтому снаружи он недоступен, но его можно безопасно пробросить через SSH.

### Как открыть

1) На своём компьютере выполните:

```bash
ssh -L 29090:127.0.0.1:9090 <ssh_host_alias>
```

2) В браузере откройте:

`http://localhost:29090`

### Вариант через ssh/config (рекомендуется)

Чтобы не писать длинную команду каждый раз, добавьте туннель в `~/.ssh/config`:

```sshconfig
Host <ssh_host_alias>
    HostName <ваш_хост>
    User <ваш_пользователь>
    PreferredAuthentications publickey
    IdentityFile <путь_к_ключу>

    LocalForward 29090 127.0.0.1:9090
    ExitOnForwardFailure yes
    ServerAliveInterval 60
```

Дальше запускайте:

```bash
ssh <ssh_host_alias>
```

Примечание: вместо `<ssh_host_alias>` используйте **имя (Host)**, которое у вас настроено в `~/.ssh/config` (любое).

### Безопасно ли это публиковать в git?


