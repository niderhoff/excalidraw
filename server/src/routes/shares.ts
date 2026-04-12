import { randomBytes } from "node:crypto";

import { Hono } from "hono";
import { eq, and, gt } from "drizzle-orm";

import { db } from "../db/index.js";
import { shareLinks, scenes, files } from "../db/schema.js";

import type { StorageAdapter } from "../types.js";

const DEFAULT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Authenticated routes for managing share links.
 * Mounted under /api/shares (behind auth middleware).
 */
export function createSharesRouter() {
  const router = new Hono();

  // POST /api/shares — Create a share link for a scene
  router.post("/", async (c) => {
    const body = await c.req.json();
    const { sceneId, expiresInMs } = body;

    if (!sceneId) {
      return c.json({ error: "sceneId is required" }, 400);
    }

    // Verify scene exists
    const scene = await db.query.scenes.findFirst({
      where: eq(scenes.id, sceneId),
    });
    if (!scene) {
      return c.json({ error: "Scene not found" }, 404);
    }

    // Generate unguessable token: 32 random bytes = 64 hex chars
    const token = randomBytes(32).toString("hex");
    const now = Date.now();
    const expiresAt = now + (expiresInMs || DEFAULT_EXPIRY_MS);

    await db.insert(shareLinks).values({
      token,
      sceneId,
      createdAt: now,
      expiresAt,
    });

    return c.json({ token, expiresAt }, 201);
  });

  // GET /api/shares?sceneId=xxx — List active share links for a scene
  router.get("/", async (c) => {
    const sceneId = c.req.query("sceneId");
    if (!sceneId) {
      return c.json({ error: "sceneId query param required" }, 400);
    }

    const now = Date.now();
    const links = await db
      .select({
        token: shareLinks.token,
        createdAt: shareLinks.createdAt,
        expiresAt: shareLinks.expiresAt,
      })
      .from(shareLinks)
      .where(
        and(eq(shareLinks.sceneId, sceneId), gt(shareLinks.expiresAt, now)),
      );

    return c.json({ links });
  });

  // DELETE /api/shares/:token — Revoke a share link
  router.delete("/:token", async (c) => {
    const token = c.req.param("token");
    await db.delete(shareLinks).where(eq(shareLinks.token, token));
    return c.json({ ok: true });
  });

  return router;
}

/**
 * Public routes for viewing shared scenes. NO auth required.
 * Mounted at /public/shared (outside auth middleware).
 */
export function createPublicShareRouter(storage: StorageAdapter) {
  const router = new Hono();

  // GET /public/shared/:token — View a shared scene (read-only)
  router.get("/:token", async (c) => {
    const token = c.req.param("token");

    // Constant-time-ish lookup — the token is the primary key,
    // so only exact matches return results. No enumeration possible.
    const link = await db.query.shareLinks.findFirst({
      where: eq(shareLinks.token, token),
    });

    if (!link) {
      return c.json({ error: "Link not found" }, 404);
    }

    // Check expiry
    if (link.expiresAt < Date.now()) {
      // Clean up expired link
      await db.delete(shareLinks).where(eq(shareLinks.token, token));
      return c.json({ error: "Link has expired" }, 410);
    }

    // Fetch scene
    const scene = await db.query.scenes.findFirst({
      where: eq(scenes.id, link.sceneId),
    });
    if (!scene) {
      return c.json({ error: "Scene not found" }, 404);
    }

    // Fetch file metadata
    const sceneFiles = await db
      .select({
        id: files.id,
        mimeType: files.mimeType,
        size: files.size,
      })
      .from(files)
      .where(eq(files.sceneId, link.sceneId));

    return c.json({
      title: scene.title,
      elements: JSON.parse(scene.elements),
      appState: scene.appState ? JSON.parse(scene.appState) : null,
      files: sceneFiles,
      expiresAt: link.expiresAt,
    });
  });

  // GET /public/shared/:token/files/:fileId — Serve a file from a shared scene
  router.get("/:token/files/:fileId", async (c) => {
    const token = c.req.param("token");
    const fileId = c.req.param("fileId");

    // Verify share link is valid and not expired
    const link = await db.query.shareLinks.findFirst({
      where: eq(shareLinks.token, token),
    });
    if (!link || link.expiresAt < Date.now()) {
      return c.json({ error: "Link not found or expired" }, 404);
    }

    // Verify file belongs to the shared scene
    const fileRecord = await db.query.files.findFirst({
      where: and(eq(files.id, fileId), eq(files.sceneId, link.sceneId)),
    });
    if (!fileRecord) {
      return c.json({ error: "File not found" }, 404);
    }

    const result = await storage.get(fileRecord.r2Key);
    if (!result) {
      return c.json({ error: "File data not found" }, 404);
    }

    return new Response(new Uint8Array(result.data), {
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "public, max-age=3600",
        "Content-Length": result.data.length.toString(),
      },
    });
  });

  return router;
}
