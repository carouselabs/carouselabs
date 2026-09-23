import { useState } from "react";
import { apiFetch, ApiError, type ConnectionProfile, type ConnectionProfileDraft } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CharRangePicker } from "./CharRangePicker";
import { CONNECT_NOTE_HARD_MAX, CONNECT_NOTE_MIN } from "@/lib/connectionNote";

// Builder for a custom Connection Note profile. Same shape as ProfileForm for
// comment profiles, minus the fields a 280-character invitation has no use for
// (emoji, language) and minus Test — a note costs a model call, and the
// presets are there to start from.

const TONES = ["Plain", "Friendly", "Professional", "Direct", "Warm"];

const MAX_SAMPLES = 5;

const DEFAULT_RANGE = { min: 120, max: 220 };

export const connectionLengthFromRange = (min: number, max: number) => `${min}-${max} characters`;

// Mirrors parseConnectionProfileInput's regex in lib/connectionProfiles (a
// separate project, so it cannot be imported), clamped to the picker's bounds
// so what shows is always what saves.
function rangeFromLength(length: string): { min: number; max: number } {
  const match = length.match(/(\d+)\s*-\s*(\d+)\s*char/i);
  if (!match) return DEFAULT_RANGE;
  const clamp = (n: number) => Math.min(CONNECT_NOTE_HARD_MAX, Math.max(CONNECT_NOTE_MIN, Math.round(n)));
  const [a, b] = [clamp(Number(match[1])), clamp(Number(match[2]))];
  return { min: Math.min(a, b), max: Math.max(a, b) };
}

export const EMPTY_CONNECTION_DRAFT: ConnectionProfileDraft = {
  name: "",
  angle: "",
  goal: "",
  tone: TONES[0],
  length: connectionLengthFromRange(DEFAULT_RANGE.min, DEFAULT_RANGE.max),
  alwaysDo: "",
  neverDo: "",
  samples: ["", ""],
};

export function connectionDraftFromProfile(profile: ConnectionProfile): ConnectionProfileDraft {
  return {
    name: profile.name,
    angle: profile.angle,
    goal: profile.goal,
    tone: profile.tone,
    length: profile.length,
    alwaysDo: profile.alwaysDo ?? "",
    neverDo: profile.neverDo ?? "",
    samples: profile.samples.length > 0 ? profile.samples.slice(0, MAX_SAMPLES) : ["", ""],
  };
}

const fieldClass =
  "w-full rounded-md border border-input bg-background p-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
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
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

interface Props {
  // Present when editing: the form PUTs instead of POSTing.
  existing?: ConnectionProfile;
  // Pre-filled values for a duplicate, which still saves as a new profile.
  seed?: ConnectionProfileDraft;
  onSaved: () => void;
  onCancel: () => void;
}

export function ConnectionProfileForm({ existing, seed, onSaved, onCancel }: Props) {
  const [draft, setDraft] = useState<ConnectionProfileDraft>(
    existing ? connectionDraftFromProfile(existing) : (seed ?? EMPTY_CONNECTION_DRAFT),
  );
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ConnectionProfileDraft>(key: K, value: ConnectionProfileDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function setSample(index: number, value: string) {
    setDraft((current) => ({
      ...current,
      samples: current.samples.map((sample, i) => (i === index ? value : sample)),
    }));
  }

  const range = rangeFromLength(draft.length);
  const canSave = Boolean(draft.name.trim() && draft.angle.trim() && draft.goal.trim() && draft.tone.trim());

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const body = {
        ...draft,
        samples: draft.samples.map((sample) => sample.trim()).filter(Boolean),
        setAsDefault,
      };
      await apiFetch(
        existing ? `/api/ext/connection-profiles/${existing.id}` : "/api/ext/connection-profiles",
        {
          method: existing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      onSaved();
    } catch (err) {
      // 4xx messages are written for the user (validation, plan limits), so
      // they are shown as-is rather than replaced with generic copy.
      setError(err instanceof ApiError ? err.message : "Couldn't save that profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-sm font-semibold">
        {existing ? "Edit connection profile" : "New connection profile"}
      </h2>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <Field label="Profile name" required>
        <input
          className={fieldClass}
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Agency founders"
        />
      </Field>

      <Field
        label="How you come across"
        required
        hint="The note's angle, not your bio — who you sound like. Your own details come from the 'Your context' setting."
      >
        <textarea
          className={fieldClass}
          rows={3}
          value={draft.angle}
          onChange={(e) => set("angle", e.target.value)}
          placeholder="e.g. A peer in the same field, dealing with the same problems, not an outsider admiring them"
        />
      </Field>

      <Field label="Note goal" required>
        <input
          className={fieldClass}
          value={draft.goal}
          onChange={(e) => set("goal", e.target.value)}
          placeholder="e.g. Get the invite accepted"
        />
      </Field>

      <Field label="Tone" required>
        <select className={fieldClass} value={draft.tone} onChange={(e) => set("tone", e.target.value)}>
          {(TONES.includes(draft.tone) ? TONES : [draft.tone, ...TONES]).map((tone) => (
            <option key={tone} value={tone}>
              {tone}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Length" hint={`LinkedIn allows 300 characters; notes are capped at ${CONNECT_NOTE_HARD_MAX}.`}>
        <CharRangePicker
          min={range.min}
          max={range.max}
          bounds={{ min: CONNECT_NOTE_MIN, max: CONNECT_NOTE_HARD_MAX }}
          onChange={(min, max) => set("length", connectionLengthFromRange(min, max))}
          caption={`${range.min}-${range.max} characters`}
        />
      </Field>

      <Field label="Always" hint="Rules every note must follow.">
        <textarea
          className={fieldClass}
          rows={2}
          value={draft.alwaysDo}
          onChange={(e) => set("alwaysDo", e.target.value)}
          placeholder="e.g. Reference one concrete detail from their profile, then a plain reason to connect"
        />
      </Field>

      <Field label="Never" hint="Rules every note must avoid.">
        <textarea
          className={fieldClass}
          rows={2}
          value={draft.neverDo}
          onChange={(e) => set("neverDo", e.target.value)}
          placeholder="e.g. No compliments, no asking for a call, no pitching"
        />
      </Field>

      <Field
        label="Example notes"
        hint="Optional, but the strongest lever on voice. Avoid digits: a figure that isn't on the recipient's profile is rejected."
      >
        <div className="space-y-2">
          {draft.samples.map((sample, index) => (
            <textarea
              key={index}
              className={fieldClass}
              rows={2}
              value={sample}
              onChange={(e) => setSample(index, e.target.value)}
              placeholder={`Example ${index + 1}`}
            />
          ))}
          {draft.samples.length < MAX_SAMPLES && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => set("samples", [...draft.samples, ""])}
            >
              + Add example
            </Button>
          )}
        </div>
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="accent-[#7C3AED]"
          checked={setAsDefault}
          onChange={(e) => setSetAsDefault(e.target.checked)}
        />
        Use this profile by default
      </label>

      <div className="flex gap-2">
        <Button disabled={!canSave || saving} onClick={handleSave}>
          {saving ? "Saving…" : existing ? "Save changes" : "Create profile"}
        </Button>
        <Button variant="outline" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
