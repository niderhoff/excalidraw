import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { useLocation } from "wouter";

import { STORAGE_KEYS } from "../app_constants";

import {
  listScenes,
  updateScene,
  deleteScene,
  duplicateScene,
  type SceneMeta,
} from "../apiClient/scenes";
import {
  listFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  type Folder,
} from "../apiClient/folders";
import { SceneCard } from "../components/dashboard/SceneCard";
import { FolderTree } from "../components/dashboard/FolderTree";

import "../components/dashboard/Dashboard.scss";

const getResolvedTheme = (): "light" | "dark" => {
  const stored = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_THEME);
  if (stored === "dark") {
    return "dark";
  }
  if (stored === "system") {
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
      ? "dark"
      : "light";
  }
  return "light";
};

export const DashboardPage = () => {
  const [, navigate] = useLocation();
  const [theme, setTheme] = useState<"light" | "dark">(getResolvedTheme);
  const [scenes, setScenes] = useState<SceneMeta[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<
    "updatedAt" | "createdAt" | "title" | "folder"
  >("updatedAt");
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Keyboard shortcut: N for new drawing
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === "n" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        navigate("/scene/new");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  // Sync theme with editor's localStorage setting
  useLayoutEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
    const sync = () => setTheme(getResolvedTheme());
    mediaQuery?.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    return () => {
      mediaQuery?.removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const [moveDialogSceneId, setMoveDialogSceneId] = useState<string | null>(
    null,
  );
  const [moveFolderId, setMoveFolderId] = useState<string | null>(null);

  // Fetch scenes
  const fetchScenes = useCallback(async () => {
    try {
      const serverSort = sortField === "folder" ? "updatedAt" : sortField;
      const data = await listScenes({
        folderId: currentFolderId,
        sort: serverSort,
        order: serverSort === "title" ? "asc" : "desc",
        q: searchQuery || undefined,
      });
      setScenes(data);
    } catch (error) {
      console.error("Failed to fetch scenes:", error);
    }
    setLoading(false);
  }, [currentFolderId, sortField, searchQuery]);

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    try {
      const data = await listFolders();
      setFolders(data);
    } catch (error) {
      console.error("Failed to fetch folders:", error);
    }
  }, []);

  useEffect(() => {
    fetchScenes();
  }, [fetchScenes]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  // Scene actions
  const handleRenameScene = useCallback(
    async (id: string, title: string) => {
      await updateScene(id, { title });
      fetchScenes();
    },
    [fetchScenes],
  );

  const handleDuplicateScene = useCallback(
    async (id: string) => {
      await duplicateScene(id);
      fetchScenes();
    },
    [fetchScenes],
  );

  const handleDeleteScene = useCallback(
    async (id: string) => {
      if (!window.confirm("Delete this drawing?")) {
        return;
      }
      await deleteScene(id);
      fetchScenes();
    },
    [fetchScenes],
  );

  const handleMoveScene = useCallback((id: string) => {
    setMoveDialogSceneId(id);
    setMoveFolderId(null);
  }, []);

  const handleBulkMove = useCallback(
    async (folderId: string | null) => {
      await Promise.all(
        [...selectedIds].map((id) => updateScene(id, { folderId })),
      );
      setSelectedIds(new Set());
      setMoveDialogSceneId(null);
      fetchScenes();
    },
    [selectedIds, fetchScenes],
  );

  const handleMoveConfirm = useCallback(async () => {
    if (!moveDialogSceneId) {
      return;
    }
    if (moveDialogSceneId === "__bulk__") {
      await handleBulkMove(moveFolderId);
      return;
    }
    await updateScene(moveDialogSceneId, { folderId: moveFolderId });
    setMoveDialogSceneId(null);
    fetchScenes();
  }, [moveDialogSceneId, moveFolderId, fetchScenes, handleBulkMove]);

  // Folder actions
  const handleCreateFolder = useCallback(
    async (name: string) => {
      await createFolder({ name });
      fetchFolders();
    },
    [fetchFolders],
  );

  const handleRenameFolder = useCallback(
    async (id: string, name: string) => {
      await updateFolder(id, { name });
      fetchFolders();
    },
    [fetchFolders],
  );

  const handleDeleteFolder = useCallback(
    async (id: string) => {
      if (!window.confirm("Delete this folder? Scenes will be unfiled.")) {
        return;
      }
      await deleteFolder(id);
      if (currentFolderId === id) {
        setCurrentFolderId(null);
      }
      fetchFolders();
      fetchScenes();
    },
    [currentFolderId, fetchFolders, fetchScenes],
  );

  // Drag-and-drop: move scene to folder
  const handleDropScene = useCallback(
    async (sceneId: string, folderId: string | null) => {
      await updateScene(sceneId, { folderId });
      fetchScenes();
    },
    [fetchScenes],
  );

  // Bulk selection
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (!window.confirm(`Delete ${selectedIds.size} drawing(s)?`)) {
      return;
    }
    await Promise.all([...selectedIds].map((id) => deleteScene(id)));
    setSelectedIds(new Set());
    fetchScenes();
  }, [selectedIds, fetchScenes]);

  // Client-side sort by folder name
  const sortedScenes = useMemo(() => {
    if (sortField !== "folder") {
      return scenes;
    }
    const folderMap = new Map(folders.map((f) => [f.id, f.name]));
    return [...scenes].sort((a, b) => {
      const aName = a.folderId ? folderMap.get(a.folderId) || "" : "";
      const bName = b.folderId ? folderMap.get(b.folderId) || "" : "";
      return aName.localeCompare(bName);
    });
  }, [scenes, folders, sortField]);

  const folderName =
    currentFolderId === null
      ? "All Drawings"
      : folders.find((f) => f.id === currentFolderId)?.name || "Folder";

  return (
    <div className={`dashboard ${theme === "dark" ? "dashboard--dark" : ""}`}>
      <div className="dashboard__header">
        <h1>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
            <circle cx="11" cy="11" r="2" />
          </svg>
          Excalidraw
        </h1>
        <div className="dashboard__header-actions">
          <button
            className="dashboard__btn-primary"
            onClick={() => navigate("/scene/new")}
          >
            + New Drawing
          </button>
        </div>
      </div>

      <div className="dashboard__body">
        <div className="dashboard__sidebar">
          <FolderTree
            folders={folders}
            currentFolderId={currentFolderId}
            onSelectFolder={setCurrentFolderId}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            onDropScene={handleDropScene}
          />
        </div>

        <div className="dashboard__content">
          <div className="dashboard__toolbar">
            <input
              className="dashboard__search"
              type="text"
              placeholder="Search drawings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              className="dashboard__sort"
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
            >
              <option value="updatedAt">Last modified</option>
              <option value="createdAt">Date created</option>
              <option value="title">Title</option>
              <option value="folder">Folder</option>
            </select>
          </div>

          {loading ? (
            <div className="dashboard__empty">Loading...</div>
          ) : sortedScenes.length === 0 ? (
            <div className="dashboard__empty">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              </svg>
              <p>
                {searchQuery
                  ? "No drawings match your search"
                  : `No drawings in ${folderName}`}
              </p>
              <button
                className="dashboard__btn-primary"
                onClick={() => navigate("/scene/new")}
              >
                Create your first drawing
              </button>
            </div>
          ) : (
            <>
              {selectedIds.size > 0 && (
                <div className="dashboard__bulk-bar">
                  <span>{selectedIds.size} selected</span>
                  <button
                    className="dashboard__btn-primary"
                    onClick={() => setMoveDialogSceneId("__bulk__")}
                  >
                    Move
                  </button>
                  <button
                    className="dashboard__bulk-bar__delete"
                    onClick={handleBulkDelete}
                  >
                    Delete
                  </button>
                  <button onClick={() => setSelectedIds(new Set())}>
                    Cancel
                  </button>
                </div>
              )}
              <div className="dashboard__scene-grid">
                {sortedScenes.map((scene) => (
                  <SceneCard
                    key={scene.id}
                    scene={scene}
                    folderName={
                      !currentFolderId && scene.folderId
                        ? folders.find((f) => f.id === scene.folderId)?.name
                        : undefined
                    }
                    selected={selectedIds.has(scene.id)}
                    onToggleSelect={handleToggleSelect}
                    onRename={handleRenameScene}
                    onDuplicate={handleDuplicateScene}
                    onDelete={handleDeleteScene}
                    onMove={handleMoveScene}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Move-to-folder dialog */}
      {moveDialogSceneId && (
        <div
          className="dashboard__move-overlay"
          onClick={() => setMoveDialogSceneId(null)}
        >
          <div
            className="dashboard__move-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Move to folder</h3>
            <div className="dashboard__move-dialog__list">
              <button
                className={moveFolderId === null ? "active" : ""}
                onClick={() => setMoveFolderId(null)}
              >
                No folder
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  className={moveFolderId === f.id ? "active" : ""}
                  onClick={() => setMoveFolderId(f.id)}
                >
                  {f.name}
                </button>
              ))}
            </div>
            <div className="dashboard__move-dialog__actions">
              <button onClick={() => setMoveDialogSceneId(null)}>Cancel</button>
              <button
                className="dashboard__btn-primary"
                onClick={handleMoveConfirm}
              >
                Move
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
