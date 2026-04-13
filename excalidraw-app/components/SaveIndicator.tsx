import { useAtomValue } from "../app-jotai";
import { cloudSceneAtom } from "../stores/currentSceneAtom";

import "./SaveIndicator.scss";

export const SaveIndicator = () => {
  const sceneState = useAtomValue(cloudSceneAtom);

  if (!sceneState) {
    return null;
  }

  const { saveStatus } = sceneState;

  return (
    <span
      className={`save-indicator save-indicator--${saveStatus}`}
      title={
        saveStatus === "saving"
          ? "Saving..."
          : saveStatus === "saved"
          ? "All changes saved"
          : saveStatus === "offline"
          ? "Offline — saved locally, will sync when back online"
          : saveStatus === "error"
          ? "Save failed"
          : ""
      }
    >
      {saveStatus === "saving" && (
        <>
          <span className="save-indicator__dot" />
          Saving
        </>
      )}
      {saveStatus === "saved" && (
        <>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Saved
        </>
      )}
      {saveStatus === "offline" && (
        <>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0119 12.55" />
            <path d="M5 12.55a10.94 10.94 0 015.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0122.56 9" />
            <path d="M1.42 9a15.91 15.91 0 014.7-2.88" />
            <path d="M8.53 16.11a6 6 0 016.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
          Offline
        </>
      )}
      {saveStatus === "error" && (
        <>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          Error
        </>
      )}
    </span>
  );
};
