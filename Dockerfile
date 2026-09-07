# Multi-stage build for magic (web app)

# ---- Builder ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci

# Build the Vite SPA
RUN npm run build

# ---- Runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4317

# Copy only what's needed to run
COPY --from=builder /app/package.json /app/package-lock.json* ./
COPY --from=builder /app/apps ./apps
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules

# Drop privileges
RUN addgroup -S magic && adduser -S magic -G magic
USER magic

EXPOSE 4317

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:4317/api/health/live || exit 1

CMD ["node", "dist/apps/web/server/server.js"]
