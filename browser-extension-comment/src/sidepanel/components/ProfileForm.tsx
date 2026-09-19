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
const LENGTHS = ["Short (1 line)", "Medium (2-3 lines)", "Long (4+ lines)"];
const EMOJI = ["None", "Rarely", "Sometimes"];
const LANGUAGES = ["English", "Spanish", "French", "German", "Portuguese", "Hindi"];

const MAX_SAMPLES = 5;
const MIN_SAMPLES = 3;

export const EMPTY_DRAFT: ProfileDraft = {
  name: "",
  whoIAm: "",
  goal: GOALS[0],
  tone: TONES[0],
  length: LENGTHS[1],
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
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
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
        <NativeSelect value={draft.length} onChange={(v) => set("length", v)} options={LENGTHS} />
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
