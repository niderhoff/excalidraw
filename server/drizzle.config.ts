import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: `file:${process.env.DATABASE_PATH || "./data/excalidraw.db"}`,
  },
});
