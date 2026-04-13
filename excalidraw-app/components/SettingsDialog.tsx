import { useState, useEffect, useCallback } from "react";

import { getSetting, setSetting, deleteSetting } from "../apiClient/settings";

import "./SettingsDialog.scss";

export const SettingsDialog = ({ onClose }: { onClose: () => void }) => {
  const [apiKey, setApiKey] = useState("");
  const [currentKeyMasked, setCurrentKeyMasked] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getSetting("openai_api_key").then((data) => {
      if (data.isSet) {
        setCurrentKeyMasked(data.value);
      }
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!apiKey.trim()) {
      return;
    }
    setSaving(true);
    try {
      await setSetting("openai_api_key", apiKey.trim());
      setMessage("API key saved!");
      setApiKey("");
      // Refresh masked display
      const data = await getSetting("openai_api_key");
      if (data.isSet) {
        setCurrentKeyMasked(data.value);
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  }, [apiKey]);

  const handleRemove = useCallback(async () => {
    await deleteSetting("openai_api_key");
    setCurrentKeyMasked(null);
    setMessage("API key removed");
    setTimeout(() => setMessage(null), 3000);
  }, []);

  return (
    <div className="settings-dialog__overlay" onClick={onClose}>
      <div className="settings-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="settings-dialog__header">
          <h3>Settings</h3>
          <button className="settings-dialog__close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="settings-dialog__section">
          <label className="settings-dialog__label">OpenAI API Key</label>
          <p className="settings-dialog__hint">
            Required for AI text-to-diagram feature. Key is stored on the server
            and never sent to the browser.
          </p>
          {currentKeyMasked && (
            <div className="settings-dialog__current-key">
              <span>Current: {currentKeyMasked}</span>
              <button onClick={handleRemove}>Remove</button>
            </div>
          )}
          <div className="settings-dialog__input-row">
            <input
              type="password"
              className="settings-dialog__input"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave();
                }
                e.stopPropagation();
              }}
            />
            <button
              className="settings-dialog__save-btn"
              onClick={handleSave}
              disabled={saving || !apiKey.trim()}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
          {message && <div className="settings-dialog__message">{message}</div>}
        </div>
      </div>
    </div>
  );
};
