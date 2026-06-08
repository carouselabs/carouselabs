"use client"

import { create } from "zustand"
import type { RawCategory } from "@/lib/ai/parsers/ideas"

export interface SessionIdea {
  id: string
  hook: string
  postType: string
  cta: string
  rawCategory: RawCategory
  isPinned: boolean
  isDismissed: boolean
  // Position within its generation batch (0–9) — drives stagger animation
  batchPosition: number
}

interface IdeaSessionState {
  ideas: SessionIdea[]
  topicInput: string
  isGenerating: boolean
  isLoadingMore: boolean
  error: string | null

  setTopicInput: (topic: string) => void
  addIdeas: (incoming: Omit<SessionIdea, "batchPosition">[]) => void
  togglePin: (id: string) => void
  dismissIdea: (id: string) => void
  setGenerating: (v: boolean) => void
  setLoadingMore: (v: boolean) => void
  setError: (err: string | null) => void
  clearIdeas: () => void
  reset: () => void
}

const defaults = {
  ideas: [] as SessionIdea[],
  topicInput: "",
  isGenerating: false,
  isLoadingMore: false,
  error: null as string | null,
}

export const useIdeaSessionStore = create<IdeaSessionState>()((set) => ({
  ...defaults,

  setTopicInput: (topicInput) => set({ topicInput }),

  addIdeas: (incoming) =>
    set((state) => ({
      ideas: [
        ...state.ideas,
        ...incoming.map((idea, i) => ({ ...idea, batchPosition: i })),
      ],
    })),

  togglePin: (id) =>
    set((state) => ({
      ideas: state.ideas.map((idea) =>
        idea.id === id ? { ...idea, isPinned: !idea.isPinned } : idea,
      ),
    })),

  dismissIdea: (id) =>
    set((state) => ({
      ideas: state.ideas.map((idea) =>
        idea.id === id ? { ...idea, isDismissed: true } : idea,
      ),
    })),

  setGenerating: (isGenerating) => set({ isGenerating }),
  setLoadingMore: (isLoadingMore) => set({ isLoadingMore }),
  setError: (error) => set({ error }),

  // Clears ideas only — keeps topicInput so user can re-generate same topic
  clearIdeas: () => set({ ideas: [], error: null }),

  // Full session reset — used by "New session" button
  reset: () => set({ ...defaults }),
}))
