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

  return (
    <div className="flex flex-col items-center text-center py-12">
      <div className="relative w-[72px] h-[72px] mb-8">
        <div className="absolute inset-0 rounded-full border-2 border-[rgba(26,26,26,0.15)]" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#1A1A1A] animate-spin" />
        <div className="absolute inset-[10px] rounded-full bg-[rgba(26,26,26,0.08)] flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-[#1A1A1A] animate-pulse" />
        </div>
      </div>

      <h2 className="text-xl font-semibold text-[#0A0A0A] mb-3">Setting everything up</h2>
      <p className="text-sm text-[#9CA3AF] transition-opacity duration-300">
        {MESSAGES[msgIdx]}
      </p>
    </div>
  )
}
