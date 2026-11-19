"use client"

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { PlatformLogo } from "@/components/brand/PlatformLogo"
import { demoPrompt, demoSlides, demoTones, demoHook } from "./demoContent"

/**
 * One floating piece: the outer layer moves `depth` px with the pointer
 * (the CSS `translate` property), the inner one holds the piece's own
 * offset and turn (`inner`), so the two never overwrite each other.
 */
function Piece({ depth, className, inner, style, children }: { depth: number; className?: string; inner?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div aria-hidden className={cn("depth absolute", className)} style={{ ["--depth" as string]: depth, ...style }}>
      <div className={inner}>{children}</div>
    </div>
  )
}

function Slide({ index, className }: { index: number; className?: string }) {
  const slide = demoSlides[index]
  const cover = index === 0
  return (
    <div
      className={cn(
        "flex aspect-[4/5] flex-col justify-between rounded-[18px] p-4",
        cover ? "bg-[#0B0920] text-white shadow-[0_30px_60px_-24px_rgb(10_0_60/0.8)]" : "border border-[#E5E2F4] bg-white text-[#100C33] shadow-float",
        className
      )}
    >
      <div className={cn("flex justify-between text-[11px]", cover ? "text-white/65" : "text-[#5C5884]")}>
        <span>{slide.kicker}</span>
        <span className="tabular-nums">{index + 1}/8</span>
      </div>
      <p className={cn("font-display leading-[1.02] tracking-[-0.01em]", cover ? "text-[26px]" : "text-[17px]")}>{slide.title}</p>
      <span className={cn("text-[11px]", cover ? "text-white/65" : "text-[#5C5884]")}>{cover ? "Swipe →" : " "}</span>
    </div>
  )
}

/**
 * The hero's picture: a dotted lavender stage with the product's own pieces
 * floating on it (a carousel, a caption with its tone, the idea prompt, a
 * scheduled post), after anantgoyal.in's hero stage. The pieces follow the
 * pointer a little on a desktop; they rest under reduced motion, on touch,
 * and when the nav's pause button is on. Every word is example content
 * from demoContent.ts.
 */
