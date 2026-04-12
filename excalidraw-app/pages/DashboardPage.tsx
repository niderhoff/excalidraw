import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";

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

export const DashboardPage = () => {
  const [, navigate] = useLocation();
  const [scenes, setScenes] = useState<SceneMeta[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<
    "updatedAt" | "createdAt" | "title"
  >("updatedAt");
  const [loading, setLoading] = useState(true);
  const [moveDialogSceneId, setMoveDialogSceneId] = useState<string | null>(
    null,
  );
  const [moveFolderId, setMoveFolderId] = useState<string | null>(null);

  // Fetch scenes
  const fetchScenes = useCallback(async () => {
    try {
      const data = await listScenes({
        folderId: currentFolderId,
        sort: sortField,
        order: sortField === "title" ? "asc" : "desc",
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
      const scene = scenes.find((s) => s.id === id);
      if (!scene) {
        return;
      }
      await updateScene(id, { title, sceneVersion: scene.sceneVersion });
      fetchScenes();
    },
    [scenes, fetchScenes],
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

  const handleMoveConfirm = useCallback(async () => {
    if (!moveDialogSceneId) {
      return;
    }
    const scene = scenes.find((s) => s.id === moveDialogSceneId);
    if (!scene) {
      return;
    }
    await updateScene(moveDialogSceneId, {
      folderId: moveFolderId,
      sceneVersion: scene.sceneVersion,
    });
    setMoveDialogSceneId(null);
    fetchScenes();
  }, [moveDialogSceneId, moveFolderId, scenes, fetchScenes]);

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

  const folderName =
    currentFolderId === null
      ? "All Drawings"
      : folders.find((f) => f.id === currentFolderId)?.name || "Folder";

  return (
    <div className="dashboard">
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
            </select>
          </div>

          {loading ? (
            <div className="dashboard__empty">Loading...</div>
          ) : scenes.length === 0 ? (
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
            <div className="dashboard__scene-grid">
              {scenes.map((scene) => (
                <SceneCard
                  key={scene.id}
                  scene={scene}
                  onRename={handleRenameScene}
                  onDuplicate={handleDuplicateScene}
                  onDelete={handleDeleteScene}
                  onMove={handleMoveScene}
                />
              ))}
            </div>
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
