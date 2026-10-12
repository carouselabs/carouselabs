"use client"

import type { LucideIcon } from "lucide-react"
import {
  Sparkles,
  Rocket,
  Target,
  Settings,
  User,
  Sliders,
  Image as ImageIcon,
  Wand2,
  Palette,
  LayoutGrid,
  Images,
  PenLine,
  Quote,
  Type,
  Lightbulb,
  Zap,
  Clock,
  History,
  Bookmark,
  Star,
} from "lucide-react"

type Tint = "purple" | "green" | "blue" | "amber" | "pink"

const TINTS: Record<Tint, { bg: string; bd: string; fg: string }> = {
  purple: { bg: "#EDE9FE", bd: "rgba(124,58,237,0.22)", fg: "#7C3AED" },
  green: { bg: "#DCFCE7", bd: "rgba(16,185,129,0.3)", fg: "#059669" },
  blue: { bg: "#DBEAFE", bd: "rgba(59,130,246,0.3)", fg: "#2563EB" },
  amber: { bg: "#FEF3C7", bd: "rgba(217,119,6,0.3)", fg: "#D97706" },
  pink: { bg: "#FCE7F3", bd: "rgba(219,39,119,0.3)", fg: "#DB2777" },
}

type Item =
  | { kind: "circle"; icon: LucideIcon; tint: Tint }
  | { kind: "emoji"; char: string }
  | { kind: "pill"; text: string }

const VARIANTS: Record<string, Item[]> = {
  onboarding: [
    { kind: "circle", icon: Sparkles, tint: "purple" },
    { kind: "circle", icon: Target, tint: "green" },
    { kind: "circle", icon: Rocket, tint: "blue" },
    { kind: "circle", icon: Lightbulb, tint: "amber" },
    { kind: "circle", icon: Star, tint: "pink" },
    { kind: "circle", icon: Zap, tint: "blue" },
    { kind: "circle", icon: Sparkles, tint: "green" },
    { kind: "pill", text: "Let's set you up ✨" },
    { kind: "pill", text: "Almost there" },
    { kind: "pill", text: "Tell us about you" },
    { kind: "emoji", char: "👋" },
    { kind: "emoji", char: "🎯" },
    { kind: "emoji", char: "🚀" },
    { kind: "emoji", char: "🎨" },
    { kind: "emoji", char: "✨" },
    { kind: "emoji", char: "💡" },
  ],
  settings: [
    { kind: "circle", icon: Settings, tint: "purple" },
    { kind: "pill", text: "Your space ⚙️" },
    { kind: "emoji", char: "🎨" },
    { kind: "circle", icon: Sliders, tint: "blue" },
    { kind: "circle", icon: User, tint: "green" },
    { kind: "emoji", char: "✨" },
    { kind: "pill", text: "Make it yours" },
    { kind: "emoji", char: "🛠️" },
  ],
  image: [
    { kind: "circle", icon: ImageIcon, tint: "purple" },
    { kind: "pill", text: "AI visuals 🎨" },
    { kind: "emoji", char: "🖼️" },
    { kind: "circle", icon: Wand2, tint: "pink" },
    { kind: "circle", icon: Palette, tint: "amber" },
    { kind: "emoji", char: "✨" },
    { kind: "pill", text: "Scroll-stopping" },
    { kind: "emoji", char: "🌈" },
  ],
  carousel: [
    { kind: "circle", icon: LayoutGrid, tint: "blue" },
    { kind: "pill", text: "Swipe-worthy" },
    { kind: "emoji", char: "🎠" },
    { kind: "circle", icon: Images, tint: "purple" },
    { kind: "circle", icon: Sparkles, tint: "green" },
    { kind: "emoji", char: "📊" },
    { kind: "pill", text: "Slide by slide" },
    { kind: "emoji", char: "✨" },
  ],
  caption: [
    { kind: "circle", icon: PenLine, tint: "purple" },
    { kind: "pill", text: "In your voice ✍️" },
    { kind: "emoji", char: "💬" },
    { kind: "circle", icon: Quote, tint: "green" },
    { kind: "circle", icon: Type, tint: "blue" },
    { kind: "emoji", char: "✨" },
    { kind: "pill", text: "Hook 'em" },
    { kind: "emoji", char: "🪝" },
  ],
  idea: [
    { kind: "circle", icon: Lightbulb, tint: "amber" },
    { kind: "pill", text: "Fresh ideas ✨" },
    { kind: "emoji", char: "💡" },
    { kind: "circle", icon: Sparkles, tint: "purple" },
    { kind: "circle", icon: Zap, tint: "blue" },
    { kind: "emoji", char: "⚡" },
    { kind: "pill", text: "What's next?" },
    { kind: "emoji", char: "🔥" },
  ],
  history: [
    { kind: "circle", icon: Clock, tint: "blue" },
    { kind: "pill", text: "Your journey" },
    { kind: "emoji", char: "🕘" },
    { kind: "circle", icon: History, tint: "purple" },
    { kind: "circle", icon: Sparkles, tint: "green" },
    { kind: "emoji", char: "📜" },
    { kind: "pill", text: "Look back" },
    { kind: "emoji", char: "✨" },
  ],
  pinned: [
    { kind: "circle", icon: Bookmark, tint: "purple" },
    { kind: "pill", text: "Saved gems" },
    { kind: "emoji", char: "📌" },
    { kind: "circle", icon: Star, tint: "amber" },
    { kind: "circle", icon: Sparkles, tint: "pink" },
    { kind: "emoji", char: "⭐" },
    { kind: "pill", text: "Your favorites" },
    { kind: "emoji", char: "✨" },
  ],
  generic: [
    { kind: "circle", icon: Sparkles, tint: "purple" },
    { kind: "emoji", char: "✨" },
    { kind: "circle", icon: Star, tint: "amber" },
    { kind: "pill", text: "CarouseLabs" },
    { kind: "circle", icon: Lightbulb, tint: "blue" },
    { kind: "emoji", char: "💡" },
  ],
}

