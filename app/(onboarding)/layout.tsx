import type { ReactNode } from "react"

import { fontVariables } from "@/lib/fonts"
import { ProgressBar } from "@/components/onboarding/ProgressBar"

// One focused white panel on the lavender ground (anantgoyal.in): logo,
// progress, the question. No decoration.
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div data-theme="light" className={`${fontVariables} flex min-h-screen flex-col bg-background font-ui text-foreground`}>
      {/* The root layout's body styles are for the authenticated app. */}
      <style>{`body{background-color:#F4F3FC;color:#100C33}`}</style>

      <div className="mx-auto flex w-full max-w-[40rem] flex-1 flex-col px-2 py-2 sm:px-4 sm:py-10">
        <div className="flex flex-1 flex-col rounded-[28px] bg-surface shadow-card ring-1 ring-[#100C33]/5 sm:flex-none">
          <header className="flex flex-col gap-5 px-5 pt-6 sm:px-10 sm:pt-10">
            <span className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.02em]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.png" alt="" className="size-8" />
              CarouseLabs
            </span>
            <ProgressBar />
          </header>
          <main className="flex flex-1 justify-center px-5 py-8 sm:px-10 sm:py-10">
            <div className="w-full">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
