import { useState } from "react";
import {
  apiFetch,
  ApiError,
  type CommentProfile,
  type ProfileDraft,
  type TestResponse,
} from "@/lib/api";
import { Button } from "@/components/ui/button";

const GOALS = [
  "adds one useful insight",
  "agrees and adds a personal angle",
  "asks a genuine question",
  "shares a contrasting view",
  "congratulates specifically",
];
const TONES = ["professional", "friendly", "direct", "warm", "witty"];
const EMOJI = ["None", "Rarely", "Sometimes"];
const LANGUAGES = ["English", "Spanish", "French", "German", "Portuguese", "Hindi"];

// Bounds for the length picker's controls. Chosen to span every range any
// stored profile can have, so the slider always shows the saved value rather
// than a clamped stand-in: 15 is Quick Human's floor, and 900 is the top of the
// "Long" bucket the built-in Storyteller uses. Must equal LENGTH_RANGE_MIN/MAX
// in lib/commentProfiles, which the server enforces on save, so no request can
// store a range these controls could not display.
const CHAR_MIN = 15;
const CHAR_MAX = 900;
const DEFAULT_RANGE = { min: 100, max: 220 };

// Must mirror targetLengthRange in lib/ai/prompts/commentPrompt (a separate
// project, so it cannot be imported). An explicit "N-M characters" range wins;
// otherwise the legacy keyword buckets, so an older profile opens showing the
// range the server actually applies to it.
function rangeFromLength(length: string): { min: number; max: number } {
  const value = length.toLowerCase();
  const explicit = value.match(/(\d+)\s*-\s*(\d+)\s*char/);
  if (explicit) {
    const [a, b] = [Number(explicit[1]), Number(explicit[2])];
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  if (value.includes("short") || value.includes("1 line")) return { min: 40, max: 220 };
  if (value.includes("long") || value.includes("4")) return { min: 240, max: 900 };
  return { min: 110, max: 460 };
}

const clamp = (n: number) => Math.min(CHAR_MAX, Math.max(CHAR_MIN, Math.round(n)));

export const lengthFromRange = (min: number, max: number) => `${min}-${max} characters`;

const MAX_SAMPLES = 5;
const MIN_SAMPLES = 3;

export const EMPTY_DRAFT: ProfileDraft = {
  name: "",
  whoIAm: "",
  goal: GOALS[0],
  tone: TONES[0],
  // New profiles start on an explicit range, so what the picker shows is
  // exactly what gets saved.
  length: lengthFromRange(DEFAULT_RANGE.min, DEFAULT_RANGE.max),
  emoji: EMOJI[0],
  language: LANGUAGES[0],
  alwaysDo: "",
  neverDo: "",
  samples: ["", "", ""],
};

export function draftFromProfile(profile: CommentProfile): ProfileDraft {
  const samples = profile.samples.length > 0 ? profile.samples : ["", "", ""];
  return {
    name: profile.name,
    whoIAm: profile.whoIAm,
    goal: profile.goal,
    tone: profile.tone,
    length: profile.length,
    emoji: profile.emoji,
    language: profile.language,
    alwaysDo: profile.alwaysDo ?? "",
    neverDo: profile.neverDo ?? "",
    samples: samples.slice(0, MAX_SAMPLES),
  };
}

const fieldClass =
  "w-full rounded-md border border-input bg-background p-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

function NativeSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  // A duplicated preset can carry a value the fixed list doesn't offer (e.g.
  // tone "Casual", goal "Quick genuine reaction"). Without adding it, the browser
  // would display the first option while the form still held — and saved — the
  // real value, so the builder would show a setting it isn't saving.
  const all = value && !options.includes(value) ? [value, ...options] : options;

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass}>
      {all.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

// One bound: a drag slider plus an editable number, kept in sync. The number is
// a text input with inputMode="numeric" rather than type="number", because
// type="number" renders the browser's own up/down stepper arrows — the control
// this replaces.
function CharBound({
  label,
  value,
  onCommit,
  acceptsWhileTyping,
}: {
  label: string;
  value: number;
  onCommit: (n: number) => void;
  // Gate for live updates from typing. Without it, typing Max "300" while Min
  // is 150 would commit the partial "30", and the clamp would drag Min down
  // to 30 with it — a keystroke silently destroying the other bound.
  acceptsWhileTyping: (n: number) => boolean;
}) {
  // Local text so a half-typed value ("1" on the way to "150") is allowed to
  // exist without being clamped out from under the user mid-keystroke.
  const [text, setText] = useState(String(value));
  // Resync when the value changes from outside (the slider was dragged).
  // Adjusted during render rather than in an effect: React's recommended way
  // to derive state from a changing prop, and it avoids a render with the
  // stale number showing first.
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setText(String(value));
  }

  function commitText() {
    const n = Number.parseInt(text, 10);
    // An unchanged value must not commit: blur fires on every tab-through, and
    // committing would rewrite an untouched legacy length ("Medium (2-3
    // lines)") as an explicit range just because the field was focused.
    if (Number.isFinite(n) && clamp(n) !== value) onCommit(clamp(n));
    else setText(String(value));
  }

  return (
    <div className="flex items-center gap-2">
      <span className="w-8 shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <input
        type="range"
        min={CHAR_MIN}
        max={CHAR_MAX}
        // 1, not a coarser step: a typed value off the step grid (137 with a
        // step of 5) would leave the handle on 135 while the box said 137.
        step={1}
        value={value}
        onChange={(e) => onCommit(Number(e.target.value))}
        aria-label={`${label} characters`}
        className="h-2 flex-1 cursor-pointer accent-[#7C3AED]"
      />
      <input
        type="text"
        inputMode="numeric"
        value={text}
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, "");
          setText(next);
          // Move the slider live only while the typed value is a valid bound
          // that doesn't cross the other one. Crossing is still allowed, just
          // on blur/Enter, where it deliberately pushes the other bound along.
          const n = Number.parseInt(next, 10);
          if (Number.isFinite(n) && n >= CHAR_MIN && n <= CHAR_MAX && acceptsWhileTyping(n)) {
            onCommit(n);
          }
        }}
        onBlur={commitText}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitText();
        }}
        aria-label={`${label} characters (number)`}
        className="w-14 shrink-0 rounded-md border border-input bg-background px-1.5 py-1 text-center text-sm tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}

