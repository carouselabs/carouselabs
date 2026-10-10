// Custom AI conversation agents, as the panel sees them (the server's
// lib/engageAgents.ts owns the rules; keep the shapes and lists in step).
// Shared by both extensions: one list per account, used on the Messages
// screen in LinkedIn conversations and X chats alike.
import { apiFetch } from "@/lib/api";

export const AGENT_PURPOSES = ["sales", "networking", "recruiting", "partnerships", "support", "other"] as const;
export type AgentPurpose = (typeof AGENT_PURPOSES)[number];
export const AGENT_PURPOSE_LABELS: Record<AgentPurpose, string> = {
  sales: "Sales",
  networking: "Networking",
  recruiting: "Recruiting",
  partnerships: "Partnerships",
  support: "Customer support",
  other: "Other",
};

export const AGENT_LENGTHS = ["auto", "short", "medium", "long"] as const;
export type AgentLength = (typeof AGENT_LENGTHS)[number];
export const AGENT_LENGTH_LABELS: Record<AgentLength, string> = {
  auto: "Whatever fits the moment",
  short: "Short (1-3 sentences)",
  medium: "Medium (a short paragraph)",
  long: "Long (when there's substance)",
};

export const MATCH_CONVERSATION_LANGUAGE = "Match the conversation";

export const AGENT_MAX = { facts: 25, objections: 12, examples: 5 } as const;

export interface AgentConfig {
  business: string;
  offer: string;
  audience: string;
  goals: string;
  nextStep: string;
  strategy: string;
  tone: string;
  length: AgentLength;
  language: string;
  facts: string[];
  objections: string[];
  alwaysDo: string;
  neverDo: string;
  examples: string[];
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  purpose: AgentPurpose;
  status: "active" | "draft";
  isDefault: boolean;
  version: number;
  config: AgentConfig;
  createdAt: string;
  updatedAt: string;
}

// What the builder edits and the API takes.
export interface AgentDraft {
  name: string;
  description: string;
  purpose: AgentPurpose;
  config: AgentConfig;
}

export const EMPTY_AGENT_CONFIG: AgentConfig = {
  business: "",
  offer: "",
  audience: "",
  goals: "",
  nextStep: "",
  strategy: "",
  tone: "Natural",
  length: "auto",
  language: MATCH_CONVERSATION_LANGUAGE,
  facts: [],
  objections: [],
  alwaysDo: "",
  neverDo: "",
  examples: [],
};

export function draftFromAgent(agent: Agent, copy = false): AgentDraft {
  return {
    name: copy ? `${agent.name} copy` : agent.name,
    description: agent.description,
    purpose: agent.purpose,
    config: { ...EMPTY_AGENT_CONFIG, ...agent.config },
  };
}

// The agent list as it would fit a page: the user's own only, the default
// first (the server's order).
// Anything but a list (an older server, a page that isn't the API) reads as
// no agents.
export async function fetchAgents(): Promise<Agent[]> {
  const { agents } = await apiFetch<{ agents?: unknown }>("/api/ext/agents");
  return Array.isArray(agents) ? (agents as Agent[]) : [];
}
