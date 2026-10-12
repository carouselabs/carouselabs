"use client"

import * as React from "react"
import Link from "next/link"
import { Monitor, Moon, Smartphone, Sun } from "lucide-react"

import { ToastProvider } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { DestinationId } from "./nav"

export type Screen = "landing" | "generate" | "create" | `stub:${DestinationId}`
export type Device = "desktop" | "mobile"
export type Direction = "a" | "b"

type FrameContextValue = {
  device: Device
  screen: Screen
  go: (screen: Screen) => void
  /** Overlays (sheets, palettes) portal here so they stay inside the phone frame. */
  container: HTMLElement | null
}

const FrameContext = React.createContext<FrameContextValue | null>(null)

export function useFrame() {
  const ctx = React.useContext(FrameContext)
  if (!ctx) throw new Error("useFrame outside Frame")
  return ctx
}

const DIRECTION_NAMES: Record<Direction, { name: string; idea: string }> = {
  a: { name: "A · Studio desk", idea: "Activity top bar, document canvas, side panels" },
  b: { name: "B · Focus flow", idea: "One thing at a time, dock and command bar, split write/preview" },
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string; icon?: React.ReactNode }[]
  onChange: (value: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-control-sm bg-[#2b2925] p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className="inline-flex h-7 items-center gap-1.5 rounded-[6px] px-2.5 text-caption font-medium text-[#b9b2a6] transition-colors hover:text-white aria-pressed:bg-[#47433c] aria-pressed:text-white [&_svg]:size-3.5"
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** The review bar is tooling, not part of either design: deliberately plain and dark. */
function ReviewBar({
  direction,
  screen,
  device,
  theme,
  onScreen,
  onDevice,
  onTheme,
}: {
  direction: Direction
  screen: Screen
  device: Device
  theme: "light" | "dark"
  onScreen: (s: Screen) => void
  onDevice: (d: Device) => void
  onTheme: (t: "light" | "dark") => void
}) {
  const other: Direction = direction === "a" ? "b" : "a"
  const base = screen.startsWith("stub:") ? "generate" : screen
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-[#1d1c1a] px-4 py-2 text-[#e9e4da]">
      <Link href="/design-preview/directions" className="text-caption font-semibold text-white underline-offset-4 hover:underline">
        Layout directions
      </Link>
      <span className="text-caption text-[#b9b2a6]">
        <strong className="font-semibold text-white">{DIRECTION_NAMES[direction].name}</strong> — {DIRECTION_NAMES[direction].idea}
      </span>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Segmented
          label="Screen"
          value={base as "landing" | "generate" | "create"}
          onChange={onScreen}
          options={[
            { value: "landing", label: "Landing" },
            { value: "generate", label: "Generate" },
            { value: "create", label: "Create" },
          ]}
        />
        <Segmented
          label="Device"
          value={device}
          onChange={onDevice}
          options={[
            { value: "desktop", label: "Desktop", icon: <Monitor aria-hidden /> },
            { value: "mobile", label: "Mobile", icon: <Smartphone aria-hidden /> },
          ]}
        />
        <Segmented
          label="Theme"
          value={theme}
          onChange={onTheme}
          options={[
            { value: "light", label: "Light", icon: <Sun aria-hidden /> },
            { value: "dark", label: "Dark", icon: <Moon aria-hidden /> },
          ]}
        />
        <Link
          href={`/design-preview/directions/${other}?screen=${base}&device=${device}&theme=${theme}`}
          className="inline-flex h-8 items-center rounded-control-sm bg-[#F5F0E7] px-3 text-caption font-semibold text-[#211F1C] hover:bg-white"
        >
          Same screen in {other.toUpperCase()} →
        </Link>
      </div>
    </div>
  )
}

export function Frame({
  direction,
  initialScreen,
  initialDevice,
  initialTheme,
  children,
}: {
  direction: Direction
  initialScreen: Screen
  initialDevice: Device
  initialTheme: "light" | "dark"
  children: (screen: Screen) => React.ReactNode
}) {
  const [screen, setScreen] = React.useState<Screen>(initialScreen)
  const [device, setDevice] = React.useState<Device>(initialDevice)
  const [theme, setTheme] = React.useState<"light" | "dark">(initialTheme)
  const [container, setContainer] = React.useState<HTMLElement | null>(null)
  const scrollerRef = React.useRef<HTMLDivElement>(null)

  // Keep the URL shareable without a navigation.
  React.useEffect(() => {
    const url = `/design-preview/directions/${direction}?screen=${encodeURIComponent(screen)}&device=${device}&theme=${theme}`
    window.history.replaceState(null, "", url)
  }, [direction, screen, device, theme])

  const go = React.useCallback((next: Screen) => {
    setScreen(next)
    scrollerRef.current?.scrollTo({ top: 0 })
    if (device === "desktop") window.scrollTo({ top: 0 })
  }, [device])

  const value = React.useMemo(() => ({ device, screen, go, container }), [device, screen, go, container])

  return (
    <div data-theme={theme} className="min-h-svh bg-[#111110] font-ui text-foreground">
      <ReviewBar
        direction={direction}
        screen={screen}
        device={device}
        theme={theme}
        onScreen={go}
        onDevice={setDevice}
        onTheme={setTheme}
      />
      <FrameContext.Provider value={value}>
        <ToastProvider>
          <TooltipProvider>
            {device === "desktop" ? (
              <div ref={setContainer} className="@container/app relative flex min-h-[calc(100svh-48px)] flex-col bg-background">
                {children(screen)}
              </div>
            ) : (
              <div className="flex justify-center px-4 py-8">
                <div
                  ref={setContainer}
                  className="@container/app relative h-[844px] w-[390px] shrink-0 overflow-hidden rounded-[48px] border-[10px] border-[#2b2925] bg-background shadow-dialog [transform:translateZ(0)]"
                >
                  <div ref={scrollerRef} className="flex h-full flex-col overflow-y-auto overscroll-contain">
                    {children(screen)}
                  </div>
                </div>
              </div>
            )}
          </TooltipProvider>
        </ToastProvider>
      </FrameContext.Provider>
    </div>
  )
}
