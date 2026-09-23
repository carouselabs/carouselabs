import { useEffect, useState } from "react";
import {
  apiFetch,
  ApiError,
  fetchExtConfig,
  LANGUAGES,
  type CommentProfile,
  type SettingsResponse,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ConnectContextEditor } from "../ConnectContextEditor";

// Per-install UI preference, so it lives in chrome.storage rather than on the
// User row. Unlike insertWarningHidden — which records that an account-level
// risk was acknowledged — this only decides whether one browser shows a button.
const SHOW_INSERT_STORAGE_KEY = "showInsertButton";

const fieldClass =
  "w-full rounded-md border border-input bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50";

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 rounded-md border border-input p-3">
      <p className="text-xs font-medium">{title}</p>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SettingsScreen() {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [profiles, setProfiles] = useState<CommentProfile[]>([]);
  const [insertEnabled, setInsertEnabled] = useState<boolean | null>(null);
  const [showInsert, setShowInsert] = useState(true);
  const [shortcut, setShortcut] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      apiFetch<SettingsResponse>("/api/ext/settings"),
      apiFetch<{ profiles: CommentProfile[] }>("/api/ext/profiles"),
    ])
      .then(([s, { profiles: p }]) => {
        if (cancelled) return;
        setSettings(s);
        setProfiles(p);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load settings");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    fetchExtConfig()
      .then((c) => !cancelled && setInsertEnabled(c.insertEnabled))
      .catch(() => !cancelled && setInsertEnabled(false));

    chrome.storage.local.get(SHOW_INSERT_STORAGE_KEY).then((stored) => {
      const value = stored[SHOW_INSERT_STORAGE_KEY];
      if (!cancelled && typeof value === "boolean") setShowInsert(value);
    });

    // Chrome owns the binding; an extension can read it but cannot set it.
    chrome.commands.getAll().then((commands) => {
      const generate = commands.find((c) => c.name === "generate-comment");
      if (!cancelled) setShortcut(generate?.shortcut || null);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Every account-level setting goes through the same PATCH, sending only the
  // field that changed.
  async function patch(partial: Partial<SettingsResponse>) {
    setSaving(true);
    setError(null);
    try {
      const updated = await apiFetch<SettingsResponse>("/api/ext/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      setSettings(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save that setting");
    } finally {
      setSaving(false);
    }
  }

  function handleShowInsert(next: boolean) {
    setShowInsert(next);
    chrome.storage.local.set({ [SHOW_INSERT_STORAGE_KEY]: next });
  }

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading settings…</div>;
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-sm font-semibold">Settings</h2>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <Row
        title="Show Insert button"
        hint={
          insertEnabled === false
            ? "Insert is currently turned off for everyone, so this setting has no effect."
            : "Insert types the comment into LinkedIn's comment box for you. Copy and paste is the safer option."
        }
      >
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showInsert}
            disabled={insertEnabled === false}
            onChange={(e) => handleShowInsert(e.target.checked)}
          />
          Show the button on the Home screen
        </label>
      </Row>

      <Row
        title="Insert warning"
        hint="Turning this back on will show the risk warning again the next time you use Insert."
      >
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!settings?.insertWarningHidden}
            disabled={saving}
            onChange={(e) => patch({ insertWarningHidden: !e.target.checked })}
          />
          Warn me before inserting
        </label>
      </Row>

      <Row title="Default comment profile" hint="Preselected on the Home screen.">
        <select
          className={fieldClass}
          value={settings?.defaultCommentProfileId ?? ""}
          disabled={saving}
          onChange={(e) => patch({ defaultCommentProfileId: e.target.value || null })}
        >
          <option value="">No default</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.isSystem ? " (built-in)" : ""}
            </option>
          ))}
        </select>
      </Row>

      <Row title="Default language" hint="Used as the starting language for new profiles.">
        <select
          className={fieldClass}
          value={settings?.defaultLanguage ?? ""}
          disabled={saving}
          onChange={(e) => patch({ defaultLanguage: e.target.value || null })}
        >
          <option value="">Not set</option>
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </Row>

      <Row
        title="Connection notes: your context"
        hint="What connection notes say about you. Saved in this browser and used for every note until you change it."
      >
        <ConnectContextEditor />
      </Row>

      <Row
        title="Keyboard shortcut"
        hint="Chrome doesn't let an extension change its own shortcut, so rebinding happens on Chrome's shortcuts page. The shortcut only fires while the side panel is open."
      >
        <div className="flex items-center justify-between gap-2">
          <code className="rounded bg-muted px-2 py-1 text-xs">
            {shortcut ?? "Not set"}
          </code>
          <Button
            size="sm"
            variant="outline"
            onClick={() => chrome.tabs.create({ url: "chrome://extensions/shortcuts" })}
          >
            Change
          </Button>
        </div>
      </Row>
    </div>
  );
}
