import type { ReactNode } from "react"
import { ProgressBar } from "@/components/onboarding/ProgressBar"

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col bg-[#080810] overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 35% at 50% -10%, rgba(124,58,237,0.12) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 w-full">
        <ProgressBar />
      </div>
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-[520px]">{children}</div>
      </div>
    </div>
  )
}
