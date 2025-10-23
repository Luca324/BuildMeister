# Ждём пока БД реально будет готова принимать подключения
while ! nc -z database 5432; do
  echo "Ждём БД..."
  sleep 2
done

echo "БД готова! Запускаем миграции..."
npm run db:import

echo "Запускаем приложение..."
npm run start