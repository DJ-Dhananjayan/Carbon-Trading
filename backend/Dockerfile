# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Cache dependencies layer: only re-runs npm ci when package.json changes
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline

COPY . .
RUN npx tsc

# ── Stage 2: Runtime (no dev deps, no source) ────────────────────
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 5000
CMD ["node", "dist/index.js"]
