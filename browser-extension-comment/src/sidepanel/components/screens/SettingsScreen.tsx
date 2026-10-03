import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ExternalLink } from "lucide-react";
import {
  apiFetch,
  ApiError,
  fetchExtConfig,
  LANGUAGES,
  type CommentProfile,
  type SettingsResponse,
} from "@/lib/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ConnectContextEditor } from "../ConnectContextEditor";
import { ScreenHeader } from "../ScreenHeader";
import { loadShowInsert, saveShowInsert } from "@/lib/syncedSettings";

// "No default" / "Not set" in a dropdown, whose options can't be "".
const NONE = "__none__";

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5" aria-label={title}>
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      <div className="divide-y rounded-lg border bg-card">{children}</div>
    </section>
  );
}

export function SwitchRow({
  id,
  title,
  hint,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  title: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 p-3">
      <div className="min-w-0 space-y-0.5">
        <p id={`${id}-label`} className="text-sm font-medium">
          {title}
        </p>
        <p id={`${id}-hint`} className="text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        labelledBy={`${id}-label`}
        describedBy={`${id}-hint`}
      />
    </div>
  );
}

export function SelectRow({ id, title, hint, children }: { id: string; title: string; hint: string; children: ReactNode }) {
  return (
    <div className="space-y-2 p-3">
      <div className="space-y-0.5">
        <p id={`${id}-label`} className="text-sm font-medium">
          {title}
        </p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {children}
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
  // A brief "Saved" beside the title after any change lands: settings apply
  // on their own, with no Save button, so this is the only confirmation.
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<number | null>(null);

  function flashSaved() {
    setSaved(true);
    if (savedTimer.current !== null) window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSaved(false), 2000);
  }

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

    // An account setting, so the website's Extension → Settings shows the
    // same value (src/lib/syncedSettings.ts).
    loadShowInsert().then((show) => {
      if (!cancelled) setShowInsert(show);
    });

    // Chrome owns the binding; an extension can read it but cannot set it.
    chrome.commands.getAll().then((commands) => {
      const generate = commands.find((c) => c.name === "generate-comment");
      if (!cancelled) setShortcut(generate?.shortcut || null);
    });

    return () => {
      cancelled = true;
      if (savedTimer.current !== null) window.clearTimeout(savedTimer.current);
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
      flashSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save that setting");
    } finally {
      setSaving(false);
    }
  }

  function handleShowInsert(next: boolean) {
    setShowInsert(next);
    void saveShowInsert(next).then(flashSaved);
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <ScreenHeader
        title="Settings"
        description="Saved to your account, so carouselabs.com shows the same."
        action={
          saved && (
            <span role="status" className="inline-flex shrink-0 animate-fade-in items-center gap-1 text-xs font-medium text-success">
              <Check aria-hidden className="h-3.5 w-3.5" />
              Saved
            </span>
          )
        }
      />

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <div role="status" aria-label="Loading settings" className="space-y-3 rounded-lg border bg-card p-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2 py-1">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="w-4/5" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <Group title="Insert">
            <SwitchRow
              id="setting-show-insert"
              title="Show the Insert button"
              hint={
                insertEnabled === false
                  ? "Insert is currently turned off for everyone, so this setting has no effect."
                  : "Insert puts the text into LinkedIn's box for you. You still review it and press Post."
              }
              checked={showInsert}
              disabled={insertEnabled === false}
              onChange={handleShowInsert}
            />
          </Group>

          <Group title="Defaults">
            <SelectRow id="setting-default-profile" title="Comment profile" hint="Preselected on the Home screen.">
              <Select
                value={settings?.defaultCommentProfileId ?? NONE}
                disabled={saving}
                onValueChange={(value) => patch({ defaultCommentProfileId: value === NONE ? null : value })}
              >
                <SelectTrigger aria-labelledby="setting-default-profile-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No default</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.isSystem ? " (built-in)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SelectRow>
            <SelectRow id="setting-language" title="Language" hint="The starting language for new profiles.">
              <Select
                value={settings?.defaultLanguage ?? NONE}
                disabled={saving}
                onValueChange={(value) => patch({ defaultLanguage: value === NONE ? null : value })}
              >
                <SelectTrigger aria-labelledby="setting-language-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not set</SelectItem>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SelectRow>
          </Group>

          <Group title="Connection notes">
            <div className="space-y-2.5 p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">What your notes say about you</p>
                <p className="text-xs text-muted-foreground">Used for every note until you change it.</p>
              </div>
              <ConnectContextEditor onSaved={flashSaved} />
            </div>
          </Group>

          <Group title="Keyboard shortcut">
            <div className="space-y-2.5 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Generate</p>
                {shortcut ? (
                  <span className="flex shrink-0 items-center gap-1" aria-label={shortcut}>
                    {shortcut.split("+").map((key, i) => (
                      <kbd
                        key={i}
                        className="rounded border border-b-2 bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground"
                      >
                        {key}
                      </kbd>
                    ))}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Not set</span>
                )}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Works while the side panel is open. Chrome doesn&apos;t let an extension change its own shortcut, so
                it&apos;s changed on Chrome&apos;s shortcuts page.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => chrome.tabs.create({ url: "chrome://extensions/shortcuts" })}
              >
                Change in Chrome
                <ExternalLink aria-hidden />
              </Button>
            </div>
          </Group>
        </>
      )}
    </div>
  );
}
