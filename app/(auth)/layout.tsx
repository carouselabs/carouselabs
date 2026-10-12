import Link from "next/link"

import { fontVariables } from "@/lib/fonts"
import { ProductFrame } from "@/components/patterns/ProductFrame"
import { StudioPreview } from "@/components/patterns/StudioPreview"

// Form first. On wide screens one quiet, static product example sits beside
// the form; it never competes with it (aria-hidden, no motion).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="light" className={`${fontVariables} min-h-screen bg-background font-ui text-foreground`}>
      {/* The root layout's body styles are for the authenticated app. */}
      <style>{`body{background-color:#F9F7F2;color:#211F1C}`}</style>

      <div className="mx-auto grid min-h-screen max-w-showcase lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="flex flex-col gutter-x py-6 lg:py-10">
          <Link href="/" className="flex items-center gap-2 self-start text-body font-semibold tracking-[-0.02em]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="" className="size-7" />
            CarouseLabs
          </Link>
          <div className="flex flex-1 items-center justify-center py-10">{children}</div>
        </div>

        <div aria-hidden className="hidden items-center py-10 pr-10 lg:flex">
          <ProductFrame label="Example" className="w-full">
            <StudioPreview />
          </ProductFrame>
        </div>
      </div>
    </div>
  )
}
