import type { ReactNode } from "react"
import { Onest } from "next/font/google"
import { ProgressBar } from "@/components/onboarding/ProgressBar"
import { Stickers } from "@/components/shared/Stickers"

const font = Onest({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
})

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${font.className} relative min-h-screen flex flex-col bg-[#F9F7F2] text-[#0A0A0A] overflow-hidden`}
    >
      {/* The root layout sets a dark body background; keep onboarding on cream. */}
      <style>{`body{background-color:#F9F7F2;color:#0A0A0A}`}</style>

      {/* Floating onboarding stickers in the background */}
      <Stickers
        variant="onboarding"
        containerClassName="absolute inset-0 z-0 pointer-events-none overflow-hidden hidden lg:block"
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
