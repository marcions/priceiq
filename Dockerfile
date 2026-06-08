# ─── Stage 1: deps ───────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ─── Stage 2: builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Envs de build (placeholders — sobrescritos pelas vars do Coolify em runtime)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# Copiar arquivos estáticos para dentro do standalone (obrigatório)
RUN cp -r .next/static .next/standalone/.next/static \
 && cp -r public .next/standalone/public

# ─── Stage 3: runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Apenas o standalone — imagem mínima
COPY --from=builder /app/.next/standalone ./

EXPOSE 3000
CMD ["node", "server.js"]
