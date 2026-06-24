# ---- Build stage ----
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# ---- Production stage ----
FROM node:22-alpine AS production

WORKDIR /app

# Reinstall prod deps natively (sharp requires platform bindings)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

RUN mkdir -p /tmp/meatlens-uploads

ENV NODE_ENV=production
ENV PORT=3001
ENV UPLOAD_DIR=/tmp/meatlens-uploads

EXPOSE 3001

CMD ["node", "dist/server.js"]
