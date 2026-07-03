FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* tsconfig.json ./
RUN npm install

COPY src/ ./src/
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeuser

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

RUN mkdir -p data/tus-uploads data/uploads && \
    chown -R nodeuser:nodejs /app/data

USER nodeuser

EXPOSE 4000

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
