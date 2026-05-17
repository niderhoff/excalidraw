import { useCallback, useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";

import "./Dashboard.scss";

import type { SceneMeta } from "../../apiClient/scenes";

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return "Just now";
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return date.toLocaleDateString();
}

export const SceneCard = ({
  scene,
  folderName,
  selected,
  onToggleSelect,
  onRename,
  onDuplicate,
  onDelete,
  onMove,
  onTogglePin,
}: {
  scene: SceneMeta;
  folderName?: string;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
}) => {
  const [, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(scene.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isRenaming) {
        return;
      }
      // Ctrl/Cmd+click toggles selection
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        onToggleSelect?.(scene.id);
        return;
      }
      navigate(`/scene/${scene.id}`);
    },
    [navigate, scene.id, isRenaming, onToggleSelect],
  );

  const handleMenuClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen((prev) => !prev);
  }, []);

  const handleRenameSubmit = useCallback(() => {
    if (renameValue.trim() && renameValue !== scene.title) {
      onRename(scene.id, renameValue.trim());
    }
    setIsRenaming(false);
  }, [renameValue, scene.id, scene.title, onRename]);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData("application/x-scene-id", scene.id);
      e.dataTransfer.effectAllowed = "move";
    },
    [scene.id],
  );

  const isPinned = scene.pinnedAt != null;

  return (
    <div
      className={`dashboard-scene-card ${
        selected ? "dashboard-scene-card--selected" : ""
      } ${isPinned ? "dashboard-scene-card--pinned" : ""}`}
      onClick={handleClick}
      draggable
      onDragStart={handleDragStart}
    >
      {isPinned && (
        <div className="dashboard-scene-card__pin-badge" title="Pinned">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="none"
          >
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
          </svg>
        </div>
      )}
      <div className="dashboard-scene-card__thumbnail">
        {scene.thumbnail ? (
          <img src={scene.thumbnail} alt={scene.title} />
        ) : (
          <div className="dashboard-scene-card__thumbnail-empty">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 16l5-5 4 4 4-6 5 7" />
            </svg>
          </div>
        )}
      </div>
      <div className="dashboard-scene-card__info">
        {isRenaming ? (
          <input
            ref={inputRef}
            className="dashboard-scene-card__rename-input"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleRenameSubmit();
              }
              if (e.key === "Escape") {
                setIsRenaming(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="dashboard-scene-card__title">{scene.title}</span>
        )}
        <span className="dashboard-scene-card__date">
          {folderName && (
            <span className="dashboard-scene-card__folder">
              {folderName} &middot;{" "}
            </span>
          )}
          {formatDate(scene.updatedAt)}
        </span>
      </div>
      <div className="dashboard-scene-card__menu-wrapper" ref={menuRef}>
        <button
          className="dashboard-scene-card__menu-btn"
          onClick={handleMenuClick}
          aria-label="Scene actions"
        >
          ···
        </button>
        {menuOpen && (
          <div className="dashboard-scene-card__menu">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onTogglePin(scene.id, !isPinned);
              }}
            >
              {isPinned ? "Unpin" : "Pin to top"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                setRenameValue(scene.title);
                setIsRenaming(true);
              }}
            >
              Rename
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onDuplicate(scene.id);
              }}
            >
              Duplicate
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onMove(scene.id);
              }}
            >
              Move to folder
            </button>
            <hr />
            <button
              className="dashboard-scene-card__menu-danger"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onDelete(scene.id);
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
