# подготовка
- .env
- положить бэкап в backups/
- положить данные ssl сертификата в secrets:
    - secrets/key.pem
    - secrets/cert.pem

    - убедитесь, что файлы имеют правильные права:
```bash
chmod 644 secrets/cert.pem
chmod 600 secrets/key.pem
```
подробнее см в nginx/README.md

# для запуска: 
- в папке themes/tech/ выполнить команду: npm run compile
- в папке для каждого extension, например, extensions/categories_widget/ выполнить команду: npm run compile
- в корне проекта выполнить: 
    - npm run build
    - npm start

# для запуска в docker:
- собрать приложение: npm install && npm run build
приложение необходимо собирать до docker, т.к. докер сборку не выполняет, а лишь копирует папку .evershop/dist в контейнер в целях экономии времени. если вам нужно, чтобы проект собирался в докере, то необходимо изменить Dockerfile и закомментировать строку копирования папки .evershop/dist в контейнер, а также добавить строку npm run build.
- docker compose down -v (остановка и удаление контейнеров)
- docker compose build --no-cache (сборка контейнеров)


если нужно попасть в контейнер app:
    - docker compose exec -it app sh
    там можно запустить restore БД:
    - npm run db:import backups/backup_name.dump 
    ИЛИ
    - docker compose exec app npm run db:import backups/backup_name.dump


для того чтобы создать дамп базы данных:
- docker compose exec app npm run db:export

ИЛИ использовать команду с автоматическим определением последнего файла:
- docker cp buildmeister-app-1:/backups/$(docker compose exec -T app sh -c 'ls -t /app/backups/backup_*.dump | head -1 | xargs basename') ./backups/