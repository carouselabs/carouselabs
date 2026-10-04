import { useState } from "react";
import { apiFetch, ApiError, type MessageProfile, type MessageProfileDraft } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DefaultCheckbox, FormField, FormLayout, OptionSelect, SamplesField } from "./form";
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
    <FormLayout
      title={existing ? "Edit message profile" : "New message profile"}
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
          <Input id={id} value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Agency founder leads" />
        )}
      </FormField>

      <FormField
        label="Reason"
        required
        hint="Why this conversation is happening: a lead, a warm intro, reconnecting, peer networking, or your own words. It's read alongside the live thread on every message, so it stays the thread's purpose across replies sent weeks apart."
      >
        {(id) => (
          <Textarea
            id={id}
            autoGrow
            value={draft.goal}
            onChange={(e) => set("goal", e.target.value)}
            placeholder="e.g. Building a genuine relationship, no pitch. Or: a potential client, understand their situation before proposing anything"
            className="max-h-48 min-h-[4.5rem]"
          />
        )}
      </FormField>

      <FormField label="Tone" required>
        {(id) => <OptionSelect id={id} value={draft.tone} onChange={(v) => set("tone", v)} options={TONES} />}
      </FormField>

      <FormField label="Always" hint="Rules every message in this conversation must follow.">
        {(id) => (
          <Textarea
            id={id}
            autoGrow
            value={draft.alwaysDo}
            onChange={(e) => set("alwaysDo", e.target.value)}
            placeholder="e.g. Respond to what they actually said before adding anything new"
            className="max-h-40 min-h-[2.625rem]"
          />
        )}
      </FormField>

      <FormField label="Never" hint="Rules every message in this conversation must avoid.">
        {(id) => (
          <Textarea
            id={id}
            autoGrow
            value={draft.neverDo}
            onChange={(e) => set("neverDo", e.target.value)}
            placeholder="e.g. No pitching before there's a real conversation, no asking for a call too early"
            className="max-h-40 min-h-[2.625rem]"
          />
        )}
      </FormField>

      <SamplesField
        label="Example messages"
        hint="Optional, but the strongest lever on voice. Avoid digits: a figure that isn't in the thread or their profile is rejected."
        noun="example"
        samples={draft.samples}
        max={MAX_SAMPLES}
        onChange={(samples) => set("samples", samples)}
      />

      <DefaultCheckbox checked={setAsDefault} onChange={setSetAsDefault} />
    </FormLayout>
  );
}
