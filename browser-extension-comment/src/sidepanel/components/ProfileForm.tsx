import { useState } from "react";
import {
  apiFetch,
  ApiError,
  type CommentProfile,
  type ProfileDraft,
  type TestResponse,
} from "@/lib/api";
import { FlaskConical } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CharRangePicker } from "./CharRangePicker";
import { DefaultCheckbox, FormField, FormLayout, OptionSelect, SamplesField } from "./form";
import { noteFreeRemaining, notePaywallError } from "@/lib/extensionAccess";

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

// Reads and writes the profile's existing `length` string, so it needs no new
// column: moving either control writes "N-M characters", which the server
// already parses. An older profile ("Medium (2-3 lines)") opens showing the
// range the server applies to it, and keeps its original string until the user
// actually moves a control — opening and re-saving an old profile does not
// silently change how it generates.
function LengthRangePicker({
  value,
  onChange,
  ceiling = CHAR_MAX,
}: {
  value: string;
  onChange: (v: string) => void;
  // The top of the slider: 900 for LinkedIn, X's limit for an X profile.
  ceiling?: number;
}) {
  const parsed = rangeFromLength(value);
  const fit = (n: number) => Math.min(ceiling, clamp(n));
  const min = fit(parsed.min);
  const max = fit(parsed.max);
  const isExplicit = /(\d+)\s*-\s*(\d+)\s*char/i.test(value);

  return (
    <CharRangePicker
      min={min}
      max={max}
      bounds={{ min: CHAR_MIN, max: ceiling }}
      onChange={(nextMin, nextMax) => onChange(lengthFromRange(nextMin, nextMax))}
      caption={
        isExplicit
          ? `${min}-${max} characters`
          : `Using the preset "${value}". Move a slider to set an exact range.`
      }
    />
  );
}

// What differs when the builder makes an X profile (CarouseLabs Engage for
// X): its own routes, X's length limit, and the words.
export interface ProfileFormSite {
  base: string;
  test: string;
  noun: string;
  goalLabel: string;
  samplesLabel: string;
  samplesHint: string;
  testLabel: string;
  testPlaceholder: string;
  defaultLength: string;
  // The longest range the slider offers.
  maxLength: number;
}

const LINKEDIN_FORM: ProfileFormSite = {
  base: "/api/ext/profiles",
  test: "/api/ext/profiles/test",
  noun: "comment profile",
  goalLabel: "Comment goal",
  samplesLabel: "Sample comments",
  samplesHint: `Optional. ${MIN_SAMPLES}-${MAX_SAMPLES} of your own comments teach it your voice better than any setting.`,
  testLabel: "LinkedIn post to test on",
  testPlaceholder: "Paste a LinkedIn post here to preview what this profile writes.",
  defaultLength: lengthFromRange(DEFAULT_RANGE.min, DEFAULT_RANGE.max),
  maxLength: CHAR_MAX,
};

export function xProfileFormSite(maxLength: number): ProfileFormSite {
  // X Premium allows 1000, but a profile's range is capped at CHAR_MAX like
  // any other (LENGTH_RANGE_MAX in lib/commentProfiles).
  const ceiling = Math.min(maxLength, CHAR_MAX);
  return {
    base: "/api/ext/x/profiles",
    test: "/api/ext/x/profiles/test",
    noun: "X profile",
    goalLabel: "Reply goal",
    samplesLabel: "Sample replies",
    samplesHint: `Optional. ${MIN_SAMPLES}-${MAX_SAMPLES} of your own replies on X teach it your voice better than any setting.`,
    testLabel: "X post to test on",
    testPlaceholder: "Paste a post from X here to preview what this profile writes.",
    defaultLength: lengthFromRange(80, Math.min(220, ceiling)),
    maxLength: ceiling,
  };
}

interface Props {
  // LinkedIn unless given (xProfileFormSite for an X profile).
  site?: ProfileFormSite;
  // Present when editing a saved profile; absent when creating a new one.
  // Its presence is what decides PUT vs POST.
  existing?: CommentProfile;
  // Prefills a NEW profile from existing values. Used by Duplicate, which is
  // the only way to base a profile on a shared system preset.
  seed?: ProfileDraft;
  onSaved: () => void;
  onCancel: () => void;
}

