/**
 * Server-backed persistence layer, mirroring LocalData's interface.
 * Saves scene data to the backend API and binary files to R2 via /api/files.
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
const THUMBNAIL_DEBOUNCE_MS = 2000;

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

      try {
        const result = await updateScene(sceneState.id, {
          elements: cleanElements as any[],
          appState: cleanAppState,
          sceneVersion: sceneState.sceneVersion,
        });

        // Update sceneVersion after successful save
        appJotaiStore.set(cloudSceneAtom, {
          ...sceneState,
          sceneVersion: result.sceneVersion,
          saveStatus: "saved",
        });

        // Save binary files
        await CloudData.fileStorage.saveFiles({ elements, files });
        onFilesSaved();
      } catch (error: any) {
        console.error("CloudData save failed:", error);
        appJotaiStore.set(cloudSceneAtom, {
          ...sceneState,
          saveStatus: "error",
        });
      }
    },
    SAVE_DEBOUNCE_MS,
  );

  static save = (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
    onFilesSaved: () => void,
  ) => {
    const sceneState = appJotaiStore.get(cloudSceneAtom);
    if (sceneState) {
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

  // Generate and save a thumbnail (debounced separately, less frequent)
  private static _saveThumbnail = debounce(
    async (
      elements: readonly ExcalidrawElement[],
      files: BinaryFiles,
    ) => {
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
      CloudData._saveThumbnail(elements, files);
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
        // Can't save files without a scene ID
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
