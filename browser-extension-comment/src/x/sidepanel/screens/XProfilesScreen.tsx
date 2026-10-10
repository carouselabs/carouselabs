import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError, openWebsite, type CommentProfile } from "@/lib/api";
import { Segmented } from "@/components/ui/segmented";
import { ProfileForm, draftFromProfile, xProfileFormSite } from "@/sidepanel/components/ProfileForm";
import { ProfileList } from "@/sidepanel/components/ProfileList";
import { ScreenHeader } from "@/sidepanel/components/ScreenHeader";
import { MessageProfilesScreen } from "@/sidepanel/components/screens/MessageProfilesScreen";
import { AgentsScreen } from "@/sidepanel/components/screens/AgentsScreen";
import { X_MAX_LENGTH } from "@/x/lib/xText";

type View =
  | { mode: "list" }
  | { mode: "create" }
  | { mode: "edit"; profile: CommentProfile }
  | { mode: "duplicate"; profile: CommentProfile };

// "agents": the AI agents Messages can reply with, shared with LinkedIn.
export type XProfileKind = "replies" | "messages" | "agents";

interface Props {
  // Opens straight into a builder (from "+ Create custom profile" on Home or
  // Messages), consumed once.
  startInBuilder?: XProfileKind | null;
  onBuilderOpened?: () => void;
}

// The X extension's Profiles: its own reply profiles (XProfile, separate from
// LinkedIn's comment profiles) and the conversation reasons it shares with
// LinkedIn's Messages. An X profile has the same fields as a LinkedIn one, so
// it uses the same list and builder, pointed at the X routes and X's limit.
export function XProfilesScreen({ startInBuilder, onBuilderOpened }: Props = {}) {
  const [tab, setTab] = useState<XProfileKind>(startInBuilder ?? "replies");
  const [profiles, setProfiles] = useState<CommentProfile[]>([]);
  const [defaultId, setDefaultId] = useState<string | null>(null);
  const [maxLength, setMaxLength] = useState(X_MAX_LENGTH);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ mode: startInBuilder === "replies" ? "create" : "list" });
  // Opening the builder from elsewhere (Home's "Create profile") while this
  // screen is already showing: switch to it during render, as the LinkedIn
  // profile screens do, rather than in an effect.
  const [previousStart, setPreviousStart] = useState(startInBuilder);
  if (previousStart !== startInBuilder) {
    setPreviousStart(startInBuilder);
    if (startInBuilder === "replies") setView({ mode: "create" });
  }
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(() => {
    return Promise.all([
      apiFetch<{ profiles: CommentProfile[]; defaultProfileId: string | null }>("/api/ext/x/profiles"),
      apiFetch<{ maxReplyLength: number }>("/api/ext/x/settings"),
    ])
      .then(([list, settings]) => {
        setProfiles(list.profiles);
        setDefaultId(list.defaultProfileId ?? list.profiles.find((p) => p.isSystem && p.isDefault)?.id ?? null);
        setMaxLength(settings.maxReplyLength);
        setState("ready");
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to load your X profiles");
        setState("error");
      });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Consumed once, so navigating away and back does not reopen the builder.
  useEffect(() => {
    if (startInBuilder !== "replies") return;
    onBuilderOpened?.();
  }, [startInBuilder, onBuilderOpened]);

  async function run(profile: CommentProfile, action: () => Promise<unknown>, failure: string) {
    setPendingId(profile.id);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : failure);
    } finally {
      setPendingId(null);
    }
  }

  const done = () => {
    setView({ mode: "list" });
    void load();
  };
  const site = xProfileFormSite(maxLength);

  if (view.mode === "create") return <ProfileForm site={site} onSaved={done} onCancel={() => setView({ mode: "list" })} />;
  if (view.mode === "edit") {
    return <ProfileForm site={site} existing={view.profile} onSaved={done} onCancel={() => setView({ mode: "list" })} />;
  }
  if (view.mode === "duplicate") {
    const seed = { ...draftFromProfile(view.profile), name: `${view.profile.name} copy` };
    return <ProfileForm site={site} seed={seed} onSaved={done} onCancel={() => setView({ mode: "list" })} />;
  }

  const header = (
    <>
      <ScreenHeader title="Profiles" description="How your X replies and messages sound." />
      <Segmented
        label="Kind of profile"
        options={[
          { value: "replies", label: "Replies" },
          { value: "messages", label: "Messages" },
          { value: "agents", label: "Agents" },
        ]}
        value={tab}
        onChange={setTab}
      />
    </>
  );

  if (tab === "agents") {
    return <AgentsScreen header={header} startInBuilder={startInBuilder === "agents"} onBuilderOpened={onBuilderOpened} />;
  }

  if (tab === "messages") {
    return (
      <MessageProfilesScreen header={header} startInBuilder={startInBuilder === "messages"} onBuilderOpened={onBuilderOpened} />
    );
  }

  return (
    <ProfileList
      header={header}
      title="X reply profiles"
      loading={state === "loading"}
      error={error}
      profiles={profiles}
      summary={(profile) => profile.whoIAm}
      defaultId={defaultId}
      pendingId={pendingId}
      onNew={() => setView({ mode: "create" })}
      onEdit={(profile) => setView({ mode: "edit", profile })}
      onDuplicate={(profile) => setView({ mode: "duplicate", profile })}
      // Through X's settings, the one place the default lives, rather than
      // re-sending the whole profile with setAsDefault.
      onSetDefault={(profile) =>
        run(
          profile,
          () =>
            apiFetch("/api/ext/x/settings", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ defaultProfileId: profile.id }),
            }),
          "Couldn't set that as default",
        )
      }
      onDelete={(profile) =>
        run(profile, () => apiFetch(`/api/ext/x/profiles/${profile.id}`, { method: "DELETE" }), "Couldn't delete that profile")
      }
      websiteLink={{
        label: "Easier on a big screen? Edit profiles on carouselabs.com",
        onClick: () => void openWebsite("/extension/x/profiles"),
      }}
    />
  );
}