// Reads and writes the profile's existing `length` string, so it needs no new
// column: moving either control writes "N-M characters", which the server
// already parses. An older profile ("Medium (2-3 lines)") opens showing the
// range the server applies to it, and keeps its original string until the user
// actually moves a control — opening and re-saving an old profile does not
// silently change how it generates.
function LengthRangePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parsed = rangeFromLength(value);
  const min = clamp(parsed.min);
  const max = clamp(parsed.max);
  const isExplicit = /(\d+)\s*-\s*(\d+)\s*char/i.test(value);

  // Each bound is clamped against the other rather than the pair being
  // rejected, so dragging one handle past the other pushes it along.
  const setMin = (n: number) => onChange(lengthFromRange(clamp(n), Math.max(max, clamp(n))));
  const setMax = (n: number) => onChange(lengthFromRange(Math.min(min, clamp(n)), clamp(n)));

  return (
    <div className="space-y-2 rounded-md border border-input p-2">
      <CharBound label="Min" value={min} onCommit={setMin} acceptsWhileTyping={(n) => n <= max} />
      <CharBound label="Max" value={max} onCommit={setMax} acceptsWhileTyping={(n) => n >= min} />
      <p className="text-[11px] text-muted-foreground">
        {isExplicit
          ? `${min}-${max} characters`
          : `Using the preset "${value}". Move a slider to set an exact range.`}
      </p>
    </div>
  );
}

interface Props {
  // Present when editing a saved profile; absent when creating a new one.
  // Its presence is what decides PUT vs POST.
  existing?: CommentProfile;
  // Prefills a NEW profile from existing values. Used by Duplicate, which is
  // the only way to base a profile on a shared system preset.
  seed?: ProfileDraft;
  onSaved: () => void;
  onCancel: () => void;
}

