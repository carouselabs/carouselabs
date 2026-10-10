import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Bot, ChevronLeft, PenLine, Sparkles } from "lucide-react";
import { apiFetch, ApiError, openWebsite } from "@/lib/api";
import { AGENT_PURPOSE_LABELS, draftFromAgent, fetchAgents, type Agent, type AgentDraft } from "@/lib/agents";
import { clearBuilderProgress, loadBuilderProgress, type BuilderProgress } from "@/lib/agentBuilder";
import { WEBSITE_PATH } from "@/lib/platform";
import { AgentForm } from "../AgentForm";
import { AgentBuilder } from "../AgentBuilder";
import { ProfileList } from "../ProfileList";

// The person's AI agents (src/lib/agents.ts): listed, created, edited,
// duplicated, deleted, and one optionally the default for new conversations.
// Shared by both extensions' Profiles screens; the website edits the same
// list (Extension → AI agents).

type View =
  | { mode: "list" }
  // "New agent": build it with AI, or fill it in by hand.
  | { mode: "start" }
  | { mode: "builder" }
  // What the builder made, open in the form to review and save.
  | { mode: "built"; draft: AgentDraft }
  | { mode: "create" }
  | { mode: "edit"; agent: Agent }
  | { mode: "duplicate"; agent: Agent };

interface Props {
  // The Profiles screen's title and kind switch, shown above the list.
  header?: ReactNode;
  // Set when the Messages screen's "+ Create agent" brought the person here.
  startInBuilder?: boolean;
  onBuilderOpened?: () => void;
}

// ProfileList's shape: agents are never shared presets.
type ListAgent = Agent & { isSystem: false; isRecommended: false };
const asListItem = (agent: Agent): ListAgent => ({ ...agent, isSystem: false, isRecommended: false });

export function AgentsScreen({ header, startInBuilder, onBuilderOpened }: Props = {}) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ mode: startInBuilder ? "start" : "list" });
  const [previousStart, setPreviousStart] = useState(startInBuilder);
  if (previousStart !== startInBuilder) {
    setPreviousStart(startInBuilder);
    if (startInBuilder) setView({ mode: "start" });
  }
  // An interview left part-way, offered on the "New agent" choice.
  const [savedInterview, setSavedInterview] = useState<BuilderProgress | null>(null);
  useEffect(() => {
    if (view.mode !== "start") return;
    let cancelled = false;
    void loadBuilderProgress().then((progress) => {
      if (!cancelled) setSavedInterview(progress && progress.description.trim() ? progress : null);
    });
    return () => {
      cancelled = true;
    };
  }, [view.mode]);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(() => {
    return fetchAgents()
      .then((list) => {
        setAgents(list);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load your agents"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Consumed once, so navigating away and back does not reopen the builder.
  useEffect(() => {
    if (startInBuilder) onBuilderOpened?.();
  }, [startInBuilder, onBuilderOpened]);

  async function act(agent: Agent, action: () => Promise<unknown>, failure: string) {
    setPendingId(agent.id);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : failure);
      // A 409 means the list is out of date: show the current one.
      if (err instanceof ApiError && err.status === 409) await load();
    } finally {
      setPendingId(null);
    }
  }

  const setDefault = (agent: Agent, isDefault: boolean) =>
    act(
      agent,
      () =>
        apiFetch(`/api/ext/agents/${agent.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...draftFromAgent(agent), status: agent.status, version: agent.version, setAsDefault: isDefault }),
        }),
      "Couldn't change the default agent",
    );

  const close = () => {
    setView({ mode: "list" });
    void load();
  };

  if (view.mode === "start") {
    const choice = (icon: ReactNode, title: string, body: string, onClick: () => void) => (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-start gap-3 rounded-lg border bg-card p-3 text-left transition-colors duration-fast hover:border-primary/50 hover:bg-accent/40"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">{icon}</span>
        <span className="space-y-0.5">
          <span className="block text-sm font-semibold">{title}</span>
          <span className="block text-xs leading-relaxed text-muted-foreground">{body}</span>
        </span>
      </button>
    );
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setView({ mode: "list" })}
            className="-ml-1 inline-flex items-center gap-0.5 rounded px-1 text-xs font-medium text-muted-foreground transition-colors duration-fast hover:text-foreground"
          >
            <ChevronLeft aria-hidden className="h-3.5 w-3.5" />
            Agents
          </button>
          <h2 className="text-base font-semibold tracking-tight">New agent</h2>
        </div>
        {savedInterview &&
          choice(
            <Sparkles aria-hidden className="h-4 w-4" />,
            "Continue building",
            `Pick up where you left off: “${savedInterview.description.slice(0, 80)}${savedInterview.description.length > 80 ? "…" : ""}”`,
            () => setView({ mode: "builder" }),
          )}
        {choice(
          <Sparkles aria-hidden className="h-4 w-4" />,
          savedInterview ? "Build a new one with AI" : "Build with AI",
          "Describe it in your own words; the AI asks a few questions and sets it up. Free.",
          () => {
            // A new one replaces an interview left part-way.
            void (savedInterview ? clearBuilderProgress() : Promise.resolve()).then(() => setView({ mode: "builder" }));
          },
        )}
        {choice(<PenLine aria-hidden className="h-4 w-4" />, "Fill it in myself", "Every field, by hand.", () => setView({ mode: "create" }))}
      </div>
    );
  }

  if (view.mode === "builder") {
    return <AgentBuilder onBuilt={(draft) => setView({ mode: "built", draft })} onCancel={() => setView({ mode: "list" })} />;
  }

  if (view.mode === "built") {
    return <AgentForm seed={view.draft} fromBuilder onSaved={close} onCancel={() => setView({ mode: "builder" })} />;
  }

  if (view.mode === "create") return <AgentForm onSaved={close} onCancel={() => setView({ mode: "list" })} />;
  if (view.mode === "edit") return <AgentForm existing={view.agent} onSaved={close} onCancel={() => setView({ mode: "list" })} />;
  if (view.mode === "duplicate") {
    return <AgentForm seed={draftFromAgent(view.agent, true)} onSaved={close} onCancel={() => setView({ mode: "list" })} />;
  }

  const empty = (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-input px-4 py-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Bot aria-hidden className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold">No agents yet</p>
      <p className="text-xs leading-relaxed text-muted-foreground">
        An agent knows your business, who you talk to and what each conversation is for, and writes your replies in
        Messages with that in mind. You always review before sending.
      </p>
    </div>
  );

  return (
    <ProfileList
      header={header}
      title="AI agents"
      noun="agent"
      loading={loading}
      error={error}
      profiles={agents.map(asListItem)}
      summary={(agent) => agent.description || agent.config.goals}
      meta={(agent) => AGENT_PURPOSE_LABELS[agent.purpose] ?? null}
      defaultId={agents.find((agent) => agent.isDefault)?.id ?? null}
      pendingId={pendingId}
      emptyState={!loading && !error ? empty : null}
      onNew={() => setView({ mode: "start" })}
      onEdit={(agent) => setView({ mode: "edit", agent })}
      onDuplicate={(agent) => setView({ mode: "duplicate", agent })}
      onSetDefault={(agent) => void setDefault(agent, true)}
      onUnsetDefault={(agent) => void setDefault(agent, false)}
      onDelete={(agent) =>
        void act(agent, () => apiFetch(`/api/ext/agents/${agent.id}`, { method: "DELETE" }), "Couldn't delete that agent")
      }
      websiteLink={{
        label: "Easier on a big screen? Edit agents on carouselabs.com",
        onClick: () => void openWebsite(`${WEBSITE_PATH}/agents`),
      }}
    />
  );
}
