# подготовка
- .env
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
- docker compose down -v (остановка и удаление контейнеров)
- docker compose build --no-cache (сборка контейнеров)
- в другом терминале применить миграции:
    - docker compose exec -it app sh
    - npm run db:import backups/backup_name.dump 

готово!