"use client"

// A grid of small dots in the brand violet that move aside from the pointer,
// filling its box: the background of the "generating" screens
// (GeneratingPanel). On its own, an invisible pointer drifts in a slow loop so
// the field keeps moving; once the real pointer is over it, the dots follow
// that instead (within 120px a dot is pushed away by up to 22px, more the
// closer it is), and when the pointer leaves, the drift takes over again.
// With reduced motion it's drawn once, still. Colours come from the site's
// theme, light or dark.
// Based on the "Repel Field" effect from VibeFX (single-user commercial licence).
import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

const GAP = 28
const DOT = 2.2
const RADIUS = 120
const PUSH = 22
// The dots sit back a little so the words on top stay first.
const DOT_ALPHA = 0.55
const FALLBACK_DOT = "#6D28D9"

export function RepelField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let width = 0
    let height = 0
    let frame = 0
    let frames = 0
    // The dot colour: the brand colour of the current theme (the canvas's own text colour).
    let color = FALLBACK_DOT
    // Where the real pointer is over the field, or null to drift on its own.
    let pointer: { x: number; y: number } | null = null

    const readColor = () => {
      color = getComputedStyle(canvas).color || FALLBACK_DOT
    }

    function draw(now: number) {
      const at = pointer ?? (reduce ? null : { x: width * (0.5 + Math.cos(now / 700) * 0.28), y: height * (0.5 + Math.sin(now / 900) * 0.2) })
      ctx!.clearRect(0, 0, width, height)
      ctx!.globalAlpha = DOT_ALPHA
      ctx!.fillStyle = color
      // The grid centred in the box, so its edges look even.
      const startX = ((width % GAP) + GAP) / 2
      const startY = ((height % GAP) + GAP) / 2
      for (let y = startY; y < height; y += GAP) {
        for (let x = startX; x < width; x += GAP) {
          let px = x
          let py = y
          if (at) {
            const dx = x - at.x
            const dy = y - at.y
            const dist = Math.hypot(dx, dy) || 1
            if (dist < RADIUS) {
              const push = (1 - dist / RADIUS) * PUSH
              px += (dx / dist) * push
              py += (dy / dist) * push
            }
          }
          ctx!.beginPath()
          ctx!.arc(px, py, DOT, 0, Math.PI * 2)
          ctx!.fill()
        }
      }
      ctx!.globalAlpha = 1
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      width = rect.width
      height = rect.height
      canvas!.width = Math.max(1, Math.round(width * dpr))
      canvas!.height = Math.max(1, Math.round(height * dpr))
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      readColor()
      if (reduce) draw(0)
    }

    function onMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      // Near the field counts too, so dots at its edge react as the pointer arrives.
      const near = x > -RADIUS && y > -RADIUS && x < width + RADIUS && y < height + RADIUS
      pointer = near ? { x, y } : null
      if (reduce) draw(0)
    }

    // The pointer left the page, or a finger lifted: back to drifting.
    function release() {
      pointer = null
      if (reduce) draw(0)
    }
    function onOut(e: PointerEvent) {
      if (!e.relatedTarget) release()
    }
    function onUp(e: PointerEvent) {
      if (e.pointerType !== "mouse") release()
    }

    function loop(now: number) {
      // The theme can change while it's showing; its colour is read again now and then.
      if (++frames % 30 === 0) readColor()
      draw(now)
      frame = requestAnimationFrame(loop)
    }

    resize()
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null
    observer?.observe(canvas)
    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("pointerout", onOut)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", release)
    window.addEventListener("blur", release)
    if (!reduce) frame = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerout", onOut)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", release)
      window.removeEventListener("blur", release)
    }
  }, [])

  return <canvas ref={ref} aria-hidden className={cn("pointer-events-none absolute inset-0 size-full text-brand", className)} />
}

/**
 * The "generating" screen: the dot field in the site's colours, with what's
 * happening (and an optional note) in the middle, readable over the dots.
 */
export function GeneratingPanel({ title, note, className }: { title: React.ReactNode; note?: React.ReactNode; className?: string }) {
  return (
    <div
      role="status"
      className={cn("relative isolate flex flex-col items-center justify-center gap-3 overflow-hidden rounded-card border border-border bg-surface-muted px-6 text-center", className)}
    >
      <RepelField />
      {/* A soft pool of the panel's own colour behind the words, so the dots never fight them. */}
      <span aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 h-40 w-[min(26rem,90%)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,var(--surface-muted),transparent)]" />
      <span aria-hidden className="relative size-8 animate-spin rounded-full border-2 border-brand/25 border-t-brand motion-reduce:animate-none" />
      <p className="relative text-label font-medium text-foreground">{title}</p>
      {note && <p className="relative text-caption text-muted-foreground">{note}</p>}
    </div>
  )
}
