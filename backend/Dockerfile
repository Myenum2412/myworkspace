FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* .npmrc tsconfig.json ./
RUN apk add --no-cache curl=8.21.0-r0

RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache curl=8.21.0-r0
COPY package.json package-lock.json* .npmrc tsconfig.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY src/ ./src/
RUN npm run build && \
    npm prune --production

FROM node:22-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeuser

ENV NODE_ENV=production \
    PORT=4000 \
    NODE_OPTIONS="--max-old-space-size=4096" \
    NODE_NO_WARNINGS=1

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

RUN mkdir -p data/tus-uploads data/uploads && \
    chown -R nodeuser:nodejs /app/data && \
    chmod 755 /app/data

USER nodeuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:4000/api/health || exit 1

LABEL org.opencontainers.image.source="https://github.com/myenum/myworkspace" \
      org.opencontainers.image.description="MyWorkSpace Backend API" \
      org.opencontainers.image.version="2.0.0"

CMD ["node", "dist/index.js"]
