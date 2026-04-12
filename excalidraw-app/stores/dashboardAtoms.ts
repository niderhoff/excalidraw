import { atom } from "../app-jotai";

import type { SceneMeta } from "../apiClient/scenes";
import type { Folder } from "../apiClient/folders";

export const scenesAtom = atom<SceneMeta[]>([]);
export const foldersAtom = atom<Folder[]>([]);
export const currentFolderIdAtom = atom<string | null>(null);
export const searchQueryAtom = atom("");
export const sortFieldAtom = atom<"updatedAt" | "createdAt" | "title">(
  "updatedAt",
);
export const sortOrderAtom = atom<"asc" | "desc">("desc");
