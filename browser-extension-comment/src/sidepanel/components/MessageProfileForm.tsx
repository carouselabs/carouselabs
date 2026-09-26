import { useState } from "react";
import { apiFetch, ApiError, type MessageProfile, type MessageProfileDraft } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { MESSAGE_TONES } from "@/lib/messageThread";

// Builder for a custom Conversation Assistant profile. Same shape as
// ConnectionProfileForm, minus Length: an ongoing message thread has no
// fixed length, unlike a single connection note.

// Shared with the "write my own" tone picker in MessagesScreen, so a saved
// profile and a one-off purpose offer the same vocabulary.
const TONES: string[] = [...MESSAGE_TONES];

const MAX_SAMPLES = 5;

export const EMPTY_MESSAGE_DRAFT: MessageProfileDraft = {
  name: "",
  goal: "",
  tone: TONES[0],
  alwaysDo: "",
  neverDo: "",
  samples: ["", ""],
};

export function messageDraftFromProfile(profile: MessageProfile): MessageProfileDraft {
  return {
    name: profile.name,
    goal: profile.goal,
    tone: profile.tone,
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
  existing?: MessageProfile;
  // Pre-filled values for a duplicate, which still saves as a new profile.
  seed?: MessageProfileDraft;
  onSaved: () => void;
  onCancel: () => void;
}

export function MessageProfileForm({ existing, seed, onSaved, onCancel }: Props) {
  const [draft, setDraft] = useState<MessageProfileDraft>(
    existing ? messageDraftFromProfile(existing) : (seed ?? EMPTY_MESSAGE_DRAFT),
  );
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof MessageProfileDraft>(key: K, value: MessageProfileDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function setSample(index: number, value: string) {
    setDraft((current) => ({
      ...current,
      samples: current.samples.map((sample, i) => (i === index ? value : sample)),
    }));
  }

  const canSave = Boolean(draft.name.trim() && draft.goal.trim() && draft.tone.trim());

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const body = {
        ...draft,
        samples: draft.samples.map((sample) => sample.trim()).filter(Boolean),
        setAsDefault,
      };
      await apiFetch(existing ? `/api/ext/message-profiles/${existing.id}` : "/api/ext/message-profiles", {
        method: existing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
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
      <h2 className="text-sm font-semibold">{existing ? "Edit conversation profile" : "New conversation profile"}</h2>

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
          placeholder="e.g. Agency founder leads"
        />
      </Field>

      <Field
        label="Reason"
        required
        hint="The reason this conversation is happening — lead, warm intro, reconnecting, peer networking, or your own words. Read alongside the live thread on every message, so it stays the throughline across replies sent weeks apart."
      >
        <textarea
          className={fieldClass}
          rows={3}
          value={draft.goal}
          onChange={(e) => set("goal", e.target.value)}
          placeholder="e.g. Building a genuine relationship, no pitch — or: a potential client, understand their situation before proposing anything"
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

      <Field label="Always" hint="Rules every message in this conversation must follow.">
        <textarea
          className={fieldClass}
          rows={2}
          value={draft.alwaysDo}
          onChange={(e) => set("alwaysDo", e.target.value)}
          placeholder="e.g. Respond to what they actually said before adding anything new"
        />
      </Field>

      <Field label="Never" hint="Rules every message in this conversation must avoid.">
        <textarea
          className={fieldClass}
          rows={2}
          value={draft.neverDo}
          onChange={(e) => set("neverDo", e.target.value)}
          placeholder="e.g. No pitching before there's a real conversation, no asking for a call too early"
        />
      </Field>

      <Field
        label="Example messages"
        hint="Optional, but the strongest lever on voice. Avoid digits: a figure that isn't in the thread or their profile is rejected."
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
            <Button size="sm" variant="outline" onClick={() => set("samples", [...draft.samples, ""])}>
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
