import { useEffect, useState } from "react";
import { fetchExtConfig } from "@/lib/api";

// Stub ahead of the full Settings screen. It exists now because the Insert
// toggle needs somewhere to live.
//
// This preference is per install (chrome.storage.local), not per account: it
// only decides whether one browser shows the button. The separate
// "don't show the warning again" flag IS per account, because what it records
// is that the user acknowledged a risk to their LinkedIn account.
const SHOW_INSERT_STORAGE_KEY = "showInsertButton";

export function SettingsScreen() {
  const [showInsert, setShowInsert] = useState(true);
  const [insertEnabled, setInsertEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    chrome.storage.local.get(SHOW_INSERT_STORAGE_KEY).then((stored) => {
      const value = stored[SHOW_INSERT_STORAGE_KEY];
      if (typeof value === "boolean") setShowInsert(value);
    });

    fetchExtConfig()
      .then((config) => setInsertEnabled(config.insertEnabled))
      .catch(() => setInsertEnabled(false));
  }, []);

  function handleToggle(next: boolean) {
    setShowInsert(next);
    chrome.storage.local.set({ [SHOW_INSERT_STORAGE_KEY]: next });
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-sm font-semibold">Settings</h2>

      <div className="space-y-1.5 rounded-md border border-input p-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showInsert}
            disabled={insertEnabled === false}
            onChange={(e) => handleToggle(e.target.checked)}
          />
          Show Insert button
        </label>

        {insertEnabled === false ? (
          <p className="text-xs text-muted-foreground">
            Insert is currently turned off for everyone, so this setting has no effect.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Insert types the comment into LinkedIn's comment box for you. LinkedIn does not allow
            tools that act on its site, and using it could lead to your account being restricted.
            Copy and paste is the safer option.
          </p>
        )}
      </div>
    </div>
  );
}
