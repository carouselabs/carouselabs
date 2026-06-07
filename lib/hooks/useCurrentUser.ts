"use client"

import { useState, useEffect } from "react"

export interface CurrentUser {
  id: string
  email: string
  name: string | null
  plan: "FREE" | "PRO"
  postsToday: number
  postsTotal: number
  onboardingDone: boolean
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CurrentUser | null) => {
        setUser(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return { user, loading }
}
