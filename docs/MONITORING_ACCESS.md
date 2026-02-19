# Конспект: безопасный доступ к Grafana и Prometheus

Этот файл — краткий конспект “как и почему” мы настраивали мониторинг так, чтобы:
- Grafana была доступна по `https://buildmeister.no/grafana/`
- Prometheus **не был доступен из интернета** (только через SSH‑туннель)

> Примечание про безопасность публикации в git: ниже приведены **шаблоны**. Не коммитьте реальные `HostName`, `User`, `IdentityFile` и тем более приватные ключи.

---
## 1) Grafana: безопасный вход + nginx reverse proxy под подпутём `/grafana/`

### 1.1. Настройки Grafana в `docker-compose.yml`

Нам важно, чтобы Grafana “знала”, что она живёт **не в корне сайта**, а в подпути `/grafana/`.
Иначе она будет генерировать ссылки/редиректы на `/login`, `/public/...` и начнёт конфликтовать с основным приложением.

Ниже — логика строк (в виде конфига с комментариями к **каждой** строке):

```yaml
  grafana:  # имя сервиса в docker compose; по нему nginx ходит в upstream grafana
    image: grafana/grafana:latest  # образ Grafana; без него контейнер не стартует
    container_name: grafana  # фиксированное имя контейнера; удобно для логов/exec, но необязательно
    restart: unless-stopped  # автоперезапуск при падениях; без него при ребуте/кряке может не подняться
    environment:  # переменные окружения Grafana (заменяют grafana.ini)
      - GF_SECURITY_ADMIN_USER=${GRAFANA_ADMIN_USER:-admin}  # логин админа; без этого будет дефолт admin
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-admin}  # пароль админа; без этого будет дефолт admin
      - GF_SERVER_ROOT_URL=https://buildmeister.no/grafana/  # КРИТИЧНО: базовый URL с подпутём; без этого ссылки/редиректы уйдут в /
      - GF_SERVER_SERVE_FROM_SUB_PATH=true  # КРИТИЧНО: включить режим “живу под /grafana”; без этого фронт может ломать пути статики/роутинга
    volumes:  # монтируем provisioning и данные
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards  # автозагрузка дашбордов; без этого дашборды не появятся автоматически
      - ./grafana/datasources:/etc/grafana/provisioning/datasources  # автозагрузка datasource; без этого придётся настраивать руками
      - grafana-data:/var/lib/grafana  # персистентное хранилище; без этого при пересоздании контейнера всё слетит
    networks:  # сеть, чтобы nginx/prometheus/grafana видели друг друга
      - myevershop  # без общей сети nginx не сможет резолвить `grafana` и проксировать
    depends_on:  # порядок старта
      - prometheus  # не гарантирует “готовность”, но помогает стартовать в логичном порядке
    expose:  # публикуем порт только внутри docker-сети
      - "3000"  # без expose всё равно будет доступно по сети, но это документация намерения (внешний доступ не нужен)
```

**Важный нюанс Docker**: если вы меняете `environment:` в compose, то `docker compose restart` может НЕ применить новые env (контейнер не пересоздаётся).
Надёжный способ применить env — пересоздать контейнер:

```bash
docker compose up -d --force-recreate --no-deps grafana
```

Если этого не сделать, Grafana может продолжать жить с прежним `GF_SERVER_ROOT_URL`, и вы снова увидите переходы на `/login` вместо `/grafana/login`.

---

### 1.2. Настройки nginx для Grafana (подпуть + WebSocket + приоритет location)

Задача nginx: принимать запросы на `https://buildmeister.no/grafana/...` и проксировать их в контейнер Grafana.

Ключевые риски, которые мы устраняли:
- **неправильный `proxy_pass`** может “срезать” `/grafana` из URI (и Grafana начнёт считать, что она в корне)
- regex‑локации (например, “все `*.js/*.css`”) могут перехватывать `/grafana/public/...` и отправлять в основное приложение → 404
- без WebSocket заголовков ломается Grafana Live

Ниже — минимально‑достаточный блок (аналогичен в HTTP и HTTPS server‑block), с комментариями к **каждой** строке:

