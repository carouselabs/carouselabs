import { useCallback, useEffect, useState } from "react";
import {
  apiFetch,
  ApiError,
  CUSTOM_PROFILE_LIMITS,
  type CommentProfile,
  type MeResponse,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ProfileForm, draftFromProfile } from "../ProfileForm";

type View =
  | { mode: "list" }
  | { mode: "create" }
  | { mode: "edit"; profile: CommentProfile }
  // Duplicating pre-fills the form from a source profile but saves as a new
  // custom one, which is the only way to base a profile on a system preset.
  | { mode: "duplicate"; profile: CommentProfile };

type LoadState = "loading" | "ready" | "error";

interface Props {
  // Set when onboarding ended on "Create my profile now", so this screen opens
  // straight into the builder rather than its list.
  startInBuilder?: boolean;
  onBuilderOpened?: () => void;
}

export function ProfilesScreen({ startInBuilder, onBuilderOpened }: Props = {}) {
  const [profiles, setProfiles] = useState<CommentProfile[]>([]);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ mode: "list" });
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [{ profiles: fetched }, meRes] = await Promise.all([
        apiFetch<{ profiles: CommentProfile[] }>("/api/ext/profiles"),
        apiFetch<MeResponse>("/api/ext/me"),
      ]);
      setProfiles(fetched);
      setMe(meRes);
      setState("ready");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load profiles");
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Consumed once: the flag is cleared immediately so navigating away from
  // Profiles and back does not reopen the builder.
  useEffect(() => {
    if (!startInBuilder) return;
    setView({ mode: "create" });
    onBuilderOpened?.();
  }, [startInBuilder, onBuilderOpened]);

  const customProfiles = profiles.filter((p) => !p.isSystem);
  const systemProfiles = profiles.filter((p) => p.isSystem);
  const limit = me ? CUSTOM_PROFILE_LIMITS[me.plan] ?? null : null;
  const atLimit = limit !== null && customProfiles.length >= limit;

  async function handleDelete(profile: CommentProfile) {
    setPendingId(profile.id);
    setError(null);
    try {
      await apiFetch(`/api/ext/profiles/${profile.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete that profile");
    } finally {
      setPendingId(null);
    }
  }

  async function handleSetDefault(profile: CommentProfile) {
    setPendingId(profile.id);
    setError(null);
    try {
      // PUT revalidates the whole profile, so the current values ride along
      // unchanged alongside the default flag.
      await apiFetch(`/api/ext/profiles/${profile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draftFromProfile(profile), setAsDefault: true }),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't set that as default");
    } finally {
      setPendingId(null);
    }
  }

  if (view.mode === "create") {
    return <ProfileForm onSaved={() => { setView({ mode: "list" }); load(); }} onCancel={() => setView({ mode: "list" })} />;
  }

  if (view.mode === "edit") {
    return (
      <ProfileForm
        existing={view.profile}
        onSaved={() => { setView({ mode: "list" }); load(); }}
        onCancel={() => setView({ mode: "list" })}
      />
    );
  }

  if (view.mode === "duplicate") {
    // No `existing`, so the form POSTs a new profile, seeded from the source's
    // values with a distinct name. This is how a system preset becomes an
    // editable custom profile.
    const seed = { ...draftFromProfile(view.profile), name: `${view.profile.name} copy` };
    return (
      <ProfileForm
        seed={seed}
        onSaved={() => { setView({ mode: "list" }); load(); }}
        onCancel={() => setView({ mode: "list" })}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Comment profiles</h2>
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
              + New custom profile
            </Button>
            {atLimit && (
              <p className="text-xs text-muted-foreground">
                Your {me?.plan} plan allows {limit} custom profile{limit === 1 ? "" : "s"}. Upgrade
                to create more profiles — see the Account screen.
              </p>
            )}
          </div>

          {customProfiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Your profiles</p>
              {customProfiles.map((profile) => (
                <div key={profile.id} className="space-y-2 rounded-md border border-input p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{profile.name}</span>
                    {me?.defaultCommentProfileId === profile.id && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                        default
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{profile.whoIAm}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" disabled={pendingId === profile.id} onClick={() => setView({ mode: "edit", profile })}>
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" disabled={atLimit || pendingId === profile.id} onClick={() => setView({ mode: "duplicate", profile })}>
                      Duplicate
                    </Button>
                    <Button size="sm" variant="outline" disabled={pendingId === profile.id || me?.defaultCommentProfileId === profile.id} onClick={() => handleSetDefault(profile)}>
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

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Built-in profiles</p>
            {systemProfiles.map((profile) => (
              <div key={profile.id} className="space-y-2 rounded-md border border-input p-3">
                <span className="text-sm font-medium">{profile.name}</span>
                <p className="line-clamp-2 text-xs text-muted-foreground">{profile.whoIAm}</p>
                {/* System profiles are shared, so they offer Duplicate only —
                    editing or deleting one would change it for every user. */}
                <Button size="sm" variant="outline" disabled={atLimit} onClick={() => setView({ mode: "duplicate", profile })}>
                  Duplicate
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
