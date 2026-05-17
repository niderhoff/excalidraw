import { get, post, put, del } from "./client";

export interface SceneMeta {
  id: string;
  title: string;
  folderId: string | null;
  thumbnail: string | null;
  createdAt: number;
  updatedAt: number;
  sceneVersion: number;
  pinnedAt: number | null;
}

export interface SceneFull extends SceneMeta {
  elements: any[];
  appState: Record<string, any> | null;
  files: { id: string; mimeType: string; size: number; createdAt: number }[];
}

export interface ListScenesParams {
  folderId?: string | null;
  sort?: "updatedAt" | "createdAt" | "title";
  order?: "asc" | "desc";
  q?: string;
}

export async function listScenes(
  params: ListScenesParams = {},
): Promise<SceneMeta[]> {
  const searchParams = new URLSearchParams();
  if (params.folderId !== undefined) {
    searchParams.set("folderId", params.folderId ?? "null");
  }
  if (params.sort) {
    searchParams.set("sort", params.sort);
  }
  if (params.order) {
    searchParams.set("order", params.order);
  }
  if (params.q) {
    searchParams.set("q", params.q);
  }

  const qs = searchParams.toString();
  const result = await get<{ scenes: SceneMeta[] }>(
    `/scenes${qs ? `?${qs}` : ""}`,
  );
  return result.scenes;
}

export async function getScene(id: string): Promise<SceneFull> {
  return get<SceneFull>(`/scenes/${id}`);
}

export async function createScene(data: {
  title?: string;
  folderId?: string | null;
  elements?: any[];
  appState?: Record<string, any> | null;
}): Promise<{ id: string }> {
  return post<{ id: string }>("/scenes", data);
}

export async function updateScene(
  id: string,
  data: {
    title?: string;
    folderId?: string | null;
    elements?: any[];
    appState?: Record<string, any> | null;
    thumbnail?: string | null;
    sceneVersion?: number;
    pinned?: boolean;
  },
): Promise<{ sceneVersion: number; updatedAt: number }> {
  return put<{ sceneVersion: number; updatedAt: number }>(
    `/scenes/${id}`,
    data,
  );
}

export async function deleteScene(id: string): Promise<{ ok: boolean }> {
  return del<{ ok: boolean }>(`/scenes/${id}`);
}

export async function duplicateScene(id: string): Promise<{ id: string }> {
  return post<{ id: string }>(`/scenes/${id}/duplicate`);
}
