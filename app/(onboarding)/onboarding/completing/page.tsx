"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useOnboardingStore } from "@/lib/store/onboardingStore"

const MESSAGES = [
  "Analyzing your content DNA…",
  "Calibrating your voice profile…",
  "Building your idea engine…",
  "Setting up your workspace…",
  "Almost there…",
]

export default function CompletingPage() {
  const router = useRouter()
  const reset = useOnboardingStore((s) => s.reset)
  const [msgIdx, setMsgIdx] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx((i) => (i + 1) % MESSAGES.length)
    }, 600)

    const timeout = setTimeout(() => {
      clearInterval(interval)
      reset()
      router.push("/dashboard")
    }, 3000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [router, reset])

  // Timing and the hand-off to /dashboard are unchanged; reduced motion only
  // stops the spinner, never the completion.
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <span aria-hidden className="mb-8 size-12 animate-spin rounded-full border-2 border-surface-muted border-t-foreground motion-reduce:animate-none" />
      <h2 className="mb-2 text-title-sm font-semibold">Setting everything up</h2>
      <p role="status" aria-live="polite" className="text-body text-muted-foreground">
        {MESSAGES[msgIdx]}
      </p>
    </div>
  )
}
