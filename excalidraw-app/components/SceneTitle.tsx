import { useState, useRef, useEffect, useCallback } from "react";

import { useAtom } from "../app-jotai";
import { updateScene } from "../apiClient/scenes";
import { cloudSceneAtom } from "../stores/currentSceneAtom";

import "./SceneTitle.scss";

export const SceneTitle = () => {
  const [sceneState, setSceneState] = useAtom(cloudSceneAtom);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSubmit = useCallback(async () => {
    setIsEditing(false);
    if (!sceneState || !editValue.trim() || editValue === sceneState.title) {
      return;
    }
    try {
      await updateScene(sceneState.id, {
        title: editValue.trim(),
        sceneVersion: sceneState.sceneVersion,
      });
      setSceneState({
        ...sceneState,
        title: editValue.trim(),
      });
    } catch (error) {
      console.error("Failed to rename scene:", error);
    }
  }, [sceneState, editValue, setSceneState]);

  if (!sceneState) {
    return null;
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className="scene-title__input"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSubmit();
          }
          if (e.key === "Escape") {
            setIsEditing(false);
          }
          // Stop propagation so excalidraw doesn't handle these keys
          e.stopPropagation();
        }}
      />
    );
  }

  return (
    <button
      className="scene-title__label"
      onClick={() => {
        setEditValue(sceneState.title);
        setIsEditing(true);
      }}
      title="Click to rename"
    >
      {sceneState.title}
    </button>
  );
};
