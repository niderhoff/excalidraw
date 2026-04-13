import { Hono } from "hono";
import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { settings } from "../db/schema.js";

export function createSettingsRouter() {
  const router = new Hono();

  // GET /api/settings/:key — Get a setting (masks sensitive values)
  router.get("/:key", async (c) => {
    const key = c.req.param("key");

    const row = await db.query.settings.findFirst({
      where: eq(settings.key, key),
    });

    if (!row) {
      return c.json({ key, value: null });
    }

    // Mask sensitive values — only show last 4 chars
    const isSensitive = key.includes("api_key") || key.includes("secret");
    const maskedValue = isSensitive
      ? `${"•".repeat(Math.max(0, row.value.length - 4))}${row.value.slice(-4)}`
      : row.value;

    return c.json({ key, value: maskedValue, isSet: true });
  });

  // PUT /api/settings/:key — Set a setting
  router.put("/:key", async (c) => {
    const key = c.req.param("key");
    const body = await c.req.json();
    const { value } = body;

    if (value === undefined || value === null) {
      return c.json({ error: "value is required" }, 400);
    }

    const now = Date.now();
    const existing = await db.query.settings.findFirst({
      where: eq(settings.key, key),
    });

    if (existing) {
      await db
        .update(settings)
        .set({ value, updatedAt: now })
        .where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value, updatedAt: now });
    }

    return c.json({ ok: true });
  });

  // DELETE /api/settings/:key — Remove a setting
  router.delete("/:key", async (c) => {
    const key = c.req.param("key");
    await db.delete(settings).where(eq(settings.key, key));
    return c.json({ ok: true });
  });

  return router;
}
