import { mkdir } from "node:fs/promises";

import { dirname } from "node:path";

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema.js";

const dbPath = process.env.DATABASE_PATH || "./data/excalidraw.db";

// Ensure parent directory exists before opening the database
await mkdir(dirname(dbPath), { recursive: true });

const client = createClient({
  url: `file:${dbPath}`,
});

export const db = drizzle(client, { schema });

// Enable WAL mode and foreign keys for better performance and integrity
await client.execute("PRAGMA journal_mode = WAL");
await client.execute("PRAGMA foreign_keys = ON");

// Create tables if they don't exist (initial bootstrap)
await client.execute(`
  CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  )
`);

await client.execute(`
  CREATE TABLE IF NOT EXISTS scenes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'Untitled',
    folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
    elements TEXT NOT NULL,
    app_state TEXT,
    thumbnail TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    scene_version INTEGER NOT NULL DEFAULT 0
  )
`);

await client.execute(`
  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    scene_id TEXT NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    mime_type TEXT NOT NULL,
    size INTEGER,
    r2_key TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

await client.execute(`
  CREATE TABLE IF NOT EXISTS share_links (
    token TEXT PRIMARY KEY,
    scene_id TEXT NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )
`);

// Indexes for common queries
await client.execute(
  "CREATE INDEX IF NOT EXISTS idx_scenes_folder_id ON scenes(folder_id)",
);
await client.execute(
  "CREATE INDEX IF NOT EXISTS idx_scenes_updated_at ON scenes(updated_at)",
);
await client.execute(
  "CREATE INDEX IF NOT EXISTS idx_files_scene_id ON files(scene_id)",
);
await client.execute(
  "CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id)",
);
await client.execute(
  "CREATE INDEX IF NOT EXISTS idx_share_links_scene_id ON share_links(scene_id)",
);
await client.execute(
  "CREATE INDEX IF NOT EXISTS idx_share_links_expires_at ON share_links(expires_at)",
);