// Edge positions (margins) reused across variants, cycled by index.
const POSITIONS = [
  "top-[12%] left-[4%]",
  "top-[30%] left-[7%]",
  "top-[56%] left-[3%]",
  "bottom-[15%] left-[6%]",
  "top-[14%] right-[5%]",
  "top-[40%] right-[8%]",
  "top-[62%] right-[4%]",
  "bottom-[16%] right-[7%]",
]
const DELAYS = ["0s", "0.6s", "1.1s", "0.3s", "0.9s", "1.4s", "0.5s", "1.2s"]

// Onboarding has a small centered card, so stickers can spread in every
// direction — top, bottom, both sides, and the corners.
const ONBOARDING_POSITIONS = [
  // left side
  "top-[14%] left-[6%]",
  "top-[34%] left-[10%]",
  "top-[55%] left-[5%]",
  "top-[74%] left-[11%]",
  "bottom-[10%] left-[16%]",
  // right side
  "top-[14%] right-[6%]",
  "top-[34%] right-[10%]",
  "top-[55%] right-[5%]",
  "top-[74%] right-[11%]",
  "bottom-[10%] right-[16%]",
  // top (above the card)
  "top-[8%] left-[30%]",
  "top-[7%] right-[30%]",
  // bottom (below the card)
  "bottom-[7%] left-[36%]",
  "bottom-[8%] right-[36%]",
  // outer corners
  "top-[20%] left-[2%]",
  "bottom-[22%] right-[2%]",
]

const circleCls =
  "w-11 h-11 rounded-full border flex items-center justify-center shadow-[0_6px_18px_rgba(10,10,10,0.05)]"
const pillCls =
  "px-3 py-2 rounded-xl bg-[#FFFDF8] border border-[#E5E3DE] shadow-[0_8px_24px_rgba(10,10,10,0.05)] text-[12px] font-semibold text-[#0A0A0A] whitespace-nowrap"
const emojiCls =
  "w-11 h-11 rounded-2xl bg-[#FFFDF8] border border-[#E5E3DE] shadow-[0_8px_24px_rgba(10,10,10,0.05)] text-[20px] leading-none flex items-center justify-center"

export function Stickers({
  variant = "generic",
  containerClassName = "absolute inset-0 z-0 pointer-events-none overflow-hidden hidden xl:block",
}: {
  variant?: string
  containerClassName?: string
}) {
  const items = VARIANTS[variant] ?? VARIANTS.generic
  const positions = variant === "onboarding" ? ONBOARDING_POSITIONS : POSITIONS

  return (
    <div aria-hidden className={containerClassName}>
      {items.map((it, i) => {
        const pos = positions[i % positions.length]
        const anim = { animation: `float 4s ease-in-out infinite ${DELAYS[i % DELAYS.length]}` }

        if (it.kind === "circle") {
          const t = TINTS[it.tint]
          const Icon = it.icon
          return (
            <div
              key={i}
              style={{ ...anim, background: t.bg, borderColor: t.bd }}
              className={`absolute ${pos} ${circleCls}`}
            >
              <Icon size={18} strokeWidth={2} style={{ color: t.fg }} />
            </div>
          )
        }
        if (it.kind === "emoji") {
          return (
            <div key={i} style={anim} className={`absolute ${pos} ${emojiCls}`}>
              {it.char}
            </div>
          )
        }
        return (
          <div key={i} style={anim} className={`absolute ${pos} ${pillCls}`}>
            {it.text}
          </div>
        )
      })}
    </div>
  )
}
