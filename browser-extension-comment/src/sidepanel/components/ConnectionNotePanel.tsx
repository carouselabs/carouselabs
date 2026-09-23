import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  apiFetch,
  ApiError,
  type ConnectionNoteResponse,
  type ConnectionProfile,
  type MeResponse,
} from "@/lib/api";
import { RecommendedBadge } from "./RecommendedBadge";
import {
  loadConnectContext,
  loadConnectLength,
  loadSelfProfile,
  saveConnectLength,
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
  outOfCredits: boolean;
  // Insert gating and the warning modal live in HomeScreen, shared with the
  // comment flow; this panel only asks for an insert.
  showInsert: boolean;
  inserting: boolean;
  insertError: string | null;
  onInsert: (text: string) => void;
  // Opens the connection-profile builder; owned by App, like the comment one.
  onCreateProfile: () => void;
}

// Connection Note mode of the Home screen. Rendered with key={capturedAt}, so a
// new Connect click starts it fresh.
// Sentinel option in the profile dropdown. Selecting it does not change the
// selection — it hands off to the builder, same as the Home screen's.
const CREATE_CUSTOM_VALUE = "__create_custom__";

export function ConnectionNotePanel({
  target,
  outOfCredits,
  showInsert,
  inserting,
  insertError,
  onInsert,
  onCreateProfile,
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
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [fallbackCopied, setFallbackCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadConnectContext(), loadConnectLength(), loadSelfProfile()]).then(([c, l, s]) => {
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
    void saveConnectLength(next);
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
  const generateDisabled = !context || !length || !!contextProblem || outOfCredits || busy;
  const hasNote = note.trim().length > 0;
  const overLimit = note.length > CONNECT_NOTE_HARD_MAX;

  async function handleGenerate() {
    if (!context || !length) return;
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // The profile's own length range wins server-side, so the picker
          // below is only used when no profile is selected.
          profileId: profileId || undefined,
          target: { name: target.name, headline: target.headline, currentRole: target.currentRole, about: target.about },
          context: contextPayload,
          length: { min: length.min, max: length.max },
          extraInstruction: extraInstruction.trim() || undefined,
        }),
      });
      setNote(res.note);
      // Confirms the round trip in the side panel's own console (right-click
      // the panel → Inspect), the counterpart to the content script's lines.
      console.log(`[sidepanel] connection note generated — ${res.note.length} chars: "${res.note}"`);
    } catch (err) {
      setError(userFacingError(err));
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(note);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy to clipboard");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Connection note for</label>
        <div className="space-y-1 rounded-md border border-primary/40 bg-background p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{target.name || "Unknown person"}</span>
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase text-primary">Connect</span>
          </div>
          {target.headline && <div className="text-xs text-muted-foreground">{target.headline}</div>}
          {target.currentRole && target.currentRole !== target.headline && (
            <div className="text-xs text-foreground/80">{target.currentRole}</div>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Note profile</label>
        {profilesError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
            {profilesError}
          </div>
        ) : profilesLoading ? (
          <p className="text-xs text-muted-foreground">Loading profiles…</p>
        ) : profiles.length === 0 ? (
          // Generating still works without one: the note then follows the
          // built-in rules and the length picker below.
          <p className="text-xs text-muted-foreground">
            No connection profiles found. Notes will use the built-in rules. (Run
            scripts/seed-connection-profiles.js to add the CarouseLabs presets.)
          </p>
        ) : (
          <select
            value={profileId}
            onChange={(e) => {
              if (e.target.value === CREATE_CUSTOM_VALUE) {
                onCreateProfile();
                return;
              }
              setProfileId(e.target.value);
            }}
            disabled={busy}
            className="w-full rounded-md border border-input bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
          >
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
                {profile.isRecommended ? " (recommended)" : ""}
              </option>
            ))}
            <option value={CREATE_CUSTOM_VALUE}>+ Create custom profile</option>
          </select>
        )}
        {selectedProfile && (
          <p className="text-[11px] text-muted-foreground">
            {selectedProfile.goal} · {selectedProfile.length}
            {selectedProfile.isRecommended && <RecommendedBadge />}
          </p>
        )}
      </div>

      {context === null || editingContext ? (
        <div className="space-y-2 rounded-md border border-input p-3">
          <p className="text-xs font-medium">
            {context === null ? "Before your first note: what should it say about you?" : "Your context"}
          </p>
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
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">
              Your context: <span className="text-foreground">{CONTEXT_LABELS[context.choice]}</span>
            </span>
            <button className="font-medium text-primary hover:underline" onClick={() => setEditingContext(true)}>
              Change
            </button>
          </div>
        )
      )}

      {/* A profile carries its own length range, and the server uses it, so
          showing the picker alongside would offer a setting that has no
          effect. */}
      {selectedProfile ? (
        <p className="text-[11px] text-muted-foreground">
          Length comes from this profile: {selectedProfile.length}.
        </p>
      ) : (
        length && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Length</label>
          <div className="flex gap-2">
            {LENGTH_OPTIONS.map((option) => (
              <Button
                key={option.preset}
                size="sm"
                variant={length.preset === option.preset ? "default" : "outline"}
                onClick={() => pickPreset(option.preset)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          {length.preset === "custom" ? (
            <CharRangePicker
              min={length.min}
              max={length.max}
              bounds={{ min: CONNECT_NOTE_MIN, max: CONNECT_NOTE_HARD_MAX }}
              onChange={(min, max) => updateLength({ preset: "custom", min, max })}
              caption={`${length.min}-${length.max} characters (LinkedIn allows 300; capped at ${CONNECT_NOTE_HARD_MAX})`}
            />
          ) : (
            <p className="text-[11px] text-muted-foreground">
              {length.min}-{length.max} characters
            </p>
          )}
        </div>
        )
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Extra instruction <span className="font-normal">(optional)</span>
        </label>
        <textarea
          value={extraInstruction}
          onChange={(e) => setExtraInstruction(e.target.value)}
          disabled={generating}
          rows={2}
          placeholder="e.g. mention I'm also hiring for this role"
          className="w-full resize-none rounded-md border border-input bg-background p-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        />
      </div>

      <Button disabled={generateDisabled} onClick={handleGenerate}>
        {generating ? "Generating…" : hasNote ? "Regenerate" : "Generate note"}
      </Button>

      {contextProblem && <p className="text-xs text-muted-foreground">{contextProblem}</p>}
      {outOfCredits && <p className="text-xs text-muted-foreground">You&apos;re out of credits.</p>}

      {(error || insertError) && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
          {error || insertError}
        </div>
      )}

      {/* Insert can fail for reasons outside our control — LinkedIn caps free
          accounts' custom notes, and then no note box ever opens. The note is
          already written, so it is shown here ready to copy rather than left
          stranded behind a failed Insert. */}
      {insertError && hasNote && (
        <div className="space-y-2 rounded-md border-2 border-primary bg-primary/5 p-3">
          <p className="text-xs font-medium text-primary">
            Couldn&apos;t reach LinkedIn&apos;s note box. Your note is ready — copy it from here.
          </p>
          <textarea
            readOnly
            value={note}
            rows={5}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full resize-y rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <Button
            size="sm"
            onClick={() => {
              navigator.clipboard
                .writeText(note)
                .then(() => {
                  setFallbackCopied(true);
                  setTimeout(() => setFallbackCopied(false), 2000);
                })
                .catch(() => setError("Couldn't copy to clipboard"));
            }}
          >
            {fallbackCopied ? "Copied to clipboard" : "Copy to clipboard"}
          </Button>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">Note</label>
          <span className={`text-[11px] tabular-nums ${overLimit ? "text-destructive" : "text-muted-foreground"}`}>
            {note.length}/{CONNECT_NOTE_HARD_MAX}
          </span>
        </div>
        <textarea
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setCopied(false);
          }}
          disabled={!hasNote || busy}
          rows={5}
          placeholder="Your generated note appears here, and can be edited before copying."
          className="w-full resize-y rounded-md border border-input bg-background p-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        />
        {overLimit && (
          <p className="text-xs text-destructive">
            Over {CONNECT_NOTE_HARD_MAX} characters. LinkedIn may reject it; trim it before sending.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" disabled={!hasNote || busy} onClick={handleCopy}>
          {copied ? "Copied" : "Copy"}
        </Button>
        {showInsert && (
          <Button size="sm" variant="outline" disabled={!hasNote || busy} onClick={() => onInsert(note)}>
            {inserting ? "Inserting…" : "Insert"}
          </Button>
        )}
      </div>
    </div>
  );
}
