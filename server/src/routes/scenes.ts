import { Hono } from "hono";
import { eq, desc, asc, like, isNull, and, type SQL } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "../db/index.js";
import { scenes, files } from "../db/schema.js";

import type { StorageAdapter } from "../types.js";

export function createScenesRouter(storage: StorageAdapter) {
  const router = new Hono();

  // GET /api/scenes — List scenes (metadata + thumbnails, no elements)
  router.get("/", async (c) => {
    const folderId = c.req.query("folderId");
    const sort = c.req.query("sort") || "updatedAt";
    const order = c.req.query("order") || "desc";
    const q = c.req.query("q");

    const conditions: SQL[] = [];

    if (folderId === "null" || folderId === "") {
      conditions.push(isNull(scenes.folderId));
    } else if (folderId) {
      conditions.push(eq(scenes.folderId, folderId));
    }

    if (q) {
      conditions.push(like(scenes.title, `%${q}%`));
    }

    const orderByColumn =
      sort === "title"
        ? order === "asc"
          ? asc(scenes.title)
          : desc(scenes.title)
        : sort === "createdAt"
        ? order === "asc"
          ? asc(scenes.createdAt)
          : desc(scenes.createdAt)
        : order === "asc"
        ? asc(scenes.updatedAt)
        : desc(scenes.updatedAt);

    const selectFields = {
      id: scenes.id,
      title: scenes.title,
      folderId: scenes.folderId,
      thumbnail: scenes.thumbnail,
      createdAt: scenes.createdAt,
      updatedAt: scenes.updatedAt,
      sceneVersion: scenes.sceneVersion,
    };

    const results = await db
      .select(selectFields)
      .from(scenes)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(orderByColumn);

    return c.json({ scenes: results });
  });

  // GET /api/scenes/:id — Full scene with file metadata
  router.get("/:id", async (c) => {
    const id = c.req.param("id");

    const scene = await db.query.scenes.findFirst({
      where: eq(scenes.id, id),
    });

    if (!scene) {
      return c.json({ error: "Scene not found" }, 404);
    }

    const sceneFiles = await db
      .select({
        id: files.id,
        mimeType: files.mimeType,
        size: files.size,
        createdAt: files.createdAt,
      })
      .from(files)
      .where(eq(files.sceneId, id));

    return c.json({
      ...scene,
      elements: JSON.parse(scene.elements),
      appState: scene.appState ? JSON.parse(scene.appState) : null,
      files: sceneFiles,
    });
  });

  // POST /api/scenes — Create scene
  router.post("/", async (c) => {
    const body = await c.req.json();
    const id = nanoid();
    const now = Date.now();

    await db.insert(scenes).values({
      id,
      title: body.title || "Untitled",
      folderId: body.folderId || null,
      elements: JSON.stringify(body.elements || []),
      appState: body.appState ? JSON.stringify(body.appState) : null,
      thumbnail: body.thumbnail || null,
      createdAt: now,
      updatedAt: now,
      sceneVersion: 0,
    });

    return c.json({ id }, 201);
  });

  // PUT /api/scenes/:id — Update scene (auto-save target)
  router.put("/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();

    const existing = await db.query.scenes.findFirst({
      where: eq(scenes.id, id),
    });

    if (!existing) {
      return c.json({ error: "Scene not found" }, 404);
    }

    // Optimistic concurrency: reject if sceneVersion doesn't match
    if (
      body.sceneVersion !== undefined &&
      body.sceneVersion !== existing.sceneVersion
    ) {
      return c.json(
        {
          error: "Version conflict",
          serverVersion: existing.sceneVersion,
        },
        409,
      );
    }

    const updates: Record<string, any> = {
      updatedAt: Date.now(),
      sceneVersion: existing.sceneVersion + 1,
    };

    if (body.title !== undefined) {
      updates.title = body.title;
    }
    if (body.folderId !== undefined) {
      updates.folderId = body.folderId || null;
    }
    if (body.elements !== undefined) {
      updates.elements = JSON.stringify(body.elements);
    }
    if (body.appState !== undefined) {
      updates.appState = body.appState ? JSON.stringify(body.appState) : null;
    }
    if (body.thumbnail !== undefined) {
      updates.thumbnail = body.thumbnail;
    }

    await db.update(scenes).set(updates).where(eq(scenes.id, id));

    return c.json({
      sceneVersion: updates.sceneVersion,
      updatedAt: updates.updatedAt,
    });
  });

  // DELETE /api/scenes/:id
  router.delete("/:id", async (c) => {
    const id = c.req.param("id");

    // Get file keys to delete from storage
    const sceneFiles = await db
      .select({ r2Key: files.r2Key })
      .from(files)
      .where(eq(files.sceneId, id));

    // Delete from DB (cascade removes file records)
    await db.delete(scenes).where(eq(scenes.id, id));

    // Delete binary files from storage
    if (sceneFiles.length > 0) {
      await storage
        .deleteMany(sceneFiles.map((f) => f.r2Key))
        .catch((err) => console.error("Failed to delete storage files:", err));
    }

    return c.json({ ok: true });
  });

  // POST /api/scenes/:id/duplicate — Copy scene + files
  router.post("/:id/duplicate", async (c) => {
    const id = c.req.param("id");

    const original = await db.query.scenes.findFirst({
      where: eq(scenes.id, id),
    });

    if (!original) {
      return c.json({ error: "Scene not found" }, 404);
    }

    const newId = nanoid();
    const now = Date.now();

    await db.insert(scenes).values({
      id: newId,
      title: `${original.title} (copy)`,
      folderId: original.folderId,
      elements: original.elements,
      appState: original.appState,
      thumbnail: original.thumbnail,
      createdAt: now,
      updatedAt: now,
      sceneVersion: 0,
    });

    // Duplicate file records (share same R2 objects — immutable content-addressed)
    const originalFiles = await db
      .select()
      .from(files)
      .where(eq(files.sceneId, id));

    for (const file of originalFiles) {
      await db.insert(files).values({
        id: `${file.id}_${nanoid(8)}`,
        sceneId: newId,
        mimeType: file.mimeType,
        size: file.size,
        r2Key: file.r2Key,
        createdAt: now,
      });
    }

    return c.json({ id: newId }, 201);
  });

  return router;
}
