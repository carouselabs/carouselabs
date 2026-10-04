import { useState } from "react";
import { apiFetch, ApiError, type ConnectionProfile, type ConnectionProfileDraft } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CharRangePicker } from "./CharRangePicker";
import { DefaultCheckbox, FormField, FormLayout, OptionSelect, SamplesField } from "./form";
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
    <FormLayout
      title={existing ? "Edit connection note profile" : "New connection note profile"}
      onCancel={onCancel}
      busy={saving}
      error={error}
      saveLabel={existing ? "Save changes" : "Create profile"}
      saving={saving}
      canSave={canSave}
      onSave={handleSave}
    >
      <FormField label="Profile name" required>
        {(id) => (
          <Input id={id} value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Agency founders" />
        )}
      </FormField>

      <FormField
        label="How you come across"
        required
        hint="The note's angle, not your bio: who you sound like. Your own details come from what your notes say about you (in Settings)."
      >
        {(id) => (
          <Textarea
            id={id}
            autoGrow
            value={draft.angle}
            onChange={(e) => set("angle", e.target.value)}
            placeholder="e.g. A peer in the same field, dealing with the same problems, not an outsider admiring them"
            className="max-h-48 min-h-[4.5rem]"
          />
        )}
      </FormField>

      <FormField label="Note goal" required>
        {(id) => (
          <Input id={id} value={draft.goal} onChange={(e) => set("goal", e.target.value)} placeholder="e.g. Get the invite accepted" />
        )}
      </FormField>

      <FormField label="Tone" required>
        {(id) => <OptionSelect id={id} value={draft.tone} onChange={(v) => set("tone", v)} options={TONES} />}
      </FormField>

      <FormField label="Length" hint={`LinkedIn allows 300 characters; notes are capped at ${CONNECT_NOTE_HARD_MAX}.`}>
        {() => (
          <CharRangePicker
            min={range.min}
            max={range.max}
            bounds={{ min: CONNECT_NOTE_MIN, max: CONNECT_NOTE_HARD_MAX }}
            onChange={(min, max) => set("length", connectionLengthFromRange(min, max))}
            caption={`${range.min}-${range.max} characters`}
          />
        )}
      </FormField>

      <FormField label="Always" hint="Rules every note must follow.">
        {(id) => (
          <Textarea
            id={id}
            autoGrow
            value={draft.alwaysDo}
            onChange={(e) => set("alwaysDo", e.target.value)}
            placeholder="e.g. Reference one concrete detail from their profile, then a plain reason to connect"
            className="max-h-40 min-h-[2.625rem]"
          />
        )}
      </FormField>

      <FormField label="Never" hint="Rules every note must avoid.">
        {(id) => (
          <Textarea
            id={id}
            autoGrow
            value={draft.neverDo}
            onChange={(e) => set("neverDo", e.target.value)}
            placeholder="e.g. No compliments, no asking for a call, no pitching"
            className="max-h-40 min-h-[2.625rem]"
          />
        )}
      </FormField>

      <SamplesField
        label="Example notes"
        hint="Optional, but the strongest lever on voice. Avoid digits: a figure that isn't on the recipient's profile is rejected."
        noun="example"
        samples={draft.samples}
        max={MAX_SAMPLES}
        onChange={(samples) => set("samples", samples)}
      />

      <DefaultCheckbox checked={setAsDefault} onChange={setSetAsDefault} />
    </FormLayout>
  );
}
