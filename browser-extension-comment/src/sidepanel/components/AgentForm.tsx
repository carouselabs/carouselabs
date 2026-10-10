import { useState, type ReactNode } from "react";
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
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4" aria-label={title}>
      <h3 className="border-b pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

export function AgentForm({ existing, seed, onSaved, onCancel }: Props) {
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
