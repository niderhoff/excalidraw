import { atom } from "../app-jotai";

export interface CloudSceneState {
  id: string;
  title: string;
  folderId: string | null;
  sceneVersion: number;
  saveStatus: "idle" | "saving" | "saved" | "error";
}

/**
 * Tracks the currently-open cloud scene's metadata.
 * null when no server-backed scene is loaded (e.g. local-only mode).
 */
export const cloudSceneAtom = atom<CloudSceneState | null>(null);
