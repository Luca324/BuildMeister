FROM node:18-alpine
WORKDIR /app
RUN npm install -g npm
COPY package*.json .
COPY themes ./themes
COPY extensions ./extensions
COPY media ./media
COPY config ./config
COPY scripts ./scripts
COPY data-export ./data-export
RUN npm install
RUN npm run compile --prefix themes/tech
RUN npm run compile --prefix extensions/categories_widget
RUN npm run compile --prefix extensions/greeting_widget
RUN npm run build

# Устанавливаем права на выполнение для скриптов
RUN chmod +x ./scripts/migrate.sh
RUN chmod +x ./scripts/import-data.js
RUN chmod +x ./scripts/export-data.js

ENV PORT=80
EXPOSE 80

CMD ["npm", "run", "start"]