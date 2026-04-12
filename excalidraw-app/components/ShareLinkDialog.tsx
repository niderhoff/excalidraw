import { useState, useCallback, useEffect } from "react";

import { useAtomValue } from "../app-jotai";
import {
  createShareLink,
  listShareLinks,
  revokeShareLink,
  type ShareLink,
} from "../apiClient/shares";
import { cloudSceneAtom } from "../stores/currentSceneAtom";

import "./ShareLinkDialog.scss";

const EXPIRY_OPTIONS = [
  { label: "1 hour", ms: 60 * 60 * 1000 },
  { label: "24 hours", ms: 24 * 60 * 60 * 1000 },
  { label: "7 days", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "30 days", ms: 30 * 24 * 60 * 60 * 1000 },
];

function formatExpiry(expiresAt: number): string {
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) {
    return "Expired";
  }
  const hours = Math.floor(remaining / 3600000);
  if (hours < 1) {
    return `${Math.ceil(remaining / 60000)}m left`;
  }
  if (hours < 24) {
    return `${hours}h left`;
  }
  return `${Math.floor(hours / 24)}d left`;
}

export const ShareLinkDialog = ({ onClose }: { onClose: () => void }) => {
  const sceneState = useAtomValue(cloudSceneAtom);
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [expiryMs, setExpiryMs] = useState(EXPIRY_OPTIONS[2].ms); // 7 days
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchLinks = useCallback(async () => {
    if (!sceneState?.id) {
      return;
    }
    const data = await listShareLinks(sceneState.id);
    setLinks(data);
  }, [sceneState?.id]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleCreate = useCallback(async () => {
    if (!sceneState?.id) {
      return;
    }
    setLoading(true);
    try {
      const { token } = await createShareLink(sceneState.id, expiryMs);
      const url = `${window.location.origin}/shared/${token}`;
      await navigator.clipboard.writeText(url);
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
      fetchLinks();
    } catch (error) {
      console.error("Failed to create share link:", error);
    }
    setLoading(false);
  }, [sceneState?.id, expiryMs, fetchLinks]);

  const handleCopy = useCallback(async (token: string) => {
    const url = `${window.location.origin}/shared/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const handleRevoke = useCallback(
    async (token: string) => {
      await revokeShareLink(token);
      fetchLinks();
    },
    [fetchLinks],
  );

  return (
    <div className="share-dialog__overlay" onClick={onClose}>
      <div className="share-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="share-dialog__header">
          <h3>Share read-only link</h3>
          <button className="share-dialog__close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="share-dialog__create">
          <select
            value={expiryMs}
            onChange={(e) => setExpiryMs(Number(e.target.value))}
            className="share-dialog__select"
          >
            {EXPIRY_OPTIONS.map((opt) => (
              <option key={opt.ms} value={opt.ms}>
                Expires in {opt.label}
              </option>
            ))}
          </select>
          <button
            className="share-dialog__create-btn"
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create & copy link"}
          </button>
        </div>

        {links.length > 0 && (
          <div className="share-dialog__links">
            <div className="share-dialog__links-label">Active links</div>
            {links.map((link) => (
              <div key={link.token} className="share-dialog__link">
                <span className="share-dialog__link-token">
                  ...{link.token.slice(-8)}
                </span>
                <span className="share-dialog__link-expiry">
                  {formatExpiry(link.expiresAt)}
                </span>
                <button
                  className="share-dialog__link-copy"
                  onClick={() => handleCopy(link.token)}
                >
                  {copied === link.token ? "Copied!" : "Copy"}
                </button>
                <button
                  className="share-dialog__link-revoke"
                  onClick={() => handleRevoke(link.token)}
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
