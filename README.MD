# для запуска: 
- в папке themes/tech/ выполнить команду: npm run compile
- в папке для каждого extension, например, extensions/categories_widget/ выполнить команду: npm run compile
- в корне проекта выполнить: 
    - npm run build
    - npm start

# для запуска в docker:
- docker compose down -v (остановка и удаление контейнеров)
- docker compose build --no-cache (сборка контейнеров)
- в другом терминале применить миграции (сачала очистить базу данных):
    - docker compose run --rm app npm run db:clear
    - docker compose run --rm app npm run db:import

готово!