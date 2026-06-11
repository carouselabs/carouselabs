"use client"

import { create } from "zustand"
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware"

// Max regenerations a user gets per idea per session.
export const MAX_REGENERATIONS = 2
// How many previous versions we retain.
const MAX_VERSIONS = 3

interface RegenerationState {
  regenerationCount: Record<string, number>
  versions: Record<string, string[]>

  increment: (ideaId: string) => void
  decrement: (ideaId: string) => void
  addVersion: (ideaId: string, content: string) => void
  getCount: (ideaId: string) => number
  getVersions: (ideaId: string) => string[]
}

// SSR-safe storage — falls back to a no-op on the server where sessionStorage
// doesn't exist. Persisting to sessionStorage means counts reset when the
// browser (tab) is closed.
const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

export const useRegenerationStore = create<RegenerationState>()(
  persist(
    (set, get) => ({
      regenerationCount: {},
      versions: {},

      increment: (ideaId) =>
        set((state) => ({
          regenerationCount: {
            ...state.regenerationCount,
            [ideaId]: (state.regenerationCount[ideaId] ?? 0) + 1,
          },
        })),

      // Refund a reserved slot when a regeneration attempt fails.
      decrement: (ideaId) =>
        set((state) => ({
          regenerationCount: {
            ...state.regenerationCount,
            [ideaId]: Math.max(0, (state.regenerationCount[ideaId] ?? 0) - 1),
          },
        })),

      // Saves current content as the newest previous version (most recent first).
      addVersion: (ideaId, content) =>
        set((state) => {
          const existing = state.versions[ideaId] ?? []
          const next = [content, ...existing].slice(0, MAX_VERSIONS)
          return { versions: { ...state.versions, [ideaId]: next } }
        }),

      getCount: (ideaId) => get().regenerationCount[ideaId] ?? 0,
      getVersions: (ideaId) => get().versions[ideaId] ?? [],
    }),
    {
      name: "regeneration-store",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? sessionStorage : noopStorage,
      ),
    },
  ),
)
