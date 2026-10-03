import { useEffect, useRef, useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingField } from "@/components/ui/loading-field";
import { Segmented } from "@/components/ui/segmented";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  apiFetch,
  ApiError,
  isCancelled,
  type ConnectionNoteResponse,
  type ConnectionProfile,
  type MeResponse,
} from "@/lib/api";
import { RecommendedBadge } from "./RecommendedBadge";
import { FreeGenerationsNote, UnlockCard } from "./UnlockCard";
import { noteFreeRemaining, notePaywallError } from "@/lib/extensionAccess";
import { markHistoryAction } from "@/lib/history";
import {
  loadSyncedConnectContext,
  loadSyncedConnectLength,
  loadSyncedSelfProfile,
  saveSyncedConnectLength,
} from "@/lib/syncedSettings";
import {
  CONNECT_LENGTH_PRESETS,
  CONNECT_NOTE_HARD_MAX,
  CONNECT_NOTE_MIN,
  SELF_PROFILE_STORAGE_KEY,
  type ConnectContextSetting,
  type ConnectLengthPreset,
  type ConnectLengthSetting,
  type LinkedInProfileInfo,
} from "@/lib/connectionNote";
import { CharRangePicker } from "./CharRangePicker";
import { ConnectContextEditor } from "./ConnectContextEditor";
import { Initials } from "./Initials";
import { ResultCard } from "./ResultCard";
import { RewriteButton } from "./RewriteButton";

const CONTEXT_LABELS: Record<ConnectContextSetting["choice"], string> = {
  profile: "Your LinkedIn profile",
  custom: "Your own purpose",
  none: "Their profile only",
};

const LENGTH_OPTIONS: { preset: ConnectLengthPreset; label: string }[] = [
  { preset: "short", label: "Short" },
  { preset: "medium", label: "Medium" },
  { preset: "custom", label: "Custom" },
];

function userFacingError(err: unknown): string {
  if (err instanceof ApiError && err.status >= 400 && err.status < 500) return err.message;
  return "Something went wrong, try again";
}

interface Props {
  target: LinkedInProfileInfo;
  // Free generations used up, no subscription: the unlock card replaces
  // Generate. Owned by HomeScreen, which reads the shared access store.
  paywalled: boolean;
  // Insert gating and the insert itself live in HomeScreen, shared with the
  // comment flow; this panel only asks for an insert.
  showInsert: boolean;
  inserting: boolean;
  insertError: string | null;
  // historyId is the note's History row, so HomeScreen can mark it INSERTED.
  onInsert: (text: string, historyId: string | null) => void;
  // Opens the connection-profile builder; owned by App, like the comment one.
  onCreateProfile: () => void;
  // The active tab isn't on LinkedIn: HomeScreen shows "Go to LinkedIn" above,
  // and writing waits (a written note stays for Copy).
  offSite?: boolean;
}

// Connection Note mode of the Home screen. Rendered with key={capturedAt}, so a
// new Connect click starts it fresh.
// Sentinel option in the profile dropdown. Selecting it does not change the
// selection — it hands off to the builder, same as the Home screen's.
const CREATE_CUSTOM_VALUE = "__create_custom__";

