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
