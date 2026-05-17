import { useState, useRef, useEffect } from "react";

import "./Dashboard.scss";

import type { Folder } from "../../apiClient/folders";
import type { SceneMeta } from "../../apiClient/scenes";

export const FolderTree = ({
  folders,
  scenes,
  currentFolderId,
  onSelectFolder,
  onSelectScene,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onDropScene,
}: {
  folders: Folder[];
  scenes: SceneMeta[];
  currentFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onSelectScene: (id: string) => void;
  onCreateFolder: (name: string, parentId?: string | null) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onDropScene: (sceneId: string, folderId: string | null) => void;
}) => {
  const [dropTargetId, setDropTargetId] = useState<string | "root" | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(
    () => {
      try {
        const stored = sessionStorage.getItem("dashboard-expanded-folders");
        if (stored) {
          return new Set(JSON.parse(stored));
        }
      } catch {
        // ignore
      }
      return new Set();
    },
  );

  const toggleExpand = (id: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      sessionStorage.setItem(
        "dashboard-expanded-folders",
        JSON.stringify([...next]),
      );
      return next;
    });
  };
  const createInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Build tree from flat list (only root-level for now)
  const rootFolders = folders.filter((f) => !f.parentId);

  useEffect(() => {
    if (isCreating && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [isCreating]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenuId) {
      return;
    }
    const handler = () => setContextMenuId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenuId]);

  const handleCreateSubmit = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName("");
    }
    setIsCreating(false);
  };

  const handleEditSubmit = (id: string) => {
    if (editValue.trim()) {
      onRenameFolder(id, editValue.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="dashboard-folder-tree">
      <button
        className={`dashboard-folder-tree__item ${
          currentFolderId === null ? "active" : ""
        } ${dropTargetId === "root" ? "drop-target" : ""}`}
        onClick={() => onSelectFolder(null)}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setDropTargetId("root");
        }}
        onDragLeave={() => setDropTargetId(null)}
        onDrop={(e) => {
          e.preventDefault();
          setDropTargetId(null);
          const sceneId = e.dataTransfer.getData("application/x-scene-id");
          if (sceneId) {
            onDropScene(sceneId, null);
          }
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
        All Drawings
      </button>

      {rootFolders.length > 0 && (
        <div className="dashboard-folder-tree__label">Folders</div>
      )}

      {rootFolders.map((folder) => {
        const expanded = expandedFolderIds.has(folder.id);
        const folderScenes = scenes.filter((s) => s.folderId === folder.id);
        return (
          <div key={folder.id} className="dashboard-folder-tree__folder">
            {editingId === folder.id ? (
              <input
                ref={editInputRef}
                className="dashboard-folder-tree__edit-input"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleEditSubmit(folder.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleEditSubmit(folder.id);
                  }
                  if (e.key === "Escape") {
                    setEditingId(null);
                  }
                }}
              />
            ) : (
              <div
                className={`dashboard-folder-tree__row ${
                  currentFolderId === folder.id ? "active" : ""
                } ${dropTargetId === folder.id ? "drop-target" : ""}`}
              >
                <button
                  className="dashboard-folder-tree__toggle"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(folder.id);
                  }}
                  aria-label={expanded ? "Collapse folder" : "Expand folder"}
                  disabled={folderScenes.length === 0}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={
                      expanded ? "dashboard-folder-tree__chevron-expanded" : ""
                    }
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
                <button
                  className="dashboard-folder-tree__item dashboard-folder-tree__item--in-row"
                  onClick={() => onSelectFolder(folder.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenuId(folder.id);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDropTargetId(folder.id);
                  }}
                  onDragLeave={() => setDropTargetId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDropTargetId(null);
                    const sceneId = e.dataTransfer.getData(
                      "application/x-scene-id",
                    );
                    if (sceneId) {
                      onDropScene(sceneId, folder.id);
                    }
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                  </svg>
                  <span className="dashboard-folder-tree__folder-name">
                    {folder.name}
                  </span>
                  <span className="dashboard-folder-tree__folder-count">
                    {folderScenes.length > 0 ? folderScenes.length : ""}
                  </span>
                </button>
              </div>
            )}
            {expanded &&
              folderScenes.map((scene) => (
                <button
                  key={scene.id}
                  className="dashboard-folder-tree__item dashboard-folder-tree__scene dashboard-folder-tree__scene--nested"
                  onClick={() => onSelectScene(scene.id)}
                  title={scene.title}
                >
                  {scene.pinnedAt != null ? (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      stroke="none"
                      className="dashboard-folder-tree__pin-mini"
                    >
                      <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                    </svg>
                  ) : (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  )}
                  <span className="dashboard-folder-tree__scene-title">
                    {scene.title}
                  </span>
                </button>
              ))}
            {contextMenuId === folder.id && (
              <div className="dashboard-folder-tree__context-menu">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setContextMenuId(null);
                    setEditValue(folder.name);
                    setEditingId(folder.id);
                  }}
                >
                  Rename
                </button>
                <button
                  className="dashboard-folder-tree__danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    setContextMenuId(null);
                    onDeleteFolder(folder.id);
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        );
      })}

      {scenes.some((s) => s.pinnedAt != null) && (
        <>
          <div className="dashboard-folder-tree__label">Pinned</div>
          {scenes
            .filter((s) => s.pinnedAt != null)
            .map((scene) => (
              <button
                key={scene.id}
                className="dashboard-folder-tree__item dashboard-folder-tree__scene dashboard-folder-tree__scene--pinned"
                onClick={() => onSelectScene(scene.id)}
                title={scene.title}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  stroke="none"
                >
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                </svg>
                <span className="dashboard-folder-tree__scene-title">
                  {scene.title}
                </span>
              </button>
            ))}
        </>
      )}

      {scenes.some((s) => s.pinnedAt == null) && (
        <>
          <div className="dashboard-folder-tree__label">Recent</div>
          {scenes
            .filter((s) => s.pinnedAt == null)
            .slice(0, 10)
            .map((scene) => (
              <button
                key={scene.id}
                className="dashboard-folder-tree__item dashboard-folder-tree__scene"
                onClick={() => onSelectScene(scene.id)}
                title={scene.title}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="dashboard-folder-tree__scene-title">
                  {scene.title}
                </span>
              </button>
            ))}
        </>
      )}

      {isCreating ? (
        <input
          ref={createInputRef}
          className="dashboard-folder-tree__edit-input"
          placeholder="Folder name"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onBlur={handleCreateSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleCreateSubmit();
            }
            if (e.key === "Escape") {
              setIsCreating(false);
            }
          }}
        />
      ) : (
        <button
          className="dashboard-folder-tree__add-btn"
          onClick={() => setIsCreating(true)}
        >
          + New Folder
        </button>
      )}
    </div>
  );
};
