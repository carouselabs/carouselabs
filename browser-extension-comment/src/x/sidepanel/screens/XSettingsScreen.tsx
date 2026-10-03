import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { apiFetch, ApiError, fetchExtConfig } from "@/lib/api";
import { Alert } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScreenHeader } from "@/sidepanel/components/ScreenHeader";
import { Group, SelectRow, SwitchRow } from "@/sidepanel/components/screens/SettingsScreen";
import { X_MAX_LENGTH, X_PREMIUM_REPLY_LENGTH } from "@/x/lib/xText";
import type { XProfile } from "./XHomeScreen";

interface XSettings {
  defaultProfileId: string | null;
  maxReplyLength: number;
  insertButtonHidden: boolean;
}

// The X extension's Settings: the account's XUserSettings
// (app/api/ext/x/settings), so carouselabs.com shows the same. Separate from
// the LinkedIn extension's settings.
export function XSettingsScreen() {
  const [settings, setSettings] = useState<XSettings | null>(null);
  const [profiles, setProfiles] = useState<XProfile[]>([]);
  const [insertEnabled, setInsertEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Settings apply on their own, with no Save button, so this brief "Saved"
  // is the only confirmation.
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      apiFetch<XSettings>("/api/ext/x/settings"),
      apiFetch<{ profiles: XProfile[] }>("/api/ext/x/profiles"),
    ])
      .then(([s, list]) => {
        if (cancelled) return;
        setSettings(s);
        setProfiles(list.profiles);
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

    return () => {
      cancelled = true;
      if (savedTimer.current !== null) window.clearTimeout(savedTimer.current);
    };
  }, []);

  // Sends only the field that changed.
  async function patch(partial: Partial<XSettings>) {
    setSaving(true);
    setError(null);
    try {
      const updated = await apiFetch<XSettings>("/api/ext/x/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      setSettings(updated);
      setSaved(true);
      if (savedTimer.current !== null) window.clearTimeout(savedTimer.current);
      savedTimer.current = window.setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save that setting");
    } finally {
      setSaving(false);
    }
  }

  // With no choice saved, Home preselects CarouseLabs' default preset, so the
  // dropdown shows that rather than an empty "No default".
  const builtInDefault = profiles.find((p) => p.isSystem && p.isDefault) ?? profiles[0];
  const defaultValue = settings?.defaultProfileId ?? builtInDefault?.id ?? "";
  const premium = (settings?.maxReplyLength ?? X_MAX_LENGTH) > X_MAX_LENGTH;

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
        settings && (
          <>
            <Group title="Reply length">
              <SwitchRow
                id="setting-x-premium"
                title="I have X Premium"
                hint={
                  premium
                    ? `Replies can be up to ${X_PREMIUM_REPLY_LENGTH.toLocaleString()} characters. Turn off if your account has X's normal ${X_MAX_LENGTH} limit.`
                    : `Replies stay within X's ${X_MAX_LENGTH} characters. Turn on only if your account has Premium, for replies up to ${X_PREMIUM_REPLY_LENGTH.toLocaleString()}.`
                }
                checked={premium}
                disabled={saving}
                onChange={(on) => void patch({ maxReplyLength: on ? X_PREMIUM_REPLY_LENGTH : X_MAX_LENGTH })}
              />
            </Group>

            <Group title="Insert">
              <SwitchRow
                id="setting-x-show-insert"
                title="Show the Insert button"
                hint={
                  insertEnabled === false
                    ? "Insert is currently turned off for everyone, so this setting has no effect."
                    : "Insert puts the text into X's reply box for you. You still review it and press Reply."
                }
                checked={!settings.insertButtonHidden}
                disabled={saving || insertEnabled === false}
                onChange={(show) => void patch({ insertButtonHidden: !show })}
              />
            </Group>

            {profiles.length > 0 && (
              <Group title="Defaults">
                <SelectRow id="setting-x-default-profile" title="X profile" hint="Preselected on the Home screen.">
                  <Select
                    value={defaultValue}
                    disabled={saving}
                    onValueChange={(value) => void patch({ defaultProfileId: value })}
                  >
                    <SelectTrigger aria-labelledby="setting-x-default-profile-label">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                          {p.isSystem ? " (built-in)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </SelectRow>
              </Group>
            )}
          </>
        )
      )}
    </div>
  );
}
