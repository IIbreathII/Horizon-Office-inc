# express-api: при старті застосовує міграції (prisma migrate deploy), потім запускає сервер.
# devDependencies лишаються в образі: prisma CLI потрібен для міграцій, tsx — для `npm run db:seed`.
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
