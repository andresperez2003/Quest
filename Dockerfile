# Una sola imagen: compila la web y la sirve desde la API (mismo origen).
FROM node:26-slim AS web
WORKDIR /app/Frontend
COPY Frontend/package*.json ./
RUN npm ci
COPY Frontend/ ./
RUN npm run build

FROM node:26-slim
# Prisma necesita OpenSSL.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app/Backend
ENV NODE_ENV=production
COPY Backend/package*.json ./
COPY Backend/prisma/schema.prisma ./prisma/schema.prisma
# Incluye prisma (devDependency) para poder aplicar migraciones al arrancar; postinstall genera el cliente.
RUN npm ci --include=dev
COPY Backend/ ./
COPY --from=web /app/Frontend/dist /app/Frontend/dist
EXPOSE 8080
# migrate deploy solo aplica migraciones pendientes; nunca borra datos.
CMD ["sh", "-c", "npx prisma migrate deploy && node main.js"]
