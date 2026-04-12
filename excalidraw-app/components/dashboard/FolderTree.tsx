import { useState, useRef, useEffect } from "react";

import "./Dashboard.scss";

import type { Folder } from "../../apiClient/folders";

export const FolderTree = ({
  folders,
  currentFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onDropScene,
}: {
  folders: Folder[];
  currentFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
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

      {rootFolders.map((folder) => (
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
            <button
              className={`dashboard-folder-tree__item ${
                currentFolderId === folder.id ? "active" : ""
              } ${dropTargetId === folder.id ? "drop-target" : ""}`}
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
              {folder.name}
            </button>
          )}
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
      ))}

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
