import { Hono } from "hono";
import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { files, scenes } from "../db/schema.js";

import type { StorageAdapter } from "../types.js";

export function createFilesRouter(storage: StorageAdapter) {
  const router = new Hono();

  // POST /api/files — Upload a binary file
  // Expects multipart form with fields: file (binary), sceneId, fileId, mimeType
  router.post("/", async (c) => {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const sceneId = formData.get("sceneId") as string | null;
    const fileId = formData.get("fileId") as string | null;
    const mimeType =
      (formData.get("mimeType") as string | null) ||
      file?.type ||
      "application/octet-stream";

    if (!file || !sceneId || !fileId) {
      return c.json(
        { error: "Missing required fields: file, sceneId, fileId" },
        400,
      );
    }

    // Verify scene exists
    const scene = await db.query.scenes.findFirst({
      where: eq(scenes.id, sceneId),
    });
    if (!scene) {
      return c.json({ error: "Scene not found" }, 404);
    }

    // Check if this file already exists (idempotent upload)
    const existing = await db.query.files.findFirst({
      where: eq(files.id, fileId),
    });
    if (existing) {
      return c.json({ id: fileId, status: "exists" });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const r2Key = `files/${sceneId}/${fileId}`;

    // Upload to storage
    await storage.put(r2Key, buffer, mimeType);

    // Record metadata in DB
    await db.insert(files).values({
      id: fileId,
      sceneId,
      mimeType,
      size: buffer.length,
      r2Key,
      createdAt: Date.now(),
    });

    return c.json({ id: fileId, status: "uploaded" }, 201);
  });

  // GET /api/files/:id — Download/proxy a file from storage
  router.get("/:id", async (c) => {
    const fileId = c.req.param("id");

    const fileRecord = await db.query.files.findFirst({
      where: eq(files.id, fileId),
    });

    if (!fileRecord) {
      return c.json({ error: "File not found" }, 404);
    }

    const result = await storage.get(fileRecord.r2Key);
    if (!result) {
      return c.json({ error: "File data not found in storage" }, 404);
    }

    return new Response(new Uint8Array(result.data), {
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": result.data.length.toString(),
      },
    });
  });

  return router;
}
