import { useState, type ReactNode } from "react";
import { Sparkles, Undo2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import {
  AGENT_LENGTHS,
  AGENT_LENGTH_LABELS,
  AGENT_MAX,
  AGENT_PURPOSES,
  AGENT_PURPOSE_LABELS,
  EMPTY_AGENT_CONFIG,
  MATCH_CONVERSATION_LANGUAGE,
  draftFromAgent,
  type Agent,
  type AgentConfig,
  type AgentDraft,
  type AgentLength,
  type AgentPurpose,
} from "@/lib/agents";
import { MESSAGE_TONES } from "@/lib/messageThread";
import { clearBuilderProgress, FIELD_LABELS, refineDraft } from "@/lib/agentBuilder";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DefaultCheckbox, FormField, FormLayout, OptionSelect, SamplesField } from "./form";

// The agent builder: everything an agent knows, in a few short sections. The
// AI interview that fills this in from a description comes later; until then
// (and to adjust what it wrote) this is the editor.

const LANGUAGES = [MATCH_CONVERSATION_LANGUAGE, "English", "Spanish", "French", "German", "Portuguese", "Italian", "Dutch", "Hindi"];

export const EMPTY_AGENT_DRAFT: AgentDraft = {
  name: "",
  description: "",
  purpose: "sales",
  config: EMPTY_AGENT_CONFIG,
};

// A list field shows at least one box to type into.
const atLeastOne = (items: string[]) => (items.length > 0 ? items : [""]);
const cleaned = (items: string[]) => items.map((item) => item.trim()).filter(Boolean);

interface Props {
  // Present when editing: the form PUTs (with its version) instead of POSTing.
  existing?: Agent;
  // Pre-filled values for a duplicate, which still saves as a new agent.
  seed?: AgentDraft;
  onSaved: (agent: Agent) => void;
  onCancel: () => void;
  // The seed came from the AI builder: its saved interview is cleared once
  // the agent is saved.
  fromBuilder?: boolean;
}

// One-click instructions for Refine with AI.
const QUICK_REFINES: { label: string; instruction: string }[] = [
  { label: "Improve it", instruction: "Improve it: clearer, more specific, more useful for writing replies." },
  { label: "Friendlier", instruction: "Make the tone friendlier and warmer, still natural." },
  { label: "More professional", instruction: "Make it more professional and polished." },
  { label: "Shorter replies", instruction: "Make replies shorter and more to the point." },
];

