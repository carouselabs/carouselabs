import {
  Sparkles,
  Image as ImageIcon,
  LayoutGrid,
  PenLine,
  Newspaper,
  Zap,
} from "lucide-react"

type StickerProps = {
  className: string
  delay: string
  children: React.ReactNode
}

function Sticker({ className, delay, children }: StickerProps) {
  return (
    <div
      style={{ animation: `float 4s ease-in-out infinite ${delay}` }}
      className={`absolute hidden lg:flex items-center justify-center ${className}`}
    >
      {children}
    </div>
  )
}

const circle =
  "w-12 h-12 rounded-full border flex items-center justify-center shadow-[0_6px_18px_rgba(10,10,10,0.06)]"
const pill =
  "px-3 py-2 rounded-xl bg-[#FFFDF8] border border-[#E5E3DE] shadow-[0_8px_24px_rgba(10,10,10,0.07)] text-[12px] font-semibold text-[#0A0A0A] whitespace-nowrap"
const emoji =
  "w-12 h-12 rounded-2xl bg-[#FFFDF8] border border-[#E5E3DE] shadow-[0_8px_24px_rgba(10,10,10,0.07)] text-[22px] leading-none"

export function AuthStickers() {
  return (
    <div aria-hidden className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {/* ── Left side ── */}
      <Sticker className={`top-[12%] left-[8%] ${circle} bg-[#EDE9FE] border-[rgba(124,58,237,0.25)]`} delay="0s">
        <Sparkles size={20} className="text-[#7C3AED]" strokeWidth={2} />
      </Sticker>
      <Sticker className={`top-[22%] left-[19%] ${pill}`} delay="0.6s">
        AI Ideas ✨
      </Sticker>
      <Sticker className={`top-[40%] left-[6%] ${circle} bg-[#DBEAFE] border-[rgba(59,130,246,0.3)]`} delay="1.2s">
        <LayoutGrid size={20} className="text-[#2563EB]" strokeWidth={2} />
      </Sticker>
      <Sticker className={`top-[55%] left-[16%] ${pill}`} delay="0.4s">
        #viral
      </Sticker>
      <Sticker className={`bottom-[26%] left-[5%] ${pill}`} delay="0.9s">
        Carousel ready
      </Sticker>
      <Sticker className={`bottom-[14%] left-[10%] ${circle} bg-[#FEF3C7] border-[rgba(217,119,6,0.3)]`} delay="1.5s">
        <PenLine size={20} className="text-[#D97706]" strokeWidth={2} />
      </Sticker>
      <Sticker className={`bottom-[8%] left-[22%] ${emoji} flex items-center justify-center`} delay="0.2s">
        🚀
      </Sticker>
      <Sticker className={`top-[33%] left-[25%] ${emoji} flex items-center justify-center`} delay="1.7s">
        💡
      </Sticker>

      {/* ── Right side ── */}
      <Sticker className={`top-[10%] right-[9%] ${circle} bg-[#DCFCE7] border-[rgba(16,185,129,0.3)]`} delay="0.3s">
        <ImageIcon size={20} className="text-[#059669]" strokeWidth={2} />
      </Sticker>
      <Sticker className={`top-[21%] right-[18%] ${pill}`} delay="0.9s">
        Caption ✓
      </Sticker>
      <Sticker className={`top-[42%] right-[6%] ${circle} bg-[#FCE7F3] border-[rgba(219,39,119,0.3)]`} delay="1s">
        <Newspaper size={20} className="text-[#DB2777]" strokeWidth={2} />
      </Sticker>
      <Sticker className={`top-[57%] right-[16%] ${pill}`} delay="0.5s">
        10 ideas · 30s
      </Sticker>
      <Sticker className={`bottom-[27%] right-[6%] ${pill}`} delay="1.3s">
        Posted ✓
      </Sticker>
      <Sticker className={`bottom-[14%] right-[11%] ${circle} bg-[#EDE9FE] border-[rgba(124,58,237,0.25)]`} delay="0.7s">
        <Zap size={20} className="text-[#7C3AED]" strokeWidth={2} fill="#7C3AED" />
      </Sticker>
      <Sticker className={`bottom-[8%] right-[22%] ${emoji} flex items-center justify-center`} delay="1.1s">
        ✨
      </Sticker>
      <Sticker className={`top-[31%] right-[25%] ${emoji} flex items-center justify-center`} delay="0.5s">
        🔥
      </Sticker>
    </div>
  )
}
