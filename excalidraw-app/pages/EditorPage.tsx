import { useParams, useLocation } from "wouter";
import { useEffect, useState } from "react";

import ExcalidrawApp from "../App";
import { createScene } from "../apiClient/scenes";
import { setLastSceneId } from "../AppRouter";

/**
 * Editor page — loads or creates a scene, then renders ExcalidrawApp
 * with the sceneId prop for server-backed persistence.
 */
export const EditorPage = () => {
  const params = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const [sceneId, setSceneId] = useState<string | undefined>(params.id);
  const [loading, setLoading] = useState(!params.id);

  useEffect(() => {
    if (params.id) {
      setLastSceneId(params.id);
    }
    // /scene/new — create a new scene on the server, then redirect
    if (!params.id) {
      createScene({ title: "Untitled" })
        .then(({ id }) => {
          setLastSceneId(id);
          navigate(`/scene/${id}`, { replace: true });
          setSceneId(id);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Failed to create scene:", error);
          setLoading(false);
        });
    }
  }, [params.id, navigate]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          color: "#666",
        }}
      >
        Creating new drawing...
      </div>
    );
  }

  return <ExcalidrawApp sceneId={sceneId} />;
};
