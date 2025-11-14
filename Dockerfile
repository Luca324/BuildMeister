FROM node:18-alpine
WORKDIR /app
RUN npm install -g npm
COPY package*.json .
COPY themes ./themes
COPY extensions ./extensions
COPY config ./config
COPY scripts ./scripts
COPY data-export ./data-export
RUN npm install
RUN npm run build

# Устанавливаем права на выполнение для скриптов
RUN chmod +x ./scripts/migrate.sh
RUN chmod +x ./scripts/import-data.js
RUN chmod +x ./scripts/export-data.js

EXPOSE 3000

CMD ["sh", "./scripts/migrate.sh"]