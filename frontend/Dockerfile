# ---- Build stage ----
FROM node:20-bullseye AS builder

WORKDIR /app

# Use npm (package-lock.json) for reliable installs in CI/build environments
COPY package.json package-lock.json* ./
# Copy workspace package files so npm can install workspace packages and dev deps
COPY frontend/package.json frontend/package-lock.json* frontend/
COPY backend/package.json backend/package-lock.json* backend/
# Use npm install (not `ci`) so optional native binaries are installed
# for the build platform (fixes rollup native optional dependency errors)
RUN npm install --prefer-offline --no-audit --no-progress --include=dev

COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ---- Serve stage ----
FROM nginx:stable-alpine AS production

COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
