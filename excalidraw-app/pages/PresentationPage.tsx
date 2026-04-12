import { useParams, useLocation } from "wouter";
import { useEffect, useState } from "react";

import { restoreElements } from "@excalidraw/excalidraw/data/restore";

import type {
  ExcalidrawFrameLikeElement,
  NonDeletedExcalidrawElement,
  FileId,
} from "@excalidraw/element/types";

import type { BinaryFileData, BinaryFiles } from "@excalidraw/excalidraw/types";

import { getScene } from "../apiClient/scenes";
import { getOrderedSlides } from "../presentation/usePresentation";
import { PresentationMode } from "../presentation/PresentationMode";
import { getFile } from "../apiClient/files";

/**
 * Standalone presentation page at /present/:id.
 * Loads scene from server and immediately enters fullscreen presentation.
 */
export const PresentationPage = () => {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [elements, setElements] = useState<NonDeletedExcalidrawElement[]>([]);
  const [files, setFiles] = useState<BinaryFiles>({});
  const [slides, setSlides] = useState<ExcalidrawFrameLikeElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }

    getScene(id)
      .then(async (scene) => {
        const restored = restoreElements(scene.elements, null, {
          repairBindings: true,
        });
        setElements(restored as NonDeletedExcalidrawElement[]);
        setSlides(getOrderedSlides(restored as NonDeletedExcalidrawElement[]));

        // Load binary files if any
        if (scene.files && scene.files.length > 0) {
          const loadedFiles: BinaryFiles = {};
          await Promise.all(
            scene.files.map(async (f) => {
              try {
                const blob = await getFile(f.id);
                const dataURL = await blobToDataURL(blob);
                loadedFiles[f.id] = {
                  id: f.id as FileId,
                  dataURL: dataURL as BinaryFileData["dataURL"],
                  mimeType: f.mimeType as BinaryFileData["mimeType"],
                  created: f.createdAt,
                };
              } catch {
                // skip errored files
              }
            }),
          );
          setFiles(loadedFiles);
        }

        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const handleExit = () => {
    navigate(`/scene/${id}`);
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#fff",
          color: "#1b1b1f",
          fontFamily: "'Segoe UI', system-ui, sans-serif",
        }}
      >
        Loading presentation...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          gap: "1rem",
          fontFamily: "'Segoe UI', system-ui, sans-serif",
        }}
      >
        <p>Failed to load: {error}</p>
        <button onClick={() => navigate(`/scene/${id}`)}>Back to editor</button>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          gap: "1rem",
          fontFamily: "'Segoe UI', system-ui, sans-serif",
        }}
      >
        <p>No frames found in this scene. Add frames to create slides.</p>
        <button onClick={() => navigate(`/scene/${id}`)}>Back to editor</button>
      </div>
    );
  }

  return (
    <PresentationMode
      elements={elements}
      files={files}
      slides={slides}
      startIndex={0}
      onExit={handleExit}
    />
  );
};

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
