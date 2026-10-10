// The AI agent builder's side of the panel: its three server calls
// (app/api/ext/agents/builder) and the interview in progress, kept in this
// browser so leaving the panel (or closing it) loses nothing.
import { apiFetch } from "@/lib/api";
import type { AgentConfig, AgentDraft, AgentPurpose } from "@/lib/agents";

export interface BuilderAnswer {
  question: string;
  // Empty when skipped.
  answer: string;
  // What it was about, so the AI never asks about it again in other words.
  topic?: string;
}

export interface InterviewQuestion {
  question: string;
  hint: string;
  optional: boolean;
  topic?: string;
}

export interface BuilderProgress {
  description: string;
  answers: BuilderAnswer[];
  // The question waiting for an answer, or null once the interview is done.
  pending: InterviewQuestion | null;
  done: boolean;
  updatedAt: number;
}

// The most questions the server asks (MAX_QUESTIONS in lib/engage/agentBuilder.ts).
export const MAX_QUESTIONS = 8;

const PROGRESS_KEY = "agentBuilderProgress";

export async function loadBuilderProgress(): Promise<BuilderProgress | null> {
  try {
    const stored = (await chrome.storage.local.get(PROGRESS_KEY))[PROGRESS_KEY] as Partial<BuilderProgress> | undefined;
    if (!stored || typeof stored.description !== "string" || !Array.isArray(stored.answers)) return null;
    return {
      description: stored.description,
      answers: stored.answers.filter((a): a is BuilderAnswer => !!a && typeof a.question === "string" && typeof a.answer === "string"),
      pending: stored.pending && typeof stored.pending.question === "string" ? stored.pending : null,
      done: stored.done === true,
      updatedAt: typeof stored.updatedAt === "number" ? stored.updatedAt : 0,
    };
  } catch {
    return null;
  }
}

export function saveBuilderProgress(progress: Omit<BuilderProgress, "updatedAt">): Promise<void> {
  return chrome.storage.local.set({ [PROGRESS_KEY]: { ...progress, updatedAt: Date.now() } }).catch(() => {});
}

export function clearBuilderProgress(): Promise<void> {
  return chrome.storage.local.remove(PROGRESS_KEY).catch(() => {});
}

const post = <T>(body: unknown) =>
  apiFetch<T>("/api/ext/agents/builder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export async function nextQuestion(description: string, answers: BuilderAnswer[]): Promise<InterviewQuestion | null> {
  const step = await post<{ done: boolean; question?: string; hint?: string; optional?: boolean; topic?: string }>({ action: "interview", description, answers });
  if (step.done || !step.question) return null;
  return { question: step.question, hint: step.hint ?? "", optional: step.optional !== false, ...(step.topic ? { topic: step.topic } : {}) };
}

interface ServerDraft {
  name: string;
  description: string;
  purpose: AgentPurpose;
  config: AgentConfig;
}

export async function buildDraft(description: string, answers: BuilderAnswer[]): Promise<AgentDraft> {
  const { draft } = await post<{ draft: ServerDraft }>({ action: "draft", description, answers });
  return { name: draft.name, description: draft.description, purpose: draft.purpose, config: draft.config };
}

export async function refineDraft(draft: AgentDraft, instruction: string): Promise<{ draft: AgentDraft; changed: string[] }> {
  const res = await post<{ draft: ServerDraft; changed: string[] }>({ action: "refine", draft, instruction });
  return {
    draft: { name: draft.name, description: res.draft.description, purpose: res.draft.purpose, config: res.draft.config },
    changed: Array.isArray(res.changed) ? res.changed : [],
  };
}

// The words for what Refine changed ("tone, strategy").
export const FIELD_LABELS: Record<string, string> = {
  business: "your business",
  offer: "your offer",
  audience: "who you talk to",
  goals: "the goal",
  nextStep: "the next step",
  strategy: "how to move the conversation",
  tone: "tone",
  length: "length",
  language: "language",
  objections: "situations",
  alwaysDo: "Always rules",
  neverDo: "Never rules",
  description: "the description",
};
