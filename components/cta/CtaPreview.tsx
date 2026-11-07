// What's on a CTA, shown like the closing slide it becomes. The AI draws the
// real one in each post's own colours and fonts; this shows the words and
// photo it uses.
import { UserRound } from "lucide-react"
import { cn } from "@/lib/utils"

export function CtaPreview({
  photoUrl,
  name,
  headline,
  line,
  extra,
  className,
}: {
  photoUrl: string | null
  name: string
  headline?: string | null
  line: string
  extra?: string | null
  className?: string
}) {
  return (
    <div
      className={cn("flex aspect-[4/5] w-full max-w-[16rem] flex-col justify-center gap-4 rounded-card bg-[#0F2B4C] p-6 text-white shadow-card", className)}
      aria-label="Preview of your CTA"
    >
      <span className="flex size-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white/15">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- the creator's own uploaded photo
          <img src={photoUrl} alt="" className="size-full object-cover" />
        ) : (
          <UserRound className="size-8 text-white/80" aria-hidden />
        )}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-body font-semibold leading-tight">{name || "Your name"}</span>
        {headline && <span className="text-caption leading-snug text-white/75">{headline}</span>}
      </span>
      <span className="text-body-lg leading-snug font-semibold [overflow-wrap:anywhere]">{line || "Your CTA line"}</span>
      {extra && <span className="w-fit rounded-full bg-[#FFD23F] px-3 py-1 text-caption font-semibold text-[#0F2B4C] [overflow-wrap:anywhere]">{extra}</span>}
    </div>
  )
}
