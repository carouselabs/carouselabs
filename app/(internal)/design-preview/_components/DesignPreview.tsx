"use client"

import * as React from "react"
import { Monitor, Moon, Sun } from "lucide-react"

import { ToastProvider } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"
import { BrandLockup } from "@/components/patterns/BrandMark"
import { PendingTag } from "./Section"
import { Foundations } from "./Foundations"
import { Controls } from "./Controls"
import { Feedback } from "./Feedback"
import { DataAndDomain } from "./DataAndDomain"
import { DirectionsLink } from "./DirectionsLink"
import { Records } from "./Records"

type Mode = "light" | "dark" | "system"

const NAV = [
  ["brand", "Brand"],
  ["color", "Color"],
  ["type", "Type"],
  ["layout", "Layout & motion"],
  ["buttons", "Buttons"],
  ["forms", "Forms"],
  ["feedback", "Feedback"],
  ["overlays", "Overlays"],
  ["navigation", "Navigation"],
  ["data", "Data"],
  ["domain", "Product patterns"],
  ["samples", "Layout directions"],
  ["records", "Records"],
] as const

const DARK_QUERY = "(prefers-color-scheme: dark)"

function subscribeToScheme(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

function useResolvedTheme(mode: Mode) {
  const systemDark = React.useSyncExternalStore(
    subscribeToScheme,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false
  )
  return mode === "system" ? (systemDark ? "dark" : "light") : mode
}

function ThemeSwitch({ mode, onModeChange }: { mode: Mode; onModeChange: (mode: Mode) => void }) {
  const options: { value: Mode; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <Sun aria-hidden /> },
    { value: "dark", label: "Dark", icon: <Moon aria-hidden /> },
    { value: "system", label: "System", icon: <Monitor aria-hidden /> },
  ]
  return (
    <div role="group" aria-label="Theme" className="inline-flex rounded-control bg-surface-muted p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={mode === option.value}
          onClick={() => onModeChange(option.value)}
          className="inline-flex h-9 items-center gap-1.5 rounded-control-sm px-3 text-label font-medium text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-surface-raised aria-pressed:text-foreground aria-pressed:shadow-card [&_svg]:size-4"
        >
          {option.icon}
          <span className="hidden sm:inline">{option.label}</span>
          <span className="sr-only sm:hidden">{option.label}</span>
        </button>
      ))}
    </div>
  )
}

export function DesignPreview({ initialTheme }: { initialTheme: "light" | "dark" }) {
  const [mode, setMode] = React.useState<Mode>(initialTheme)
  const theme = useResolvedTheme(mode)

  return (
    <div data-theme={theme} className="min-h-svh bg-background font-ui text-foreground">
      <ToastProvider>
        <TooltipProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-(--z-toast) focus:rounded-control focus:bg-surface-raised focus:px-4 focus:py-2"
          >
            Skip to content
          </a>
          <header className="sticky top-0 z-(--z-header) border-b border-border bg-background/95 backdrop-blur-sm">
            <div className="mx-auto flex max-w-showcase items-center justify-between gap-4 gutter-x py-3">
              <div className="flex items-center gap-3">
                <BrandLockup className="text-body-lg" markClassName="size-6" />
                <span className="hidden text-label text-muted-foreground md:inline">Design system · Phase 0</span>
              </div>
              <ThemeSwitch mode={mode} onModeChange={setMode} />
            </div>
            <nav aria-label="Preview sections" className="mx-auto max-w-showcase gutter-x">
              <ul className="no-scrollbar -mb-px flex gap-5 overflow-x-auto">
                {NAV.map(([id, label]) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="inline-flex h-10 items-center border-b-2 border-transparent text-label whitespace-nowrap text-muted-foreground transition-colors hover:border-control-border hover:text-foreground"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </header>

          <main id="main" className="mx-auto max-w-showcase gutter-x pb-24">
            <div className="flex flex-col gap-4 py-14">
              <PendingTag>Internal · development only</PendingTag>
              <h1 className="max-w-[48rem] text-display font-semibold text-balance">
                CarouseLabs, <span className="font-display font-normal italic">warm editorial</span>.
              </h1>
              <p className="max-w-[40rem] text-lead text-muted-foreground">
                The Phase 0 design system: tokens, the shared kit in every state, two layout directions to compare,
                and the proposed mark. Live pages are unchanged until each later phase migrates them.
              </p>
            </div>
            <Foundations />
            <Controls />
            <Feedback />
            <DataAndDomain />
            <DirectionsLink />
            <Records />
          </main>
        </TooltipProvider>
      </ToastProvider>
    </div>
  )
}

