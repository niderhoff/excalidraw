import { get, post, del } from "./client";

export interface ShareLink {
  token: string;
  createdAt: number;
  expiresAt: number;
}

export interface SharedScene {
  title: string;
  elements: any[];
  appState: Record<string, any> | null;
  files: { id: string; mimeType: string; size: number }[];
  expiresAt: number;
}

export async function createShareLink(
  sceneId: string,
  expiresInMs?: number,
): Promise<{ token: string; expiresAt: number }> {
  return post("/shares", { sceneId, expiresInMs });
}

export async function listShareLinks(sceneId: string): Promise<ShareLink[]> {
  const result = await get<{ links: ShareLink[] }>(
    `/shares?sceneId=${sceneId}`,
  );
  return result.links;
}

export async function revokeShareLink(token: string): Promise<void> {
  await del(`/shares/${token}`);
}

/**
 * Fetch a shared scene (public, no auth needed).
 * Uses /public/shared/ path which bypasses auth middleware.
 */
export async function getSharedScene(token: string): Promise<SharedScene> {
  const response = await fetch(`/public/shared/${token}`);
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export function getSharedFileUrl(token: string, fileId: string): string {
  return `/public/shared/${token}/files/${fileId}`;
}
