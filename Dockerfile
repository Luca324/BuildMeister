FROM node:18-alpine
WORKDIR /app
RUN npm install -g npm@9
COPY package*.json .
COPY themes ./themes
COPY extensions ./extensions
COPY public ./public
COPY media ./media
COPY config ./config
COPY scripts ./scripts
COPY data-export ./data-export
RUN npm install
RUN npm run build

# RUN npm run db:import

EXPOSE 3000

CMD ["./scripts/migrate.sh"]