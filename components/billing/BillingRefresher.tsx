"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// The billing page is a server component, so its data is fetched once on
// load. A top-up checkout happens in a separate Lemon Squeezy tab — refresh
// the server data when the user comes back so the new balance shows without
// a manual reload.
export function BillingRefresher() {
  const router = useRouter()

  useEffect(() => {
    const handleFocus = () => router.refresh()
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [router])

  return null
}
