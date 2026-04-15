/**
 * Server-backed persistence layer, mirroring LocalData's interface.
 * Saves to both server API and localStorage (write-through).
 * Falls back to localStorage when offline, syncs when back online.
 */

import { debounce } from "@excalidraw/common";
import { exportToCanvas } from "@excalidraw/excalidraw";
import { getNonDeletedElements } from "@excalidraw/element";
import { clearAppStateForLocalStorage } from "@excalidraw/excalidraw/appState";

import type {
  ExcalidrawElement,
  FileId,
  NonDeletedExcalidrawElement,
} from "@excalidraw/element/types";
import type {
  AppState,
  BinaryFileData,
  BinaryFiles,
} from "@excalidraw/excalidraw/types";

import { uploadFile, getFile } from "../apiClient/files";
import { updateScene } from "../apiClient/scenes";

import { SAVE_TO_LOCAL_STORAGE_TIMEOUT } from "../app_constants";
import { appJotaiStore } from "../app-jotai";
import { cloudSceneAtom } from "../stores/currentSceneAtom";

import { FileStatusStore } from "./fileStatusStore";
import { FileManager } from "./FileManager";

const SAVE_DEBOUNCE_MS = SAVE_TO_LOCAL_STORAGE_TIMEOUT; // 300ms
const THUMBNAIL_DEBOUNCE_MS = 30000;
const OFFLINE_LOCAL_KEY = "excalidraw-offline-scene";

function isNetworkError(error: any): boolean {
  return (
    error?.name === "TypeError" ||
    error?.message?.includes("NetworkError") ||
    error?.message?.includes("Failed to fetch") ||
    error?.message?.includes("network") ||
    error?.status === 0
  );
}

/** Save elements + appState to localStorage as offline fallback */
function saveToLocalFallback(
  sceneId: string,
  elements: readonly ExcalidrawElement[],
  appState: AppState,
) {
  try {
    const cleanElements = getNonDeletedElements(elements);
    const cleanAppState = clearAppStateForLocalStorage(appState);
    localStorage.setItem(
      `${OFFLINE_LOCAL_KEY}-${sceneId}`,
      JSON.stringify({
        elements: cleanElements,
        appState: cleanAppState,
        savedAt: Date.now(),
      }),
    );
  } catch {
    // localStorage might be full
  }
}

