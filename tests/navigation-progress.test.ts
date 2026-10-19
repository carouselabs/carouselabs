// The top progress bar (components/shell/NavigationProgress.tsx): it stays
// hidden for clicks that land quickly, shows when a click is still waiting,
// fills and fades when the new page lands, and never runs for the current
// page or another site.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const load = () => import("@/components/shell/NavigationProgress")

describe("navigation progress bar", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    vi.stubGlobal("window", { location: new URL("https://carouselabs.com/dashboard") })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("stays hidden when the page lands within 150 ms", async () => {
    const bar = await load()
    bar.startNavigation("/settings/profile")
    vi.advanceTimersByTime(100)
    expect(bar.getNavigationPhase()).toBe("idle")
    bar.finishNavigation()
    vi.advanceTimersByTime(1000)
    expect(bar.getNavigationPhase()).toBe("idle")
  })

  it("shows while a click is waiting, then fills and fades when the page lands", async () => {
    const bar = await load()
    bar.startNavigation("/settings/profile")
    vi.advanceTimersByTime(149)
    expect(bar.getNavigationPhase()).toBe("idle")
    vi.advanceTimersByTime(1)
    expect(bar.getNavigationPhase()).toBe("loading")
    bar.finishNavigation()
    expect(bar.getNavigationPhase()).toBe("done")
    vi.advanceTimersByTime(400)
    expect(bar.getNavigationPhase()).toBe("idle")
  })

  it("does nothing for the page you're on or for another site", async () => {
    const bar = await load()
    bar.startNavigation("/dashboard")
    bar.startNavigation("/dashboard?tab=ideas")
    bar.startNavigation("https://www.linkedin.com/feed/")
    vi.advanceTimersByTime(500)
    expect(bar.getNavigationPhase()).toBe("idle")
  })

  it("gives up after 15 seconds if the page never lands", async () => {
    const bar = await load()
    bar.startNavigation("/content-hub")
    vi.advanceTimersByTime(200)
    expect(bar.getNavigationPhase()).toBe("loading")
    vi.advanceTimersByTime(15_000)
    vi.advanceTimersByTime(400)
    expect(bar.getNavigationPhase()).toBe("idle")
  })

  it("a second click during the fade brings the bar back", async () => {
    const bar = await load()
    bar.startNavigation("/history")
    vi.advanceTimersByTime(200)
    bar.finishNavigation()
    expect(bar.getNavigationPhase()).toBe("done")
    bar.startNavigation("/pinned")
    vi.advanceTimersByTime(200)
    expect(bar.getNavigationPhase()).toBe("loading")
    // The first click's fade must not hide the bar while the second still waits.
    vi.advanceTimersByTime(1000)
    expect(bar.getNavigationPhase()).toBe("loading")
  })
})
