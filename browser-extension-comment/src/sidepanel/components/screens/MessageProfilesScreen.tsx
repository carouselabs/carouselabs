import { useCallback, useEffect, useState, type ReactNode } from "react";
import { apiFetch, ApiError, type MessageProfile, type MeResponse } from "@/lib/api";
import { MessageProfileForm, messageDraftFromProfile } from "../MessageProfileForm";
import { ProfileList } from "../ProfileList";

// Conversation Assistant profiles, the counterpart to ConnectionProfilesScreen.
// Same structure deliberately: presets are duplicated rather than edited (they
// are shared by every user).


type View =
  | { mode: "list" }
  | { mode: "create" }
  | { mode: "edit"; profile: MessageProfile }
  | { mode: "duplicate"; profile: MessageProfile };

type LoadState = "loading" | "ready" | "error";

interface Props {
  // The Profiles screen's title and kind switch, shown above the list.
  header?: ReactNode;
  // Set when the panel's "+ Create custom profile" brought the user here.
  startInBuilder?: boolean;
  onBuilderOpened?: () => void;
}

export function MessageProfilesScreen({ header, startInBuilder, onBuilderOpened }: Props = {}) {
  const [profiles, setProfiles] = useState<MessageProfile[]>([]);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ mode: "list" });
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [{ profiles: fetched }, meRes] = await Promise.all([
        apiFetch<{ profiles: MessageProfile[] }>("/api/ext/message-profiles"),
        apiFetch<MeResponse>("/api/ext/me"),
      ]);
      setProfiles(fetched);
      setMe(meRes);
      setState("ready");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load conversation profiles");
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

  async function handleDelete(profile: MessageProfile) {
    setPendingId(profile.id);
    setError(null);
    try {
      await apiFetch(`/api/ext/message-profiles/${profile.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete that profile");
    } finally {
      setPendingId(null);
    }
  }

  async function handleSetDefault(profile: MessageProfile) {
    setPendingId(profile.id);
    setError(null);
    try {
      // PUT revalidates the whole profile, so its current values ride along
      // unchanged alongside the default flag.
      await apiFetch(`/api/ext/message-profiles/${profile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...messageDraftFromProfile(profile), setAsDefault: true }),
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
    return <MessageProfileForm onSaved={close} onCancel={() => setView({ mode: "list" })} />;
  }

  if (view.mode === "edit") {
    return <MessageProfileForm existing={view.profile} onSaved={close} onCancel={() => setView({ mode: "list" })} />;
  }

  if (view.mode === "duplicate") {
    // No `existing`, so this POSTs a new profile seeded from the source — the
    // only way to base a custom profile on a shared preset.
    const seed = { ...messageDraftFromProfile(view.profile), name: `${view.profile.name} copy` };
    return <MessageProfileForm seed={seed} onSaved={close} onCancel={() => setView({ mode: "list" })} />;
  }

  return (
    <ProfileList
      header={header}
      title="Message profiles"
      loading={state === "loading"}
      error={error}
      profiles={profiles}
      summary={(profile) => profile.goal}
      defaultId={me?.defaultMessageProfileId}
      pendingId={pendingId}
      onNew={() => setView({ mode: "create" })}
      onEdit={(profile) => setView({ mode: "edit", profile })}
      onDuplicate={(profile) => setView({ mode: "duplicate", profile })}
      onSetDefault={handleSetDefault}
      onDelete={handleDelete}
    />
  );
}
