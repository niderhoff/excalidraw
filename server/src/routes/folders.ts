import { Hono } from "hono";
import { eq, isNull, asc } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "../db/index.js";
import { folders } from "../db/schema.js";

export function createFoldersRouter() {
  const router = new Hono();

  // GET /api/folders — List folders (optionally filtered by parentId)
  router.get("/", async (c) => {
    const parentId = c.req.query("parentId");

    const whereClause =
      parentId === "null" || parentId === "" || !parentId
        ? isNull(folders.parentId)
        : eq(folders.parentId, parentId);

    // If no parentId filter specified, return all folders (for tree building)
    const results =
      parentId === undefined
        ? await db
            .select()
            .from(folders)
            .orderBy(asc(folders.sortOrder), asc(folders.name))
        : await db
            .select()
            .from(folders)
            .where(whereClause)
            .orderBy(asc(folders.sortOrder), asc(folders.name));

    return c.json({ folders: results });
  });

  // POST /api/folders — Create folder
  router.post("/", async (c) => {
    const body = await c.req.json();
    const id = nanoid();
    const now = Date.now();

    await db.insert(folders).values({
      id,
      name: body.name || "New Folder",
      parentId: body.parentId || null,
      createdAt: now,
      updatedAt: now,
      sortOrder: body.sortOrder ?? 0,
    });

    return c.json({ id }, 201);
  });

  // PUT /api/folders/:id — Rename or move folder
  router.put("/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();

    const existing = await db.query.folders.findFirst({
      where: eq(folders.id, id),
    });

    if (!existing) {
      return c.json({ error: "Folder not found" }, 404);
    }

    const updates: Record<string, any> = {
      updatedAt: Date.now(),
    };

    if (body.name !== undefined) {
      updates.name = body.name;
    }
    if (body.parentId !== undefined) {
      updates.parentId = body.parentId || null;
    }
    if (body.sortOrder !== undefined) {
      updates.sortOrder = body.sortOrder;
    }

    await db.update(folders).set(updates).where(eq(folders.id, id));

    return c.json({ ok: true });
  });

  // DELETE /api/folders/:id — Delete folder (ON DELETE CASCADE handles children)
  router.delete("/:id", async (c) => {
    const id = c.req.param("id");
    await db.delete(folders).where(eq(folders.id, id));
    return c.json({ ok: true });
  });

  return router;
}