export function ConnectionNotePanel({
  target,
  paywalled,
  showInsert,
  inserting,
  insertError,
  onInsert,
  onCreateProfile,
  offSite = false,
}: Props) {
  // undefined while loading; null when the user has never chosen, which shows
  // the first-time chooser in place of the Generate controls.
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([]);
  const [profileId, setProfileId] = useState<string>("");
  const [profilesError, setProfilesError] = useState<string | null>(null);
  // Tracked separately from the list: an empty list after a successful load is
  // a real state (table seeded with nothing) and must not read as "loading".
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [context, setContext] = useState<ConnectContextSetting | null | undefined>(undefined);
  const [editingContext, setEditingContext] = useState(false);
  const [self, setSelf] = useState<LinkedInProfileInfo | null>(null);
  const [length, setLength] = useState<ConnectLengthSetting | null>(null);
  const [extraInstruction, setExtraInstruction] = useState("");
  const [note, setNote] = useState("");
  // Whether the result card shows: from the first successful note on, even if
  // the box is then cleared by hand (see HomeScreen's hasResult).
  const [hasResult, setHasResult] = useState(false);
  // The profile that wrote the note in the card ("" for none), so picking
  // another one can offer to rewrite it with that one.
  const [resultProfileId, setResultProfileId] = useState<string | null>(null);
  // The note's History row (see markHistoryAction).
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  // The note being written, so Stop or leaving (a new profile remounts this
  // panel) can cancel it. Null once it ends or is cancelled.
  const generationRef = useRef<AbortController | null>(null);
  useEffect(() => () => generationRef.current?.abort(), []);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // The output can land below the fold once the context/length pickers have
  // pushed the page tall — scrolled into view automatically so a fresh
  // result is never hidden behind a scroll the user has to find themselves.
  const outputRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadSyncedConnectContext(), loadSyncedConnectLength(), loadSyncedSelfProfile()]).then(([c, l, s]) => {
      if (cancelled) return;
      setContext(c);
      setLength(l);
      setSelf(s);
    });

    function handleChange(changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) {
      if (areaName === "local" && SELF_PROFILE_STORAGE_KEY in changes) {
        setSelf((changes[SELF_PROFILE_STORAGE_KEY].newValue as LinkedInProfileInfo | undefined) ?? null);
      }
    }
    chrome.storage.onChanged.addListener(handleChange);
    return () => {
      cancelled = true;
      chrome.storage.onChanged.removeListener(handleChange);
    };
  }, []);

  // Profiles decide the note's angle and voice, the same way comment profiles
  // do on the Home screen. The user's saved default is preselected, else the
  // shared system default, else the first profile.
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      apiFetch<{ profiles: ConnectionProfile[] }>("/api/ext/connection-profiles"),
      apiFetch<MeResponse>("/api/ext/me"),
    ])
      .then(([{ profiles: fetched }, me]) => {
        if (cancelled) return;
        setProfiles(fetched);
        const preselected =
          fetched.find((p) => p.id === me.defaultConnectionProfileId) ??
          fetched.find((p) => p.isSystem && p.isDefault) ??
          fetched[0];
        setProfileId(preselected?.id ?? "");
      })
      .catch((err) => {
        if (!cancelled) setProfilesError(userFacingError(err));
      })
      .finally(() => {
        if (!cancelled) setProfilesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function updateLength(next: ConnectLengthSetting) {
    setLength(next);
    void saveSyncedConnectLength(next);
  }

  const selectedProfile = profiles.find((p) => p.id === profileId) ?? null;

  function pickPreset(preset: ConnectLengthPreset) {
    if (!length) return;
    // Custom starts from whatever range was showing, so switching to it
    // changes nothing until a slider moves.
    updateLength(preset === "custom" ? { ...length, preset } : { preset, ...CONNECT_LENGTH_PRESETS[preset] });
  }

  // Why Generate is blocked by the context, if it is.
  const contextProblem =
    context?.choice === "profile" && !self
      ? "Read your LinkedIn profile first (Change → Read my profile), or pick another context."
      : context?.choice === "custom" && !context.purpose.trim()
        ? "Your purpose is empty. Change → write and save one, or pick another context."
        : null;

  const busy = generating || inserting;
  const generateDisabled = !context || !length || !!contextProblem || paywalled || busy || offSite;
  const hasNote = note.trim().length > 0;
  const overLimit = note.length > CONNECT_NOTE_HARD_MAX;
  const showResult = generating || hasResult;
  // A note is showing and another profile is now picked.
  const rewriteProfile =
    hasResult && !generateDisabled && resultProfileId !== null && profileId !== resultProfileId ? selectedProfile : null;

  async function handleGenerate() {
    if (!context || !length) return;
    generationRef.current?.abort();
    const controller = new AbortController();
    generationRef.current = controller;
    const current = () => generationRef.current === controller;
    const usedProfileId = profileId;
    setGenerating(true);
    setError(null);
    setCopied(false);

    const contextPayload =
      context.choice === "profile" && self
        ? { kind: "profile", name: self.name, headline: self.headline, currentRole: self.currentRole, about: self.about }
        : context.choice === "custom"
          ? { kind: "custom", purpose: context.purpose }
          : { kind: "none" };

    try {
      const res = await apiFetch<ConnectionNoteResponse>("/api/ext/connection-note", {
        signal: controller.signal,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // The profile's own length range wins server-side, so the picker
          // below is only used when no profile is selected.
          profileId: profileId || undefined,
          // url is for History only; the server never sends it to the model.
          target: {
            name: target.name,
            headline: target.headline,
            currentRole: target.currentRole,
            about: target.about,
            url: target.url,
          },
          context: contextPayload,
          length: { min: length.min, max: length.max },
          extraInstruction: extraInstruction.trim() || undefined,
        }),
      });
      if (!current()) return;
      setNote(res.note);
      setHasResult(true);
      setResultProfileId(usedProfileId);
      setHistoryId(res.historyId ?? null);
      noteFreeRemaining(res.freeRemaining);
      outputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      // Confirms the round trip in the side panel's own console (right-click
      // the panel → Inspect), the counterpart to the content script's lines.
      console.log(`[sidepanel] connection note generated — ${res.note.length} chars: "${res.note}"`);
    } catch (err) {
      if (isCancelled(err) || !current()) return;
      if (!notePaywallError(err)) setError(userFacingError(err));
    } finally {
      // Cleared here unless a newer generation has already started.
      if (current() || generationRef.current === null) {
        generationRef.current = null;
        setGenerating(false);
      }
    }
  }

  // Stop: ends the wait; the note that was there stays.
  function handleStop() {
    generationRef.current?.abort();
    generationRef.current = null;
    setGenerating(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(note);
      markHistoryAction(historyId, "COPIED", note);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy to clipboard");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Connection note for</p>
        <div className="animate-fade-in space-y-2 rounded-lg border border-primary/25 bg-card p-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <Initials name={target.name} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold">{target.name || "Unknown person"}</span>
                <Badge variant="accent">Connect</Badge>
              </div>
              {target.headline && (
                <p className="line-clamp-2 text-xs text-muted-foreground" title={target.headline}>
                  {target.headline}
                </p>
              )}
            </div>
          </div>
          {target.currentRole && target.currentRole !== target.headline && (
            <p className="text-xs text-foreground/80">{target.currentRole}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <label id="note-profile-label" className="text-xs font-medium text-muted-foreground">
          Note profile
        </label>
        {profilesError ? (
          <Alert>{profilesError}</Alert>
        ) : profilesLoading ? (
          <LoadingField>Loading profiles…</LoadingField>
        ) : profiles.length === 0 ? (
          // Generating still works without one: the note then follows the
          // built-in rules and the length picker below.
          <p className="text-xs text-muted-foreground">No note profiles yet, so notes follow the built-in rules.</p>
        ) : (
          <Select
            value={profileId}
            onValueChange={(value) => {
              if (value === CREATE_CUSTOM_VALUE) {
                onCreateProfile();
                return;
              }
              setProfileId(value);
            }}
            disabled={busy}
          >
            <SelectTrigger aria-labelledby="note-profile-label">
              <SelectValue placeholder="Select a profile" />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.name}
                  {profile.isRecommended && <RecommendedBadge />}
                </SelectItem>
              ))}
              <SelectSeparator />
              <SelectItem value={CREATE_CUSTOM_VALUE} className="font-medium text-primary-text">
                + Create custom profile
              </SelectItem>
            </SelectContent>
          </Select>
        )}
        {/* A profile carries its own length range, and the server uses it, so
            the length picker below only shows when no profile is selected. */}
        {selectedProfile && (
          <p className="text-xs text-muted-foreground">
            {selectedProfile.goal} · {selectedProfile.length}
          </p>
        )}
        {rewriteProfile && (
          <RewriteButton
            label={`Rewrite with ${rewriteProfile.name}`}
            current={`Current note: ${profiles.find((p) => p.id === resultProfileId)?.name ?? "the built-in rules"}`}
            onClick={() => void handleGenerate()}
          />
        )}
      </div>

      {context === null || editingContext ? (
        <div className="animate-fade-in space-y-3 rounded-lg border bg-card p-3">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold">
              {context === null ? "What should your notes say about you?" : "What your notes say about you"}
            </p>
            {context === null && (
              <p className="text-xs text-muted-foreground">Asked once. You can change it here or in Settings.</p>
            )}
          </div>
          <ConnectContextEditor
            onSaved={(next) => {
              setContext(next);
              // A first-time pick of "Skip" needs no further input, so close
              // right away; the other two may still need their details.
              if (next.choice === "none") setEditingContext(false);
            }}
          />
          {context && (
            <Button size="sm" variant="outline" onClick={() => setEditingContext(false)}>
              Done
            </Button>
          )}
        </div>
      ) : (
        context && (
          <div className="flex items-center justify-between gap-2 rounded-lg border bg-card py-1.5 pl-3 pr-1.5">
            <p className="min-w-0 text-xs">
              <span className="text-muted-foreground">Based on: </span>
              <span className="font-medium">{CONTEXT_LABELS[context.choice]}</span>
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-primary-text hover:text-primary-text"
              onClick={() => setEditingContext(true)}
            >
              Change
            </Button>
          </div>
        )
      )}

      {!selectedProfile && length && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Length</p>
          <Segmented
            label="Length"
            options={LENGTH_OPTIONS.map((option) => ({ value: option.preset, label: option.label }))}
            value={length.preset}
            onChange={pickPreset}
          />
          {length.preset === "custom" ? (
            <CharRangePicker
              min={length.min}
              max={length.max}
              bounds={{ min: CONNECT_NOTE_MIN, max: CONNECT_NOTE_HARD_MAX }}
              onChange={(min, max) => updateLength({ preset: "custom", min, max })}
              caption={`${length.min}-${length.max} characters (LinkedIn allows 300; capped at ${CONNECT_NOTE_HARD_MAX})`}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              {length.min}-{length.max} characters
            </p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="note-extra-instruction" className="text-xs font-medium text-muted-foreground">
          Extra instruction <span className="font-normal">(optional)</span>
        </label>
        <Textarea
          id="note-extra-instruction"
          autoGrow
          value={extraInstruction}
          onChange={(e) => setExtraInstruction(e.target.value)}
          readOnly={generating}
          rows={1}
          placeholder="e.g. mention I'm also hiring for this role"
          className="max-h-40 min-h-[2.625rem]"
        />
      </div>

      {showResult ? (
        <>
          <ResultCard
            sectionRef={outputRef}
            noun="note"
            value={note}
            onChange={(value) => {
              setNote(value);
              setCopied(false);
            }}
            generating={generating}
            onStop={handleStop}
            busy={busy}
            stale={generating && hasNote}
            // Counted against LinkedIn's limit rather than as a plain length.
            meta={
              generating ? (
                "Writing…"
              ) : (
                <span className={overLimit ? "font-medium text-destructive" : undefined}>
                  {note.length}/{CONNECT_NOTE_HARD_MAX}
                </span>
              )
            }
            copied={copied}
            copyDisabled={!hasNote || busy}
            onCopy={handleCopy}
            insert={showInsert ? { disabled: !hasNote || busy, inserting, onClick: () => onInsert(note, historyId) } : null}
            onRegenerate={handleGenerate}
            regenerateDisabled={generateDisabled}
            notice={
              overLimit && (
                <p className="text-xs text-destructive">
                  Over {CONNECT_NOTE_HARD_MAX} characters. LinkedIn may reject it; trim it before sending.
                </p>
              )
            }
          />
          {(error || insertError) && (
            // Insert can fail for reasons outside our control (LinkedIn caps
            // custom notes on free accounts, and then no note box opens). The
            // note is already written and sits right above, ready to copy.
            <Alert>
              {error || insertError}
              {!error && hasNote && (
                <span className="mt-1 block text-foreground/80">
                  Your note is ready above: copy it and paste it into LinkedIn yourself.
                </span>
              )}
            </Alert>
          )}
          {paywalled && <UnlockCard />}
        </>
      ) : paywalled ? (
        <UnlockCard />
      ) : offSite ? null : (
        <div className="space-y-2">
          {error && <Alert>{error}</Alert>}
          <Button className="w-full" disabled={generateDisabled} onClick={handleGenerate}>
            {error ? <RotateCcw aria-hidden /> : <Sparkles aria-hidden />}
            {error ? "Try again" : "Generate note"}
          </Button>
        </div>
      )}

      {/* Why Generate is off, when the reason is the context. */}
      {(contextProblem || context === null) && (
        <p className="text-xs text-muted-foreground">{contextProblem ?? "Pick one of the options above first."}</p>
      )}

      {!paywalled && <FreeGenerationsNote />}
    </div>
  );
}
