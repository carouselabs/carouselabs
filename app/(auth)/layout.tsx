import Link from "next/link"

import { fontVariables } from "@/lib/fonts"
import { ProductFrame } from "@/components/patterns/ProductFrame"
import { StudioPreview } from "@/components/patterns/StudioPreview"

// The anantgoyal.in frame: the blue → violet ground with a few orbs, a white
// panel holding the form, and on wide screens one static product example on
// the dotted stage beside it (aria-hidden, never competing with the form).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-theme="light"
      className={`${fontVariables} ground-canvas relative isolate min-h-screen overflow-hidden p-2 font-ui text-foreground sm:p-4 lg:p-6`}
    >
      {/* The root layout's body styles are for the authenticated app. */}
      <style>{`body{background-color:#4A2EE6;color:#100C33}`}</style>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <span className="orb orb-violet -top-16 -right-16 size-56" />
        <span className="orb orb-blue -bottom-20 -left-16 size-64" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100svh-16px)] max-w-[1400px] overflow-hidden rounded-[28px] bg-white text-[#100C33] shadow-[0_40px_120px_-40px_rgb(16_6_90/0.65)] sm:min-h-[calc(100svh-32px)] sm:rounded-[40px] lg:min-h-[calc(100svh-48px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="flex flex-col px-4 py-6 sm:px-8 lg:px-14 lg:py-10">
          <Link href="/" className="flex items-center gap-2 self-start text-[17px] font-semibold tracking-[-0.02em]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="" className="size-8" />
            CarouseLabs
          </Link>
          <div className="flex flex-1 items-center justify-center py-10">{children}</div>
        </div>

        <div aria-hidden className="relative hidden p-4 lg:block">
          <div className="ground-dots relative flex h-full items-center overflow-hidden rounded-[30px] p-10">
            <span className="orb orb-pearl top-10 left-10 size-14" />
            <span className="orb orb-lime top-16 right-16 size-6" />
            <span className="orb orb-violet right-12 bottom-12 size-24" />
            <ProductFrame label="Example" className="relative w-full shadow-float">
              <StudioPreview />
            </ProductFrame>
          </div>
        </div>
      </div>
    </div>
  )
}