export function ProfileForm({ existing, seed, onSaved, onCancel }: Props) {
  const [draft, setDraft] = useState<ProfileDraft>(
    existing ? draftFromProfile(existing) : (seed ?? EMPTY_DRAFT),
  );
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [pastedPost, setPastedPost] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A saved profile's allowance lives on the row; an unsaved draft has no row,
  // so its count is tracked here until first save and then handed over to the
  // server. testLimit comes back from the route so both agree on the cap.
  const [localTests, setLocalTests] = useState(0);
  const [serverTests, setServerTests] = useState<number | null>(existing?.testsUsed ?? null);
  const [testLimit, setTestLimit] = useState(3);

  const testsUsed = existing ? (serverTests ?? 0) : localTests;
  const testsLeft = Math.max(0, testLimit - testsUsed);

  function set<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function setSample(index: number, value: string) {
    setDraft((d) => ({ ...d, samples: d.samples.map((s, i) => (i === index ? value : s)) }));
  }

  const requiredFilled =
    draft.name.trim() && draft.whoIAm.trim() && draft.goal && draft.tone && draft.length;

  async function handleTest() {
    if (!pastedPost.trim() || testsLeft <= 0) return;

    setTesting(true);
    setError(null);
    setTestResult(null);

    try {
      const res = await apiFetch<TestResponse>("/api/ext/profiles/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileDraft: draft,
          pastedPost,
          profileId: existing?.id,
        }),
      });

      setTestResult(res.comment);
      setTestLimit(res.testLimit);
      if (res.testsUsed !== null) setServerTests(res.testsUsed);
      else setLocalTests((n) => n + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong, try again");
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    if (!requiredFilled) return;

    setSaving(true);
    setError(null);

    const payload = { ...draft, samples: draft.samples.filter((s) => s.trim()), setAsDefault };

    try {
      if (existing) {
        await apiFetch(`/api/ext/profiles/${existing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/ext/profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      onSaved();
    } catch (err) {
      // 403 is the plan limit, and its message already names the upgrade path.
      setError(err instanceof ApiError ? err.message : "Something went wrong, try again");
    } finally {
      setSaving(false);
    }
  }

  const busy = testing || saving;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          {existing ? "Edit profile" : "New custom profile"}
        </h2>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>

      <Field label="Profile name" required>
        <input
          className={fieldClass}
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Founder voice"
        />
      </Field>

      <Field label="Who I am" required>
        <textarea
          className={`${fieldClass} resize-y`}
          rows={3}
          value={draft.whoIAm}
          onChange={(e) => set("whoIAm", e.target.value)}
          placeholder="A B2B SaaS founder who has shipped to 10k users"
        />
      </Field>

      <Field label="Comment goal" required>
        <NativeSelect value={draft.goal} onChange={(v) => set("goal", v)} options={GOALS} />
      </Field>

      <Field label="Tone" required>
        <NativeSelect value={draft.tone} onChange={(v) => set("tone", v)} options={TONES} />
      </Field>

      <Field label="Length" required>
        <LengthRangePicker value={draft.length} onChange={(v) => set("length", v)} />
      </Field>

      <Field label="Emoji">
        <NativeSelect value={draft.emoji} onChange={(v) => set("emoji", v)} options={EMOJI} />
      </Field>

      <Field label="Language">
        <NativeSelect
          value={draft.language}
          onChange={(v) => set("language", v)}
          options={LANGUAGES}
        />
      </Field>

      <Field label="Always do">
        <textarea
          className={`${fieldClass} resize-y`}
          rows={2}
          value={draft.alwaysDo}
          onChange={(e) => set("alwaysDo", e.target.value)}
          placeholder="Optional"
        />
      </Field>

      <Field label="Never do">
        <textarea
          className={`${fieldClass} resize-y`}
          rows={2}
          value={draft.neverDo}
          onChange={(e) => set("neverDo", e.target.value)}
          placeholder="Optional"
        />
      </Field>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Sample comments{" "}
          <span className="font-normal">
            ({MIN_SAMPLES}-{MAX_SAMPLES} recommended, optional)
          </span>
        </label>
        {draft.samples.map((sample, i) => (
          <div key={i} className="flex gap-1.5">
            <textarea
              className={`${fieldClass} resize-y`}
              rows={2}
              value={sample}
              onChange={(e) => setSample(i, e.target.value)}
              placeholder={`Sample ${i + 1}`}
            />
            {draft.samples.length > 1 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setDraft((d) => ({ ...d, samples: d.samples.filter((_, j) => j !== i) }))
                }
              >
                ×
              </Button>
            )}
          </div>
        ))}
        {draft.samples.length < MAX_SAMPLES && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDraft((d) => ({ ...d, samples: [...d.samples, ""] }))}
          >
            + Add sample
          </Button>
        )}
      </div>

      <div className="space-y-1.5 rounded-md border border-input p-3">
        <label className="text-xs font-medium text-muted-foreground">
          Test this profile{" "}
          <span className="font-normal">({testsLeft} of {testLimit} free tests left)</span>
        </label>
        <textarea
          className={`${fieldClass} resize-y`}
          rows={4}
          value={pastedPost}
          onChange={(e) => setPastedPost(e.target.value)}
          placeholder="Paste a LinkedIn post here to preview what this profile writes."
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={!pastedPost.trim() || testsLeft <= 0 || !requiredFilled || busy}
          onClick={handleTest}
        >
          {testing ? "Testing…" : "Test"}
        </Button>

        {testResult && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Preview</p>
            <p className="whitespace-pre-wrap rounded-md border border-input bg-background p-2 text-sm">
              {testResult}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={setAsDefault}
          onChange={(e) => setSetAsDefault(e.target.checked)}
        />
        Set as default profile
      </label>

      <Button disabled={!requiredFilled || busy} onClick={handleSave}>
        {saving ? "Saving…" : existing ? "Save changes" : "Save profile"}
      </Button>
    </div>
  );
}
