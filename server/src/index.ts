/* eslint-disable no-console */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "@hono/node-server/serve-static";
import { serve } from "@hono/node-server";

import { authMiddleware } from "./middleware/auth.js";
import { createScenesRouter } from "./routes/scenes.js";
import { createFoldersRouter } from "./routes/folders.js";
import { createFilesRouter } from "./routes/files.js";
import {
  createSharesRouter,
  createPublicShareRouter,
} from "./routes/shares.js";
import { createAIRouter } from "./routes/ai.js";
import { createSettingsRouter } from "./routes/settings.js";
import { createStorage } from "./storage/index.js";

// Initialize DB (runs mkdir + CREATE TABLE IF NOT EXISTS on import)
await import("./db/index.js");

const storage = createStorage();

const app = new Hono();

// Middleware
app.use("*", logger());

// CORS for development (Vite dev server on different port)
if (process.env.NODE_ENV !== "production") {
  app.use(
    "/api/*",
    cors({
      origin: ["http://localhost:3000", "http://localhost:3001"],
      credentials: true,
    }),
  );
}

// Public routes (NO auth) — must be mounted before auth middleware
app.route("/public/shared", createPublicShareRouter(storage));

// Health check (no auth required)
app.get("/health", (c) => c.json({ status: "ok" }));

// Auth middleware for all API routes
app.use("/api/*", authMiddleware);

// Mount API routes (authenticated)
app.route("/api/scenes", createScenesRouter(storage));
app.route("/api/folders", createFoldersRouter());
app.route("/api/files", createFilesRouter(storage));
app.route("/api/shares", createSharesRouter());
app.route("/api/ai", createAIRouter());
app.route("/api/settings", createSettingsRouter());

// In production, serve the frontend static files
if (process.env.NODE_ENV === "production") {
  app.use("/*", serveStatic({ root: "./public" }));
  // SPA fallback: serve index.html for any non-API, non-file route
  app.get("*", serveStatic({ root: "./public", path: "index.html" }));
}

const port = Number(process.env.PORT || 3100);

console.log(`Excalidraw server starting on port ${port}`);
console.log(
  `Auth: ${
    process.env.DEV_USER
      ? `DEV_USER=${process.env.DEV_USER}`
      : "Expecting Remote-User header from Nginx/Authelia"
  }`,
);

serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running at http://localhost:${port}`);
});
