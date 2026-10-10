# ==========================================
# SIGEX frontend — React + Vite
# Etapa 1 compila los archivos estáticos (pnpm build → dist/);
# etapa 2 los sirve con Nginx, que además reenvía /api/ al backend.
# ==========================================
FROM node:20.19-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8.15.9 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Ruta relativa: el navegador habla con el mismo dominio y Nginx reenvía al backend.
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN pnpm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