export function HeroStage() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
    const fine = window.matchMedia("(pointer: fine)")
    let frame = 0
    const onMove = (event: PointerEvent) => {
      if (reduce.matches || !fine.matches || document.documentElement.getAttribute("data-motion") === "paused") return
      const r = el.getBoundingClientRect()
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        el.style.setProperty("--px", ((event.clientX - r.left) / r.width - 0.5).toFixed(3))
        el.style.setProperty("--py", ((event.clientY - r.top) / r.height - 0.5).toFixed(3))
      })
    }
    const reset = () => {
      cancelAnimationFrame(frame)
      el.style.setProperty("--px", "0")
      el.style.setProperty("--py", "0")
    }
    const host = el.closest("section") ?? el
    host.addEventListener("pointermove", onMove as EventListener)
    host.addEventListener("pointerleave", reset)
    return () => {
      cancelAnimationFrame(frame)
      host.removeEventListener("pointermove", onMove as EventListener)
      host.removeEventListener("pointerleave", reset)
    }
  }, [])

  return (
    <div ref={ref} data-enter-stage style={{ ["--d" as string]: "260ms" }} className="relative min-h-[440px] sm:min-h-[520px] lg:h-full lg:min-h-0">
      <div aria-hidden className="absolute inset-0 overflow-hidden rounded-[22px] bg-[linear-gradient(150deg,#EEF1FF_0%,#F1EBFF_55%,#FBEFFF_100%)] sm:rounded-[30px]">
        <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(rgb(75_48_238/0.14)_1px,transparent_1.2px)] [background-size:22px_22px]" />
      </div>

      <Piece depth={10} className="top-[5%] right-[5%] hidden size-[112px] sm:block lg:size-[128px]">
        {/* .torus is position: absolute; this piece gives it its box. */}
        <span className="torus inset-0" />
      </Piece>

      {/* The carousel: the cover in front, two slides fanned behind it. */}
      <Piece depth={8} className="top-[16%] left-[50%] w-[34%] max-w-[180px] sm:top-[17%]" inner="-translate-x-[128%] translate-y-8">
        <Slide index={1} />
      </Piece>
      <Piece depth={8} className="top-[16%] left-[50%] w-[34%] max-w-[180px] sm:top-[17%]" inner="translate-x-[28%] translate-y-8">
        <Slide index={2} />
      </Piece>
      <Piece depth={12} className="top-[10%] left-[50%] w-[44%] max-w-[236px] sm:top-[11%]" inner="-translate-x-1/2">
        <div className="float" style={{ ["--dur" as string]: "8s", ["--float" as string]: "-8px" }}>
          <Slide index={0} />
        </div>
      </Piece>

      {/* The idea prompt */}
      <Piece depth={22} className="top-[6%] left-[4%] hidden w-[min(270px,46%)] sm:block">
        <div className="float flex items-center gap-2 rounded-2xl bg-white/90 p-2 pl-3.5 shadow-float ring-1 ring-[#100C33]/5 backdrop-blur-md" style={{ ["--dur" as string]: "7s", ["--delay" as string]: "-2s" }}>
          <span className="min-w-0 flex-1 truncate text-[12px] text-[#5C5884]">{demoPrompt}</span>
          <span className="rounded-full bg-[#100C33] px-3 py-1.5 text-[11px] font-medium text-white">Generate</span>
        </div>
      </Piece>

      {/* The caption, with its tone picked */}
      <Piece depth={18} className="bottom-[6%] left-[3%] w-[min(300px,62%)] sm:bottom-[8%] sm:left-[4%]">
        <div className="float rounded-2xl bg-white p-3.5 shadow-float ring-1 ring-[#100C33]/5" style={{ ["--dur" as string]: "8.5s", ["--delay" as string]: "-1s" }}>
          <div className="flex flex-wrap gap-1">
            {demoTones.slice(0, 3).map((tone) => (
              <span
                key={tone}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10.5px] font-medium",
                  tone === "Candid" ? "bg-[#EFEAFF] text-[#4B30EE]" : "text-[#5C5884] ring-1 ring-[#E5E2F4]"
                )}
              >
                {tone}
              </span>
            ))}
          </div>
          <p className="mt-2.5 text-[13px] leading-[1.35] font-semibold tracking-[-0.01em] text-[#100C33]">{demoHook}</p>
        </div>
      </Piece>

      {/* A scheduled post, on night, the live mark in lime */}
      <Piece depth={28} className="top-[40%] right-[3%] hidden w-[220px] sm:block">
        <div className="float ground-night rounded-2xl p-3.5 shadow-[0_24px_44px_-18px_rgb(10_0_60/0.85)]" style={{ ["--dur" as string]: "9s", ["--delay" as string]: "-4s" }}>
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-white/70">Content Hub · Tue 14</span>
            <span className="live-dot size-1.5 rounded-full bg-[#22C55E]" />
          </div>
          <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-white/[0.07] p-2">
            <span className="lime-mark rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums">9:00</span>
            <span className="truncate text-[12px] text-white">{demoSlides[0].title}</span>
          </div>
        </div>
      </Piece>

      {/* Ready for each platform */}
      <Piece depth={20} className="right-[4%] bottom-[6%] hidden w-[min(200px,40%)] sm:bottom-[8%] sm:block">
        <div className="float rounded-2xl bg-white p-3.5 shadow-float ring-1 ring-[#100C33]/5" style={{ ["--dur" as string]: "7.5s", ["--delay" as string]: "-3s" }}>
          <div className="text-[11px] font-medium text-[#5C5884]">Ready for</div>
          <ul className="mt-2 space-y-1.5">
            {(["linkedin", "instagram", "x"] as const).map((p) => (
              <li key={p} className="flex items-center justify-between text-[12px] font-medium text-[#100C33]">
                <span className="flex items-center gap-2">
                  <PlatformLogo platform={p} size={14} />
                  {p === "linkedin" ? "LinkedIn" : p === "instagram" ? "Instagram" : "Twitter/X"}
                </span>
                <span className="grid size-4 place-items-center rounded-full bg-[#22C55E] text-white">
                  <Check aria-hidden className="size-2.5" strokeWidth={3.5} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Piece>

      <Piece depth={34} className="top-[30%] left-[9%] hidden sm:block">
        <div className="float" style={{ ["--dur" as string]: "6s", ["--delay" as string]: "-3s" }}>
          <span className="orb orb-pearl relative block size-14" />
        </div>
      </Piece>
      <Piece depth={26} className="bottom-[26%] left-[44%] hidden sm:block">
        <div className="drift" style={{ ["--dur" as string]: "12s" }}>
          <span className="orb orb-violet relative block size-24" />
        </div>
      </Piece>
      <Piece depth={40} className="top-[4%] left-[58%]">
        <span className="orb orb-lime relative block size-6" />
      </Piece>
      <Piece depth={18} className="top-[25%] right-[8%]">
        <div className="float" style={{ ["--dur" as string]: "10s", ["--delay" as string]: "-5s" }}>
          <span className="orb orb-blue relative block size-14" />
        </div>
      </Piece>

      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/85 px-2.5 py-0.5 text-[11px] font-medium text-[#5C5884] sm:bottom-4">
        Example
      </span>
    </div>
  )
}