// Refine with AI: the agent's wording improved by the AI, following a quick
// pick or the person's own instruction. Their facts, examples and rules are
// kept by the server whatever it returns; Undo puts back the version before.
function RefinePanel({ draft, onRefined }: { draft: AgentDraft; onRefined: (next: AgentDraft) => void }) {
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ changed: string[]; before: AgentDraft } | null>(null);

  async function refine(text: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const before = draft;
      const { draft: next, changed } = await refineDraft(draft, text);
      onRefined(next);
      setResult({ changed, before });
      setInstruction("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't refine it just now. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Refine with AI" className="space-y-2 rounded-lg border bg-muted/40 p-3">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <Sparkles aria-hidden className="h-4 w-4 text-primary-text" />
        Refine with AI
      </p>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_REFINES.map((quick) => (
          <Button key={quick.label} size="sm" variant="outline" className="h-7 px-2.5" disabled={busy || !draft.config.goals.trim()} onClick={() => void refine(quick.instruction)}>
            {quick.label}
          </Button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <Input
          aria-label="What to change"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value.slice(0, 500))}
          placeholder="Or say what to change"
          onKeyDown={(e) => {
            if (e.key === "Enter" && instruction.trim()) void refine(instruction.trim());
          }}
        />
        <Button size="sm" className="h-9 shrink-0" loading={busy} disabled={!instruction.trim() || !draft.config.goals.trim()} onClick={() => void refine(instruction.trim())}>
          Refine
        </Button>
      </div>
      {error && <Alert>{error}</Alert>}
      {result && !busy && (
        <div role="status" className="flex items-start justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {result.changed.length > 0
              ? `Updated ${result.changed.map((key) => FIELD_LABELS[key] ?? key).join(", ")}. Your facts, examples and rules were kept.`
              : "Nothing needed changing."}
          </span>
          {result.changed.length > 0 && (
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-1 font-medium text-foreground hover:underline"
              onClick={() => {
                onRefined(result.before);
                setResult(null);
              }}
            >
              <Undo2 aria-hidden className="h-3.5 w-3.5" />
              Undo
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4" aria-label={title}>
      <h3 className="border-b pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

export function AgentForm({ existing, seed, onSaved, onCancel, fromBuilder = false }: Props) {
  const [draft, setDraft] = useState<AgentDraft>(existing ? draftFromAgent(existing) : (seed ?? EMPTY_AGENT_DRAFT));
  // The version the edit started from; replaced by the server's when it says
  // the agent changed elsewhere meanwhile.
  const [version, setVersion] = useState(existing?.version ?? 0);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = draft.config;
  function set<K extends keyof AgentConfig>(key: K, value: AgentConfig[K]) {
    setDraft((current) => ({ ...current, config: { ...current.config, [key]: value } }));
  }

  const canSave = Boolean(draft.name.trim() && config.goals.trim());

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        ...draft,
        status: "active",
        config: {
          ...config,
          facts: cleaned(config.facts),
          objections: cleaned(config.objections),
          examples: cleaned(config.examples),
        },
        ...(existing ? { version } : {}),
        ...(setAsDefault ? { setAsDefault: true } : {}),
      };
      const { agent } = await apiFetch<{ agent: Agent }>(existing ? `/api/ext/agents/${existing.id}` : "/api/ext/agents", {
        method: existing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (fromBuilder) await clearBuilderProgress();
      onSaved(agent);
    } catch (err) {
      const latest = err instanceof ApiError && err.status === 409 ? (err.data as { agent?: Agent }).agent : undefined;
      if (latest) {
        // Changed in another browser or on the website: show that version.
        setDraft(draftFromAgent(latest));
        setVersion(latest.version);
      }
      setError(err instanceof ApiError ? err.message : "Couldn't save that agent");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormLayout
      title={existing ? "Edit agent" : "New agent"}
      onCancel={onCancel}
      busy={saving}
      error={error}
      saveLabel={existing ? "Save changes" : "Create agent"}
      saving={saving}
      canSave={canSave}
      onSave={handleSave}
    >
      <RefinePanel draft={draft} onRefined={(next) => setDraft((current) => ({ ...next, name: current.name }))} />

      <Section title="The agent">
        <FormField label="Agent name" required>
          {(id) => (
            <Input
              id={id}
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="e.g. Founder outreach"
            />
          )}
        </FormField>
        <FormField label="Short description">
          {(id) => (
            <Input
              id={id}
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="e.g. Builds relationships with SaaS founders"
            />
          )}
        </FormField>
        <FormField label="Kind of agent">
          {(id) => (
            <Select value={draft.purpose} onValueChange={(value) => setDraft((d) => ({ ...d, purpose: value as AgentPurpose }))}>
              <SelectTrigger id={id}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGENT_PURPOSES.map((purpose) => (
                  <SelectItem key={purpose} value={purpose}>
                    {AGENT_PURPOSE_LABELS[purpose]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
      </Section>

      <Section title="Your business">
        <FormField label="Who you are, what you do">
          {(id) => (
            <Textarea
              id={id}
              autoGrow
              value={config.business}
              onChange={(e) => set("business", e.target.value)}
              placeholder="e.g. I run a SaaS company that helps people create LinkedIn content"
              className="max-h-48 min-h-[3.75rem]"
            />
          )}
        </FormField>
        <FormField label="What you offer" hint="Your product or service, and why it's worth having.">
          {(id) => (
            <Textarea
              id={id}
              autoGrow
              value={config.offer}
              onChange={(e) => set("offer", e.target.value)}
              placeholder="e.g. Turns one idea into a week of LinkedIn posts and carousels"
              className="max-h-48 min-h-[3.75rem]"
            />
          )}
        </FormField>
        <FormField label="Who you talk to">
          {(id) => (
            <Textarea
              id={id}
              autoGrow
              value={config.audience}
              onChange={(e) => set("audience", e.target.value)}
              placeholder="e.g. Founders and creators who post on LinkedIn but struggle to stay consistent"
              className="max-h-48 min-h-[3.75rem]"
            />
          )}
        </FormField>
      </Section>

      <Section title="Goals">
        <FormField label="What these conversations are for" required>
          {(id) => (
            <Textarea
              id={id}
              autoGrow
              value={config.goals}
              onChange={(e) => set("goals", e.target.value)}
              placeholder="e.g. Understand their challenges and build a real relationship; introduce the product only when it fits"
              className="max-h-48 min-h-[3.75rem]"
            />
          )}
        </FormField>
        <FormField label="Next step to aim for" hint="Only suggested once the conversation is ready for it.">
          {(id) => (
            <Input id={id} value={config.nextStep} onChange={(e) => set("nextStep", e.target.value)} placeholder="e.g. A 15-minute call" />
          )}
        </FormField>
        <FormField label="How to move the conversation">
          {(id) => (
            <Textarea
              id={id}
              autoGrow
              value={config.strategy}
              onChange={(e) => set("strategy", e.target.value)}
              placeholder="e.g. Ask about their content process first; mention the product only if they share a problem it solves"
              className="max-h-48 min-h-[3.75rem]"
            />
          )}
        </FormField>
      </Section>

      <Section title="Style">
        <FormField label="Tone">
          {(id) => <OptionSelect id={id} value={config.tone} onChange={(v) => set("tone", v)} options={MESSAGE_TONES} />}
        </FormField>
        <FormField label="Reply length">
          {(id) => (
            <Select value={config.length} onValueChange={(value) => set("length", value as AgentLength)}>
              <SelectTrigger id={id}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGENT_LENGTHS.map((length) => (
                  <SelectItem key={length} value={length}>
                    {AGENT_LENGTH_LABELS[length]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
        <FormField label="Language">
          {(id) => <OptionSelect id={id} value={config.language} onChange={(v) => set("language", v)} options={LANGUAGES} />}
        </FormField>
      </Section>

      <Section title="Knowledge">
        <SamplesField
          label="Verified facts"
          hint="The only things it may say about your product: prices, features, results. Anything not here, it won't claim."
          noun="fact"
          samples={atLeastOne(config.facts)}
          max={AGENT_MAX.facts}
          onChange={(facts) => set("facts", facts)}
        />
        <SamplesField
          label="Objections and situations"
          hint="Each with how to handle it, e.g. “Too expensive: mention the free plan, don't push.”"
          noun="situation"
          samples={atLeastOne(config.objections)}
          max={AGENT_MAX.objections}
          onChange={(objections) => set("objections", objections)}
        />
      </Section>

      <Section title="Rules">
        <FormField label="Always">
          {(id) => (
            <Textarea
              id={id}
              autoGrow
              value={config.alwaysDo}
              onChange={(e) => set("alwaysDo", e.target.value)}
              placeholder="e.g. Answer their question before anything else"
              className="max-h-40 min-h-[2.625rem]"
            />
          )}
        </FormField>
        <FormField label="Never">
          {(id) => (
            <Textarea
              id={id}
              autoGrow
              value={config.neverDo}
              onChange={(e) => set("neverDo", e.target.value)}
              placeholder="e.g. Never pitch in the first reply, never ask for a call twice"
              className="max-h-40 min-h-[2.625rem]"
            />
          )}
        </FormField>
      </Section>

      <Section title="Examples">
        <SamplesField
          label="Replies that sound like you"
          hint="Optional, but the strongest lever on voice."
          noun="example"
          samples={atLeastOne(config.examples)}
          max={AGENT_MAX.examples}
          onChange={(examples) => set("examples", examples)}
        />
      </Section>

      <DefaultCheckbox
        checked={setAsDefault}
        onChange={setSetAsDefault}
        label="Start new conversations with this agent"
      />
    </FormLayout>
  );
}
