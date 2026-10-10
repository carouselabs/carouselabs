import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Bot } from "lucide-react";
import { apiFetch, ApiError, openWebsite } from "@/lib/api";
import { AGENT_PURPOSE_LABELS, draftFromAgent, fetchAgents, type Agent } from "@/lib/agents";
import { AgentForm } from "../AgentForm";
import { ProfileList } from "../ProfileList";

// The person's AI agents (src/lib/agents.ts): listed, created, edited,
// duplicated, deleted, and one optionally the default for new conversations.
// Shared by both extensions' Profiles screens; the website edits the same
// list (Extension → AI agents).

type View = { mode: "list" } | { mode: "create" } | { mode: "edit"; agent: Agent } | { mode: "duplicate"; agent: Agent };

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
  const [view, setView] = useState<View>({ mode: startInBuilder ? "create" : "list" });
  const [previousStart, setPreviousStart] = useState(startInBuilder);
  if (previousStart !== startInBuilder) {
    setPreviousStart(startInBuilder);
    if (startInBuilder) setView({ mode: "create" });
  }
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
      onNew={() => setView({ mode: "create" })}
      onEdit={(agent) => setView({ mode: "edit", agent })}
      onDuplicate={(agent) => setView({ mode: "duplicate", agent })}
      onSetDefault={(agent) => void setDefault(agent, true)}
      onUnsetDefault={(agent) => void setDefault(agent, false)}
      onDelete={(agent) =>
        void act(agent, () => apiFetch(`/api/ext/agents/${agent.id}`, { method: "DELETE" }), "Couldn't delete that agent")
      }
      websiteLink={{
        label: "Easier on a big screen? Edit agents on carouselabs.com",
        onClick: () => void openWebsite("/extension/agents"),
      }}
    />
  );
}