/** Load offline data for a scene, if any */
export function loadOfflineData(
  sceneId: string,
): { elements: any[]; appState: any; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(`${OFFLINE_LOCAL_KEY}-${sceneId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return null;
}

/** Clear offline data after successful sync */
function clearOfflineData(sceneId: string) {
  localStorage.removeItem(`${OFFLINE_LOCAL_KEY}-${sceneId}`);
}

export class CloudData {
  private static _save = debounce(
    async (
      elements: readonly ExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles,
      onFilesSaved: () => void,
    ) => {
      const sceneState = appJotaiStore.get(cloudSceneAtom);
      if (!sceneState?.id) {
        return;
      }

      const cleanElements = getNonDeletedElements(elements);
      const cleanAppState = clearAppStateForLocalStorage(appState);

      // Always write to localStorage as fallback
      saveToLocalFallback(sceneState.id, elements, appState);

      try {
        let result;
        try {
          result = await updateScene(sceneState.id, {
            elements: cleanElements as any[],
            appState: cleanAppState,
            sceneVersion: sceneState.sceneVersion,
          });
        } catch (err: any) {
          // Version conflict — retry with the latest version from the atom
          if (err.status === 409 || err.data?.error === "Version conflict") {
            const latest = appJotaiStore.get(cloudSceneAtom);
            const retryVersion =
              err.data?.serverVersion ?? latest?.sceneVersion;
            result = await updateScene(sceneState.id, {
              elements: cleanElements as any[],
              appState: cleanAppState,
              sceneVersion: retryVersion,
            });
          } else {
            throw err;
          }
        }

        // Success — clear offline data and update state
        clearOfflineData(sceneState.id);
        appJotaiStore.set(cloudSceneAtom, {
          ...appJotaiStore.get(cloudSceneAtom)!,
          sceneVersion: result.sceneVersion,
          saveStatus: "saved",
        });

        // Save binary files
        await CloudData.fileStorage.saveFiles({ elements, files });
        onFilesSaved();
      } catch (error: any) {
        if (isNetworkError(error)) {
          // Offline — data is safe in localStorage
          const latestState = appJotaiStore.get(cloudSceneAtom);
          if (latestState) {
            appJotaiStore.set(cloudSceneAtom, {
              ...latestState,
              saveStatus: "offline",
            });
          }
          // Try again later
          CloudData._scheduleRetry(elements, appState, files, onFilesSaved);
        } else {
          console.error("CloudData save failed:", error);
          appJotaiStore.set(cloudSceneAtom, {
            ...sceneState,
            saveStatus: "error",
          });
        }
      }
    },
    SAVE_DEBOUNCE_MS,
  );

  private static _retryTimeout: ReturnType<typeof setTimeout> | null = null;

  private static _scheduleRetry(
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
    onFilesSaved: () => void,
  ) {
    if (CloudData._retryTimeout) {
      clearTimeout(CloudData._retryTimeout);
    }
    // Retry in 10 seconds
    CloudData._retryTimeout = setTimeout(() => {
      CloudData._retryTimeout = null;
      CloudData._save(elements, appState, files, onFilesSaved);
    }, 10000);
  }

  static save = (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
    onFilesSaved: () => void,
  ) => {
    const sceneState = appJotaiStore.get(cloudSceneAtom);
    if (sceneState && sceneState.saveStatus !== "offline") {
      appJotaiStore.set(cloudSceneAtom, {
        ...sceneState,
        saveStatus: "saving",
      });
    }
    CloudData._save(elements, appState, files, onFilesSaved);
  };

  static flushSave = () => {
    CloudData._save.flush();
  };

  static isSavePaused = () => {
    return document.hidden;
  };

  private static _hasSavedFirstThumbnail = false;

  // Generate and save a thumbnail (debounced separately, less frequent)
  private static _saveThumbnail = debounce(
    async (elements: readonly ExcalidrawElement[], files: BinaryFiles) => {
      const sceneState = appJotaiStore.get(cloudSceneAtom);
      if (!sceneState?.id) {
        return;
      }
      const nonDeleted = getNonDeletedElements(elements);
      if (nonDeleted.length === 0) {
        return;
      }
      try {
        const canvas = await exportToCanvas({
          elements: nonDeleted as NonDeletedExcalidrawElement[],
          appState: { exportBackground: true } as any,
          files,
          getDimensions: (width: number, height: number) => {
            const maxDim = 320;
            const scale = Math.min(maxDim / width, maxDim / height, 1);
            return {
              width: Math.ceil(width * scale),
              height: Math.ceil(height * scale),
              scale,
            };
          },
        });
        const thumbnail = canvas.toDataURL("image/png", 0.7);
        await updateScene(sceneState.id, { thumbnail });
      } catch {
        // Thumbnail generation is best-effort
      }
    },
    THUMBNAIL_DEBOUNCE_MS,
  );

  static saveThumbnail = (
    elements: readonly ExcalidrawElement[],
    files: BinaryFiles,
  ) => {
    if (!CloudData.isSavePaused()) {
      // Generate first thumbnail immediately (3s after first change),
      // then debounce at 30s for subsequent updates
      if (!CloudData._hasSavedFirstThumbnail) {
        CloudData._hasSavedFirstThumbnail = true;
        setTimeout(() => {
          CloudData._saveThumbnail(elements, files);
          CloudData._saveThumbnail.flush();
        }, 3000);
      } else {
        CloudData._saveThumbnail(elements, files);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // File storage — uploads to /api/files (→ R2 or local)
  // ---------------------------------------------------------------------------
  static fileStorage = new FileManager({
    onFileStatusChange: FileStatusStore.updateStatuses.bind(FileStatusStore),

    async getFiles(ids: FileId[]) {
      const loadedFiles: BinaryFileData[] = [];
      const erroredFiles = new Map<FileId, true>();

      await Promise.all(
        ids.map(async (id) => {
          try {
            const blob = await getFile(id);
            const dataURL = await blobToDataURL(blob);
            loadedFiles.push({
              id,
              dataURL: dataURL as BinaryFileData["dataURL"],
              mimeType: blob.type as BinaryFileData["mimeType"],
              created: Date.now(),
              lastRetrieved: Date.now(),
            });
          } catch (error) {
            console.error(`Failed to load file ${id}:`, error);
            erroredFiles.set(id, true);
          }
        }),
      );

      return { loadedFiles, erroredFiles };
    },

    async saveFiles({ addedFiles }) {
      const sceneState = appJotaiStore.get(cloudSceneAtom);
      const sceneId = sceneState?.id;

      const savedFiles = new Map<FileId, BinaryFileData>();
      const erroredFiles = new Map<FileId, BinaryFileData>();

      if (!sceneId) {
        for (const [id, fileData] of addedFiles) {
          erroredFiles.set(id, fileData);
        }
        return { savedFiles, erroredFiles };
      }

      await Promise.all(
        [...addedFiles].map(async ([id, fileData]) => {
          try {
            const blob = dataURLToBlob(fileData.dataURL);
            await uploadFile(sceneId, id, blob, fileData.mimeType);
            savedFiles.set(id, fileData);
          } catch (error) {
            console.error(`Failed to upload file ${id}:`, error);
            erroredFiles.set(id, fileData);
          }
        }),
      );

      return { savedFiles, erroredFiles };
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function dataURLToBlob(dataURL: string): Blob {
  const [header, data] = dataURL.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "application/octet-stream";
  const binary = atob(data);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}
