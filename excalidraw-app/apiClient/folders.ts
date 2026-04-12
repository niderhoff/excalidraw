import { get, post, put, del } from "./client";

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
  sortOrder: number;
}

export async function listFolders(parentId?: string | null): Promise<Folder[]> {
  const qs = parentId !== undefined ? `?parentId=${parentId ?? "null"}` : "";
  const result = await get<{ folders: Folder[] }>(`/folders${qs}`);
  return result.folders;
}

export async function createFolder(data: {
  name: string;
  parentId?: string | null;
}): Promise<{ id: string }> {
  return post<{ id: string }>("/folders", data);
}

export async function updateFolder(
  id: string,
  data: { name?: string; parentId?: string | null; sortOrder?: number },
): Promise<{ ok: boolean }> {
  return put<{ ok: boolean }>(`/folders/${id}`, data);
}

export async function deleteFolder(id: string): Promise<{ ok: boolean }> {
  return del<{ ok: boolean }>(`/folders/${id}`);
}
