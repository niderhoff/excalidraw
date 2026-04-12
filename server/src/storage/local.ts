import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { StorageAdapter } from "../types.js";

/**
 * Filesystem-based storage adapter for development.
 * Stores files under a local directory, no R2 needed.
 */
export function createLocalStorage(
  basePath: string = "./data/files",
): StorageAdapter {
  return {
    async put(key, data, contentType) {
      const filePath = join(basePath, key);
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, data);
      // Store content type in a sidecar file
      await writeFile(`${filePath}.meta`, contentType);
    },

    async get(key) {
      const filePath = join(basePath, key);
      try {
        const data = await readFile(filePath);
        let contentType = "application/octet-stream";
        try {
          contentType = (await readFile(`${filePath}.meta`, "utf-8")).trim();
        } catch {
          // meta file may not exist for older files
        }
        return { data, contentType };
      } catch (err: any) {
        if (err.code === "ENOENT") {
          return null;
        }
        throw err;
      }
    },

    async delete(key) {
      const filePath = join(basePath, key);
      try {
        await unlink(filePath);
        await unlink(`${filePath}.meta`).catch(() => {});
      } catch (err: any) {
        if (err.code !== "ENOENT") {
          throw err;
        }
      }
    },

    async deleteMany(keys) {
      await Promise.all(keys.map((key) => this.delete(key)));
    },
  };
}
