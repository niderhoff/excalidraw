/* eslint-disable no-console */
import { createR2Storage } from "./r2.js";
import { createLocalStorage } from "./local.js";

import type { StorageAdapter } from "../types.js";

/**
 * Create the appropriate storage adapter based on environment.
 * Uses R2 when R2_ENDPOINT is set, otherwise falls back to local filesystem.
 */
export function createStorage(): StorageAdapter {
  if (process.env.R2_ENDPOINT) {
    console.log("Using Cloudflare R2 storage");
    return createR2Storage();
  }
  console.log("Using local filesystem storage (set R2_ENDPOINT for R2)");
  return createLocalStorage(process.env.LOCAL_STORAGE_PATH || "./data/files");
}
