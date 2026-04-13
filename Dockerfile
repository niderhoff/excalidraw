# Stage 1: Build frontend
FROM --platform=${BUILDPLATFORM} node:20 AS frontend-build

WORKDIR /app

# Copy dependency files first for better layer caching
# yarn install only re-runs if these files change
COPY package.json yarn.lock .npmrc* ./
COPY excalidraw-app/package.json excalidraw-app/
COPY packages/common/package.json packages/common/
COPY packages/element/package.json packages/element/
COPY packages/excalidraw/package.json packages/excalidraw/
COPY packages/math/package.json packages/math/
COPY packages/utils/package.json packages/utils/

RUN --mount=type=cache,target=/root/.cache/yarn \
    npm_config_target_arch=${TARGETARCH} yarn --network-timeout 600000 --frozen-lockfile

# Now copy source (changes here don't bust the yarn install cache)
COPY . .

ARG NODE_ENV=production

RUN NODE_OPTIONS="--max-old-space-size=4096" npm_config_target_arch=${TARGETARCH} yarn build:app:docker

# Stage 2: Build server
FROM --platform=${BUILDPLATFORM} node:20-alpine AS server-build

WORKDIR /app/server

COPY server/package.json server/package-lock.json* ./
RUN npm install --production=false

COPY server/ .
RUN npx tsc

# Prune dev dependencies
RUN npm prune --production

# Stage 3: Runtime (with Litestream for SQLite backups)
FROM --platform=${TARGETPLATFORM} node:20-alpine

# Install Litestream for continuous SQLite replication to R2
RUN apk add --no-cache ca-certificates wget && \
    ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then LSARCH="amd64"; \
    elif [ "$ARCH" = "aarch64" ]; then LSARCH="arm64"; \
    else LSARCH="amd64"; fi && \
    wget -q "https://github.com/benbjohnson/litestream/releases/download/v0.3.13/litestream-v0.3.13-linux-${LSARCH}.tar.gz" -O /tmp/litestream.tar.gz && \
    tar -xzf /tmp/litestream.tar.gz -C /usr/local/bin && \
    rm /tmp/litestream.tar.gz

WORKDIR /app

# Copy server build
COPY --from=server-build /app/server/dist ./dist
COPY --from=server-build /app/server/node_modules ./node_modules
COPY --from=server-build /app/server/package.json ./

# Copy frontend build as static files
COPY --from=frontend-build /app/excalidraw-app/build ./public

# Copy entrypoint script
COPY server/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3100
ENV DATABASE_PATH=/data/excalidraw.db

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://localhost:3100/health || exit 1

CMD ["./entrypoint.sh"]
