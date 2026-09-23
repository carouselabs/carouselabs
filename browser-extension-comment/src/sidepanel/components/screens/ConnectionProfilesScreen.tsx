import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError, type ConnectionProfile, type MeResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ConnectionProfileForm, connectionDraftFromProfile } from "../ConnectionProfileForm";
import { RecommendedBadge } from "../RecommendedBadge";

// Connection Note profiles, the counterpart to ProfilesScreen for comments.
// Same structure deliberately: presets are duplicated rather than edited (they
// are shared by every user), and plan limits are shown before the form.

// Mirrors CUSTOM_CONNECTION_PROFILE_LIMITS in lib/connectionProfiles. The
// server re-checks on create; this only drives the UI.
const CUSTOM_CONNECTION_PROFILE_LIMITS: Record<string, number | null> = {
  FREE: 1,
  PRO: 5,
  GROWTH: null,
};

type View =
  | { mode: "list" }
  | { mode: "create" }
  | { mode: "edit"; profile: ConnectionProfile }
  | { mode: "duplicate"; profile: ConnectionProfile };

type LoadState = "loading" | "ready" | "error";

interface Props {
  // Set when the panel's "+ Create custom profile" brought the user here.
  startInBuilder?: boolean;
  onBuilderOpened?: () => void;
}

export function ConnectionProfilesScreen({ startInBuilder, onBuilderOpened }: Props = {}) {
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([]);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ mode: "list" });
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [{ profiles: fetched }, meRes] = await Promise.all([
        apiFetch<{ profiles: ConnectionProfile[] }>("/api/ext/connection-profiles"),
        apiFetch<MeResponse>("/api/ext/me"),
      ]);
      setProfiles(fetched);
      setMe(meRes);
      setState("ready");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load connection profiles");
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Consumed once, so navigating away and back does not reopen the builder.
  useEffect(() => {
    if (!startInBuilder) return;
    setView({ mode: "create" });
    onBuilderOpened?.();
  }, [startInBuilder, onBuilderOpened]);

  const customProfiles = profiles.filter((p) => !p.isSystem);
  const recommendedProfiles = profiles.filter((p) => p.isRecommended);
  const systemProfiles = profiles.filter((p) => p.isSystem && !p.isRecommended);
  const limit = me ? (CUSTOM_CONNECTION_PROFILE_LIMITS[me.plan] ?? null) : null;
  const atLimit = limit !== null && customProfiles.length >= limit;

  async function handleDelete(profile: ConnectionProfile) {
    setPendingId(profile.id);
    setError(null);
    try {
      await apiFetch(`/api/ext/connection-profiles/${profile.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete that profile");
    } finally {
      setPendingId(null);
    }
  }

  async function handleSetDefault(profile: ConnectionProfile) {
    setPendingId(profile.id);
    setError(null);
    try {
      // PUT revalidates the whole profile, so its current values ride along
      // unchanged alongside the default flag.
      await apiFetch(`/api/ext/connection-profiles/${profile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...connectionDraftFromProfile(profile), setAsDefault: true }),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't set that as default");
    } finally {
      setPendingId(null);
    }
  }

  const close = () => {
    setView({ mode: "list" });
    load();
  };

  if (view.mode === "create") {
    return <ConnectionProfileForm onSaved={close} onCancel={() => setView({ mode: "list" })} />;
  }

  if (view.mode === "edit") {
    return (
      <ConnectionProfileForm
        existing={view.profile}
        onSaved={close}
        onCancel={() => setView({ mode: "list" })}
      />
    );
  }

  if (view.mode === "duplicate") {
    // No `existing`, so this POSTs a new profile seeded from the source — the
    // only way to base a custom profile on a shared preset.
    const seed = { ...connectionDraftFromProfile(view.profile), name: `${view.profile.name} copy` };
    return (
      <ConnectionProfileForm seed={seed} onSaved={close} onCancel={() => setView({ mode: "list" })} />
    );
  }

  function renderSystemCard(profile: ConnectionProfile, recommended: boolean) {
    return (
      <div key={profile.id} className="space-y-2 rounded-md border border-input p-3">
        <div className="flex flex-wrap items-center gap-y-1">
          <span className="text-sm font-medium">{profile.name}</span>
          {recommended && <RecommendedBadge />}
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">{profile.angle}</p>
        <p className="text-[11px] text-muted-foreground">
          {profile.goal} · {profile.length}
        </p>
        <Button size="sm" variant="outline" disabled={atLimit} onClick={() => setView({ mode: "duplicate", profile })}>
          Duplicate
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Connection note profiles</h2>
        {me && (
          <span className="text-xs text-muted-foreground">
            {customProfiles.length}
            {limit === null ? "" : ` / ${limit}`} custom
          </span>
        )}
      </div>

      {state === "loading" && <p className="text-sm text-muted-foreground">Loading profiles…</p>}

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {state === "ready" && (
        <>
          <div className="space-y-1.5">
            <Button disabled={atLimit} onClick={() => setView({ mode: "create" })}>
              + New connection profile
            </Button>
            {atLimit && (
              <p className="text-xs text-muted-foreground">
                Your {me?.plan} plan allows {limit} custom connection profile{limit === 1 ? "" : "s"}.
                Upgrade to create more — see the Account screen.
              </p>
            )}
          </div>

          {recommendedProfiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Recommended by CarouseLabs</p>
              {recommendedProfiles.map((profile) => renderSystemCard(profile, true))}
            </div>
          )}

          {systemProfiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Built-in profiles</p>
              {systemProfiles.map((profile) => renderSystemCard(profile, false))}
            </div>
          )}

          {customProfiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Your profiles</p>
              {customProfiles.map((profile) => (
                <div key={profile.id} className="space-y-2 rounded-md border border-input p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{profile.name}</span>
                    {me?.defaultConnectionProfileId === profile.id && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                        default
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{profile.angle}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" disabled={pendingId === profile.id} onClick={() => setView({ mode: "edit", profile })}>
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" disabled={atLimit || pendingId === profile.id} onClick={() => setView({ mode: "duplicate", profile })}>
                      Duplicate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pendingId === profile.id || me?.defaultConnectionProfileId === profile.id}
                      onClick={() => handleSetDefault(profile)}
                    >
                      Set default
                    </Button>
                    <Button size="sm" variant="ghost" disabled={pendingId === profile.id} onClick={() => handleDelete(profile)}>
                      {pendingId === profile.id ? "…" : "Delete"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
