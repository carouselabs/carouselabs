import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError, openWebsite, type CommentProfile, type MeResponse } from "@/lib/api";
import { Segmented } from "@/components/ui/segmented";
import { ProfileForm, draftFromProfile } from "../ProfileForm";
import { ProfileList } from "../ProfileList";
import { ScreenHeader } from "../ScreenHeader";
import { ConnectionProfilesScreen } from "./ConnectionProfilesScreen";
import { MessageProfilesScreen } from "./MessageProfilesScreen";

type View =
  | { mode: "list" }
  | { mode: "create" }
  | { mode: "edit"; profile: CommentProfile }
  // Duplicating pre-fills the form from a source profile but saves as a new
  // custom one, which is the only way to base a profile on a system preset.
  | { mode: "duplicate"; profile: CommentProfile };

type LoadState = "loading" | "ready" | "error";

// Which kind of profile the screen opens on, and whose builder to open. All
// three live here rather than on separate screens: they are the same idea,
// and one nav entry keeps them findable.
export type ProfileKind = "comment" | "connection" | "message";

interface Props {
  // Set when onboarding ended on "Create my profile now", or when a panel's
  // "+ Create custom profile" was used, so this screen opens straight into
  // the builder for that kind rather than its list.
  startInBuilder?: ProfileKind | null;
  onBuilderOpened?: () => void;
}

export function ProfilesScreen({ startInBuilder, onBuilderOpened }: Props = {}) {
  const [tab, setTab] = useState<ProfileKind>(startInBuilder ?? "comment");
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
    if (startInBuilder !== "comment") return;
    setView({ mode: "create" });
    onBuilderOpened?.();
  }, [startInBuilder, onBuilderOpened]);

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

  // The kind switch, shown above every kind's list (but not over a builder).
  const header = (
    <>
      <ScreenHeader title="Profiles" description="How your comments, notes and messages sound." />
      <Segmented
        label="Kind of profile"
        options={[
          { value: "comment", label: "Comments" },
          { value: "connection", label: "Notes" },
          { value: "message", label: "Messages" },
        ]}
        value={tab}
        onChange={setTab}
      />
    </>
  );

  if (tab === "connection") {
    return (
      <ConnectionProfilesScreen
        header={header}
        startInBuilder={startInBuilder === "connection"}
        onBuilderOpened={onBuilderOpened}
      />
    );
  }

  if (tab === "message") {
    return (
      <MessageProfilesScreen header={header} startInBuilder={startInBuilder === "message"} onBuilderOpened={onBuilderOpened} />
    );
  }

  // System profiles are shared across every user, so they offer Duplicate
  // only — editing or deleting one would change it for everyone. Duplicating
  // is how a preset becomes an editable custom profile.
  return (
    <ProfileList
      header={header}
      title="Comment profiles"
      loading={state === "loading"}
      error={error}
      profiles={profiles}
      summary={(profile) => profile.whoIAm}
      defaultId={me?.defaultCommentProfileId}
      pendingId={pendingId}
      onNew={() => setView({ mode: "create" })}
      onEdit={(profile) => setView({ mode: "edit", profile })}
      onDuplicate={(profile) => setView({ mode: "duplicate", profile })}
      onSetDefault={handleSetDefault}
      onDelete={handleDelete}
      websiteLink={{
        label: "Easier on a big screen? Edit profiles on carouselabs.com",
        onClick: () => void openWebsite("/extension/profiles"),
      }}
    />
  );
}
