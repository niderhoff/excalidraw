import { useParams } from "wouter";
import { useEffect, useState } from "react";

import { Excalidraw } from "@excalidraw/excalidraw";
import {
  restoreElements,
  restoreAppState,
} from "@excalidraw/excalidraw/data/restore";

import type { FileId } from "@excalidraw/element/types";
import type {
  BinaryFileData,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";

import {
  getSharedScene,
  getSharedFileUrl,
  type SharedScene,
} from "../apiClient/shares";

/**
 * Public read-only viewer for shared scenes.
 * Accessible at /shared/:token without authentication.
 */
export const SharedViewPage = () => {
  const { token } = useParams<{ token: string }>();
  const [scene, setScene] = useState<SharedScene | null>(null);
  const [files, setFiles] = useState<BinaryFiles>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    getSharedScene(token)
      .then(async (data) => {
        setScene(data);

        // Load binary files
        if (data.files && data.files.length > 0) {
          const loadedFiles: BinaryFiles = {};
          await Promise.all(
            data.files.map(async (f) => {
              try {
                const url = getSharedFileUrl(token, f.id);
                const response = await fetch(url);
                const blob = await response.blob();
                const dataURL = await blobToDataURL(blob);
                loadedFiles[f.id] = {
                  id: f.id as FileId,
                  dataURL: dataURL as BinaryFileData["dataURL"],
                  mimeType: f.mimeType as BinaryFileData["mimeType"],
                  created: Date.now(),
                };
              } catch {
                // skip failed files
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
  }, [token]);

  // Add files to the API once loaded
  useEffect(() => {
    if (api && Object.keys(files).length > 0) {
      api.addFiles(Object.values(files));
    }
  }, [api, files]);

  if (loading) {
    return (
      <div style={centerStyle}>
        <p>Loading shared drawing...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={centerStyle}>
        <h2 style={{ margin: 0 }}>
          {error.includes("expired") ? "Link expired" : "Not found"}
        </h2>
        <p style={{ color: "#666" }}>{error}</p>
      </div>
    );
  }

  if (!scene) {
    return null;
  }

  const restoredElements = restoreElements(scene.elements, null, {
    repairBindings: true,
  });
  const restoredAppState = restoreAppState(scene.appState, null);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Excalidraw
        initialData={{
          elements: restoredElements,
          appState: {
            ...restoredAppState,
            viewModeEnabled: true,
          },
          files,
        }}
        viewModeEnabled={true}
        onExcalidrawAPI={(a) => setApi(a)}
        UIOptions={{
          canvasActions: {
            export: false,
          },
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "0.75rem",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.06)",
          backdropFilter: "blur(8px)",
          borderRadius: "0.5rem",
          padding: "0.35rem 0.75rem",
          fontSize: "0.8rem",
          color: "#555",
          fontFamily: "system-ui, sans-serif",
          pointerEvents: "none",
        }}
      >
        {scene.title} — Read-only
      </div>
    </div>
  );
};

const centerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100vh",
  fontFamily: "'Segoe UI', system-ui, sans-serif",
  gap: "0.5rem",
};

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
