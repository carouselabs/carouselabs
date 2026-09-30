import { useCallback, useEffect, useState, type ReactNode } from "react";
import { apiFetch, ApiError, type ConnectionProfile, type MeResponse } from "@/lib/api";
import { ConnectionProfileForm, connectionDraftFromProfile } from "../ConnectionProfileForm";
import { ProfileList } from "../ProfileList";

// Connection Note profiles, the counterpart to ProfilesScreen for comments.
// Same structure deliberately: presets are duplicated rather than edited (they
// are shared by every user).


type View =
  | { mode: "list" }
  | { mode: "create" }
  | { mode: "edit"; profile: ConnectionProfile }
  | { mode: "duplicate"; profile: ConnectionProfile };

type LoadState = "loading" | "ready" | "error";

interface Props {
  // The Profiles screen's title and kind switch, shown above the list.
  header?: ReactNode;
  // Set when the panel's "+ Create custom profile" brought the user here.
  startInBuilder?: boolean;
  onBuilderOpened?: () => void;
}

export function ConnectionProfilesScreen({ header, startInBuilder, onBuilderOpened }: Props = {}) {
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

  return (
    <ProfileList
      header={header}
      title="Connection note profiles"
      loading={state === "loading"}
      error={error}
      profiles={profiles}
      summary={(profile) => profile.angle}
      meta={(profile) => `${profile.goal} · ${profile.length}`}
      defaultId={me?.defaultConnectionProfileId}
      pendingId={pendingId}
      onNew={() => setView({ mode: "create" })}
      onEdit={(profile) => setView({ mode: "edit", profile })}
      onDuplicate={(profile) => setView({ mode: "duplicate", profile })}
      onSetDefault={handleSetDefault}
      onDelete={handleDelete}
    />
  );
}
