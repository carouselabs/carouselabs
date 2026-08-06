"use client"

// Whether the logged-in user has an active Intern record — drives the
// conditional "Intern Points" nav link. Silently resolves to false for
// non-interns/errors rather than surfacing a loading state in the nav.
import { useEffect, useState } from "react"

export function useInternAccess() {
  const [isIntern, setIsIntern] = useState(false)

  useEffect(() => {
    fetch("/api/intern/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { intern: { active: boolean } | null } | null) => {
        setIsIntern(!!data?.intern?.active)
      })
      .catch(() => setIsIntern(false))
  }, [])

  return isIntern
}
