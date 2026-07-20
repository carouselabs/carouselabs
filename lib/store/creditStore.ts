import { create } from "zustand"

// Live credit balance shared across the app. Seeded by useCurrentUser's
// initial /api/me fetch; generation clients call refresh() after every
// chargeable operation so the Topbar count updates without a page reload.
interface CreditState {
  creditsRemaining: number | null
  setCredits: (n: number) => void
  refresh: () => Promise<void>
}

export const useCreditStore = create<CreditState>((set) => ({
  creditsRemaining: null,
  setCredits: (n) => set({ creditsRemaining: n }),
  refresh: async () => {
    try {
      const res = await fetch("/api/me")
      if (!res.ok) return
      const data = (await res.json()) as { creditsRemaining?: number }
      if (typeof data.creditsRemaining === "number") {
        set({ creditsRemaining: data.creditsRemaining })
      }
    } catch {
      // best-effort — the balance just stays at its last known value
    }
  },
}))
