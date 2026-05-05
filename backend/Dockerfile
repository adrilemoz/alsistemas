# ─── Stage 1: Dependências ────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ─── Stage 2: Imagem final ────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Usuário não-root por segurança
RUN addgroup -S iguanews && adduser -S iguanews -G iguanews

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Permissões
RUN chown -R iguanews:iguanews /app
USER iguanews

EXPOSE 3001

# Graceful shutdown via SIGTERM (#15)
STOPSIGNAL SIGTERM

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["node", "src/server.js"]
