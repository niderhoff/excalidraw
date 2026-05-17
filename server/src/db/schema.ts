import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const folders = sqliteTable("folders", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  parentId: text("parent_id").references((): any => folders.id, {
    onDelete: "cascade",
  }),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const scenes = sqliteTable("scenes", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default("Untitled"),
  folderId: text("folder_id").references(() => folders.id, {
    onDelete: "set null",
  }),
  elements: text("elements").notNull(),
  appState: text("app_state"),
  thumbnail: text("thumbnail"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  sceneVersion: integer("scene_version").notNull().default(0),
  pinnedAt: integer("pinned_at", { mode: "number" }),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const shareLinks = sqliteTable("share_links", {
  token: text("token").primaryKey(), // crypto-random 32 bytes as hex (64 chars)
  sceneId: text("scene_id")
    .notNull()
    .references(() => scenes.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  expiresAt: integer("expires_at", { mode: "number" }).notNull(),
});

export const files = sqliteTable("files", {
  id: text("id").primaryKey(),
  sceneId: text("scene_id")
    .notNull()
    .references(() => scenes.id, { onDelete: "cascade" }),
  mimeType: text("mime_type").notNull(),
  size: integer("size"),
  r2Key: text("r2_key").notNull(),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});
