# ─── Build Stage ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install root dependencies
COPY package.json ./
RUN npm install --production=false

# Install client dependencies and build
COPY client/package.json client/
RUN cd client && npm install

COPY . .
RUN cd client && npx vite build

# ─── Production Stage ────────────────────────────────────
FROM node:20-alpine

LABEL maintainer="QuantumShield Team"
LABEL description="QuantumShield — Enterprise Post-Quantum Cryptography Migration Platform"
LABEL org.opencontainers.image.source="https://github.com/zhuj3188-ship-it/NIST"

WORKDIR /app

# Install production dependencies only
COPY package.json ./
RUN npm install --production && npm cache clean --force

# Copy server code
COPY server/ ./server/

# Copy built client
COPY --from=builder /app/client/dist ./client/dist

# Security: run as non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup
USER appuser

# Expose server port
EXPOSE 3001

# Environment
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start server
CMD ["node", "server/index.js"]
