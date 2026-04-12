import { post, getBlob } from "./client";

export async function uploadFile(
  sceneId: string,
  fileId: string,
  blob: Blob,
  mimeType: string,
): Promise<{ id: string; status: string }> {
  const formData = new FormData();
  formData.append("file", blob);
  formData.append("sceneId", sceneId);
  formData.append("fileId", fileId);
  formData.append("mimeType", mimeType);

  return post<{ id: string; status: string }>("/files", formData);
}

export async function getFile(fileId: string): Promise<Blob> {
  return getBlob(`/files/${fileId}`);
}

/**
 * Returns the URL for a file. Can be used as image src directly.
 */
export function getFileUrl(fileId: string): string {
  return `/api/files/${fileId}`;
}
