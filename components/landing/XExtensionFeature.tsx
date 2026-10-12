import Link from "next/link"
import { ArrowRight, AtSign, Laugh, MessagesSquare, Reply, ShieldCheck, Sparkles } from "lucide-react"
import { AnimatedSection, AnimatedScale } from "@/components/marketing/AnimatedSection"
import { X_EXTENSION_CHECKOUT_PATH, X_EXTENSION_PLAN } from "@/lib/plans"

// CarouseLabs Engage for X on the landing page: its own product, in X's black
// and white, after the LinkedIn extension's section.
const FEATURES = [
  {
    icon: Reply,
    title: "Replies that sound like you",
    text: "Click Reply on any post on X and get a short, natural reply in your own voice — not like AI.",
  },
  {
    icon: MessagesSquare,
    title: "X messages",
    text: "Open a chat on X and it reads the conversation, then writes your next message.",
  },
  {
    icon: Sparkles,
    title: "Pick your style",
    text: "Short & Simple, Natural (with slang), Simple & Detailed, or Funny — or make your own.",
  },
  {
    icon: Laugh,
    title: "Shorter, longer, funnier",
    text: "Not quite right? Rewrite it shorter or longer in one click.",
  },
  {
    icon: AtSign,
    title: "Reads the whole thread",
    text: "It reads the post, the thread above it and any quoted post before it writes.",
  },
  {
    icon: ShieldCheck,
    title: "You stay in control",
    text: "Everything is a draft you can edit. Nothing is ever posted or sent for you.",
  },
]

// A static illustration of the X side panel, in X's black and white.
function XPanelMock() {
  return (
    <div aria-hidden className="w-full max-w-sm mx-auto rounded-2xl border border-[#E5E5E5] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.14)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#EFEFEF]">
        <span className="text-[12px] font-semibold text-[#0A0A0A]">Reply on X</span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white bg-black">Natural (Slang)</span>
      </div>
      <div className="flex flex-col gap-1.5 px-4 py-4 bg-[#FAFAFA]">
        <span className="text-[11px] font-semibold text-[#0A0A0A]">
          Rahul Mehta <span className="font-normal text-[#71717A]">@rahulm</span>
        </span>
        <p className="text-[12.5px] leading-[1.55] text-[#27272A]">
          Took a full week off with no laptop for the first time in 3 years. Came back and nothing broke.
        </p>
      </div>
      <div className="flex flex-col gap-2 px-4 py-4">
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[#A1A1AA]">Your reply</span>
        <p className="rounded-xl border-2 border-black/20 bg-white px-3 py-2.5 text-[12.5px] leading-[1.55] text-[#0A0A0A]">
          a full week with no laptop and nothing broke... honestly, needed to hear this
        </p>
        <div className="flex gap-2">
          <span className="rounded-lg bg-black px-3 py-1.5 text-[11px] font-semibold text-white">Insert</span>
          <span className="rounded-lg border border-[#E5E5E5] px-3 py-1.5 text-[11px] font-semibold text-[#27272A]">Copy</span>
          <span className="rounded-lg border border-[#E5E5E5] px-3 py-1.5 text-[11px] font-semibold text-[#27272A]">Shorter</span>
        </div>
      </div>
    </div>
  )
}

export function XExtensionFeature() {
  return (
    <section id="x-extension" className="py-24 px-6">
      <div className="max-w-5xl mx-auto flex flex-col gap-14">
        <AnimatedSection className="flex flex-col gap-4 text-center items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black text-[12px] font-medium text-white">
            <span className="font-bold">𝕏</span>
            New — CarouseLabs Engage for X
          </div>
          <h2 className="max-w-3xl text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.02em] text-[#0A0A0A] leading-[1.15]">
            Replies and Messages on X — Written in Your Voice
          </h2>
          <p className="max-w-2xl text-[15px] text-[#6B7280] leading-[1.7]">
            A separate Chrome extension for x.com. It writes as many replies and messages as you want, in
            plain, natural English that sounds like you — so you can show up in more conversations without
            spending your whole day on X.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 items-center">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((f, i) => (
              <AnimatedScale
                key={f.title}
                delay={i * 0.06}
                className="flex flex-col items-start gap-3 p-5 rounded-2xl border border-[#E5E3DE] bg-white"
              >
                <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center flex-shrink-0">
                  <f.icon size={18} className="text-white" strokeWidth={1.8} />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-[14px] font-semibold text-[#0A0A0A]">{f.title}</p>
                  <p className="text-[13px] text-[#6B7280] leading-[1.55]">{f.text}</p>
                </div>
              </AnimatedScale>
            ))}
          </div>

          <AnimatedSection delay={0.1}>
            <XPanelMock />
          </AnimatedSection>
        </div>

        <AnimatedSection className="flex flex-col items-center gap-3">
          <Link
            href={X_EXTENSION_CHECKOUT_PATH}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-black hover:bg-[#27272A] text-[15px] font-semibold text-white transition-colors shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
          >
            Get Engage for X — ${X_EXTENSION_PLAN.price}/month
            <ArrowRight size={16} strokeWidth={2.2} />
          </Link>
          <p className="text-[12.5px] text-[#9CA3AF] text-center">
            Unlimited replies and messages. Try {X_EXTENSION_PLAN.freeGenerations} free first — sold separately from
            the LinkedIn extension and the web plans.
          </p>
        </AnimatedSection>
      </div>
    </section>
  )
}
