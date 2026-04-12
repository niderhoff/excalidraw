# Stage 1: Build frontend
FROM --platform=${BUILDPLATFORM} node:18 AS frontend-build

WORKDIR /app

COPY . .

# Install monorepo dependencies
RUN --mount=type=cache,target=/root/.cache/yarn \
    npm_config_target_arch=${TARGETARCH} yarn --network-timeout 600000

ARG NODE_ENV=production

RUN npm_config_target_arch=${TARGETARCH} yarn build:app:docker

# Stage 2: Build server
FROM --platform=${BUILDPLATFORM} node:18-alpine AS server-build

WORKDIR /app/server

COPY server/package.json server/package-lock.json* ./
RUN npm install --production=false

COPY server/ .
RUN npx tsc

# Prune dev dependencies
RUN npm prune --production

# Stage 3: Runtime
FROM --platform=${TARGETPLATFORM} node:18-alpine

WORKDIR /app

# Copy server build
COPY --from=server-build /app/server/dist ./dist
COPY --from=server-build /app/server/node_modules ./node_modules
COPY --from=server-build /app/server/package.json ./

# Copy frontend build as static files
COPY --from=frontend-build /app/excalidraw-app/build ./public

ENV NODE_ENV=production
ENV PORT=3100
ENV DATABASE_PATH=/data/excalidraw.db

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://localhost:3100/health || exit 1

CMD ["node", "dist/index.js"]
