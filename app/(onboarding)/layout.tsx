import type { ReactNode } from "react"

import { fontVariables } from "@/lib/fonts"
import { ProgressBar } from "@/components/onboarding/ProgressBar"

// One focused column: logo, progress, the question. No decoration.
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div data-theme="light" className={`${fontVariables} flex min-h-screen flex-col bg-background font-ui text-foreground`}>
      {/* The root layout's body styles are for the authenticated app. */}
      <style>{`body{background-color:#F9F7F2;color:#211F1C}`}</style>

      <header className="mx-auto flex w-full max-w-form flex-col gap-5 px-4 pt-6 sm:px-0 sm:pt-10">
        <span className="flex items-center gap-2 text-body font-semibold tracking-[-0.02em]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="" className="size-7" />
          CarouseLabs
        </span>
        <ProgressBar />
      </header>
      <main className="flex flex-1 justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-form">{children}</div>
      </main>
    </div>
  )
}