```nginx
location = /grafana {  # точное совпадение только для /grafana без слэша
    return 301 /grafana/;  # приводим к каноническому виду; без этого возможны странные относительные ссылки/редиректы
}

location ^~ /grafana/ {  # ^~ заставляет nginx выбрать этот prefix‑location и НЕ проверять regex‑локации (критично из‑за блока ~* \.(js|css|...))
    proxy_pass http://grafana;  # КРИТИЧНО: БЕЗ завершающего '/' → URI не “переписывается”; Grafana получает /grafana/... как и ожидает serve_from_sub_path
    proxy_http_version 1.1;  # нужно для WebSocket/keep-alive; без этого Grafana Live часто ломается

    proxy_set_header Upgrade $http_upgrade;  # WebSocket upgrade; без этого live‑каналы/стримы могут не работать
    proxy_set_header Connection $connection_upgrade;  # корректный Connection для upgrade; без этого upgrade может быть проигнорирован

    proxy_set_header Host $host;  # сохраняем Host; без этого Grafana может генерировать “не те” URL/куки/редиректы
    proxy_set_header X-Real-IP $remote_addr;  # реальный IP клиента; без этого в логах Grafana будет IP nginx/контейнера
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;  # цепочка прокси; полезно для логов/аудита
    proxy_set_header X-Forwarded-Proto $scheme;  # http/https; без этого Grafana может думать, что она на http и генерировать небезопасные ссылки
    proxy_set_header X-Forwarded-Host $host;  # исходный host; без этого возможны странности с генерацией ссылок
    proxy_set_header X-Forwarded-Port $server_port;  # исходный порт; обычно не критично, но полезно для корректности

    proxy_set_header X-Forwarded-Prefix /grafana;  # сообщает подпуть; часто опционально, но помогает некоторым связкам прокси/приложение

    proxy_connect_timeout 60s;  # таймаут соединения к upstream; без этого при сетевых глюках могут висеть коннекты
    proxy_send_timeout 60s;  # таймаут отправки; без этого возможны “залипания”
    proxy_read_timeout 60s;  # таймаут чтения; без этого при долгих ответах возможны обрывы

    proxy_buffering off;  # отключаем буферизацию; без этого иногда страдают streaming/live сценарии
}
```

**Почему `^~` — это нормально (не костыль):**
это стандартное средство nginx для “namespace‑роутинга”, когда под `/grafana/` должен уходить весь трафик в Grafana,
даже если ниже есть regex‑правила “для всей статики” сайта.

---

## 2) Prometheus: доступ только через SSH‑туннель

Prometheus без пароля нельзя публиковать в интернет. Поэтому мы сделали так, чтобы порт 9090 слушался **только на localhost сервера**.

В `docker-compose.yml` у сервиса `prometheus` добавлена одна ключевая строка:

```yaml
ports:  # проброс портов контейнера на хост
  - "127.0.0.1:9090:9090"  # КРИТИЧНО: биндим только на 127.0.0.1 сервера; без 127.0.0.1 Prometheus станет доступен извне
```

Если вместо `127.0.0.1:9090:9090` написать просто `9090:9090`, то Prometheus будет слушать на `0.0.0.0:9090` и станет доступен из интернета (плохо).

Применять изменение нужно пересозданием сервиса:

```bash
docker compose up -d --force-recreate --no-deps prometheus
```

---

## 3) SSH‑туннель к Prometheus

Идея: Prometheus доступен на сервере по `127.0.0.1:9090`, а SSH пробрасывает этот порт на ваш компьютер.

### Вариант A (одноразовая команда)

```bash
ssh -L 29090:127.0.0.1:9090 buildmeister-server  # локальный 29090 → серверный 127.0.0.1:9090; без -L браузер не увидит Prometheus
```

Открывать в браузере:
- `http://localhost:29090`

### Вариант B (рекомендуется: `~/.ssh/config`)

В `~/.ssh/config` (или `C:\Users\<user>\.ssh\config` на Windows) добавьте к вашему host‑алиасу:

```sshconfig
Host buildmeister-server  # алиас; можно назвать иначе (важно, чтобы совпадало с командой ssh)
    HostName <ваш_хост>  # реальный домен/IP; если перепутать — подключение пойдёт “не туда”
    User <ваш_пользователь>  # пользователь на сервере; если неверно — не зайдёте
    PreferredAuthentications publickey  # используем ключ; если убрать — ssh может попросить пароль
    IdentityFile <путь_к_ключу>  # путь к ключу; если неверно — будет “Permission denied (publickey)”

    LocalForward 29090 127.0.0.1:9090  # сам туннель; без него Prometheus не будет доступен локально
    ExitOnForwardFailure yes  # если порт занять/не пробросился — ssh сразу упадёт; без этого можно думать, что “всё ок”, а туннеля нет
    ServerAliveInterval 60  # keep-alive; без этого соединение может рваться NAT/файрволом в простое
```

Запуск:

```bash
ssh buildmeister-server  # поднимает соединение и туннель из config; без активного ssh вкладка Prometheus не откроется
```

Открывать в браузере:
- `http://localhost:29090`




