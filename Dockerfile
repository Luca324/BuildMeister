FROM node:18-alpine
WORKDIR /app
RUN npm install -g npm

# Устанавливаем PostgreSQL клиент для работы с дампами
RUN apk add --no-cache postgresql-client

COPY package*.json .
COPY themes ./themes
COPY extensions ./extensions
COPY config ./config
COPY scripts ./scripts
COPY evershop ./evershop
COPY nginx/html/maintenance.html ./nginx/html/maintenance.html

RUN npm install
RUN cd themes/tech && npm run tsc
RUN cd extensions/categories_widget && npm run compile
RUN cd extensions/order_status_display && npm run compile

# Устанавливаем права на выполнение для скриптов
RUN chmod +x ./scripts/db-dump.sh
RUN chmod +x ./scripts/db-restore.sh
RUN chmod +x ./scripts/entrypoint.sh

ENV PORT=80
EXPOSE 80

CMD ["/bin/sh", "./scripts/entrypoint.sh"]