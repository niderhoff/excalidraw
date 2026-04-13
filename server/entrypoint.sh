#!/bin/sh
set -e

DB_PATH="${DATABASE_PATH:-/data/excalidraw.db}"

# If R2 is configured, use Litestream for continuous SQLite backups
if [ -n "$R2_ENDPOINT" ] && [ -n "$R2_ACCESS_KEY_ID" ] && [ -n "$R2_SECRET_ACCESS_KEY" ]; then
  LITESTREAM_BUCKET="${R2_BUCKET:-excalidraw-files}"

  # Generate litestream config
  cat > /tmp/litestream.yml <<YAML
dbs:
  - path: ${DB_PATH}
    replicas:
      - type: s3
        endpoint: ${R2_ENDPOINT}
        bucket: ${LITESTREAM_BUCKET}
        path: backups/excalidraw.db
        access-key-id: ${R2_ACCESS_KEY_ID}
        secret-access-key: ${R2_SECRET_ACCESS_KEY}
        force-path-style: true
        sync-interval: 60s
YAML

  echo "Litestream: restoring database from R2 (if backup exists)..."
  litestream restore -if-replica-exists -config /tmp/litestream.yml "$DB_PATH" || true

  echo "Litestream: starting replication + Node server..."
  exec litestream replicate -config /tmp/litestream.yml -exec "node dist/index.js"
else
  echo "Litestream: R2 not configured, running without backups"
  exec node dist/index.js
fi
