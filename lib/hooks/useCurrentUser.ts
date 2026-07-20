"use client"

import { useState, useEffect } from "react"
import { useCreditStore } from "@/lib/store/creditStore"

export interface CurrentUser {
  id: string
  email: string
  name: string | null
  plan: "FREE" | "PRO"
  postsToday: number
  postsTotal: number
  creditsRemaining: number
  freeLimit: number
  onboardingDone: boolean
  isAdmin?: boolean
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CurrentUser | null) => {
        setUser(data)
        // Seed the live credit store so the Topbar can update in real time
        // when generations refresh it.
        if (typeof data?.creditsRemaining === "number") {
          useCreditStore.getState().setCredits(data.creditsRemaining)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return { user, loading }
}