export function ProfileForm({ site = LINKEDIN_FORM, existing, seed, onSaved, onCancel }: Props) {
  const [draft, setDraft] = useState<ProfileDraft>(
    existing ? draftFromProfile(existing) : (seed ?? { ...EMPTY_DRAFT, length: site.defaultLength }),
  );
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [pastedPost, setPastedPost] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Shown in the Test box, not by Save: it's about the preview.
  const [testError, setTestError] = useState<string | null>(null);

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


  const requiredFilled =
    draft.name.trim() && draft.whoIAm.trim() && draft.goal && draft.tone && draft.length;

  async function handleTest() {
    if (!pastedPost.trim() || testsLeft <= 0) return;

    setTesting(true);
    setTestError(null);
    setTestResult(null);

    try {
      const res = await apiFetch<TestResponse>(site.test, {
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
      // A Test is a generation, so on the free plan it uses one of the free ones.
      noteFreeRemaining(res.freeRemaining);
    } catch (err) {
      // No unlock card in the builder: the 402's own message names the plan.
      notePaywallError(err);
      setTestError(err instanceof ApiError ? err.message : "Something went wrong, try again");
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
        await apiFetch(`${site.base}/${existing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch(site.base, {
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
    <FormLayout
      title={existing ? `Edit ${site.noun}` : `New ${site.noun}`}
      onCancel={onCancel}
      busy={busy}
      error={error}
      saveLabel={existing ? "Save changes" : "Create profile"}
      saving={saving}
      canSave={Boolean(requiredFilled)}
      onSave={handleSave}
    >
      <FormField label="Profile name" required>
        {(id) => (
          <Input id={id} value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Founder voice" />
        )}
      </FormField>

      <FormField label="Who I am" required>
        {(id) => (
          <Textarea
            id={id}
            autoGrow
            value={draft.whoIAm}
            onChange={(e) => set("whoIAm", e.target.value)}
            placeholder="A B2B SaaS founder who has shipped to 10k users"
            className="max-h-48 min-h-[4.5rem]"
          />
        )}
      </FormField>

      <FormField label={site.goalLabel} required>
        {(id) => <OptionSelect id={id} value={draft.goal} onChange={(v) => set("goal", v)} options={GOALS} />}
      </FormField>

      <FormField label="Tone" required>
        {(id) => <OptionSelect id={id} value={draft.tone} onChange={(v) => set("tone", v)} options={TONES} />}
      </FormField>

      <FormField label="Length" required>
        {() => <LengthRangePicker value={draft.length} onChange={(v) => set("length", v)} ceiling={site.maxLength} />}
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Emoji">
          {(id) => <OptionSelect id={id} value={draft.emoji} onChange={(v) => set("emoji", v)} options={EMOJI} />}
        </FormField>
        <FormField label="Language">
          {(id) => <OptionSelect id={id} value={draft.language} onChange={(v) => set("language", v)} options={LANGUAGES} />}
        </FormField>
      </div>

      <FormField label="Always do">
        {(id) => (
          <Textarea
            id={id}
            autoGrow
            value={draft.alwaysDo}
            onChange={(e) => set("alwaysDo", e.target.value)}
            placeholder="Optional"
            className="max-h-40 min-h-[2.625rem]"
          />
        )}
      </FormField>

      <FormField label="Never do">
        {(id) => (
          <Textarea
            id={id}
            autoGrow
            value={draft.neverDo}
            onChange={(e) => set("neverDo", e.target.value)}
            placeholder="Optional"
            className="max-h-40 min-h-[2.625rem]"
          />
        )}
      </FormField>

      <SamplesField
        label={site.samplesLabel}
        hint={site.samplesHint}
        noun="sample"
        samples={draft.samples}
        max={MAX_SAMPLES}
        onChange={(samples) => setDraft((d) => ({ ...d, samples }))}
      />

      <section className="space-y-2.5 rounded-lg border bg-muted/30 p-3" aria-label="Test this profile">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Test this profile</h3>
          <span className="text-xs tabular-nums text-muted-foreground">
            {testsLeft} of {testLimit} tests left
          </span>
        </div>
        <Textarea
          autoGrow
          aria-label={site.testLabel}
          value={pastedPost}
          onChange={(e) => setPastedPost(e.target.value)}
          placeholder={site.testPlaceholder}
          className="max-h-60 min-h-[5rem]"
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={!pastedPost.trim() || testsLeft <= 0 || !requiredFilled || saving}
          loading={testing}
          onClick={handleTest}
        >
          {!testing && <FlaskConical aria-hidden />}
          {testing ? "Testing…" : "Test"}
        </Button>
        {!requiredFilled && <p className="text-xs text-muted-foreground">Fill in the starred fields first.</p>}
        {testError && <Alert>{testError}</Alert>}
        {testResult && (
          <div className="animate-fade-in space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Preview</p>
            <p className="whitespace-pre-wrap rounded-md border bg-card p-3 text-sm leading-relaxed">{testResult}</p>
          </div>
        )}
      </section>

      <DefaultCheckbox checked={setAsDefault} onChange={setSetAsDefault} />
    </FormLayout>
  );
}
