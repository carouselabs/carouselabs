import Link from "next/link"
import { ArrowRight, MessageSquare, MessagesSquare, Puzzle, Reply, ShieldCheck, Target, UserPlus } from "lucide-react"
import { AnimatedSection, AnimatedScale } from "@/components/marketing/AnimatedSection"
import { EXTENSION_CHECKOUT_PATH, EXTENSION_PLAN } from "@/lib/plans"

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Comments in your voice",
    text: "Click Comment on any LinkedIn post and get a specific, human comment that sounds like you — not like AI.",
  },
  {
    icon: Reply,
    title: "Replies with context",
    text: "Reply to a comment and the extension reads the whole thread first, so your answer actually fits the conversation.",
  },
  {
    icon: MessagesSquare,
    title: "Conversation Assistant",
    text: "Open a LinkedIn chat and it reads the messages, then writes your next one — the reply that keeps it going.",
  },
  {
    icon: Target,
    title: "Turn chats into leads",
    text: "Reconnect, follow up, and move a conversation toward a call without sounding pushy.",
  },
  {
    icon: UserPlus,
    title: "Connection notes",
    text: "Short, personal invitation notes written from their profile — the kind people actually accept.",
  },
  {
    icon: ShieldCheck,
    title: "You stay in control",
    text: "Everything is a draft you can edit. Nothing is ever posted or sent for you.",
  },
]

// A static illustration of the side panel — markup, not a screenshot, so it
// stays sharp and never goes stale against the real UI's copy.
function PanelMock() {
  return (
    <div aria-hidden className="w-full max-w-sm mx-auto rounded-2xl border border-[#E5E3DE] bg-white shadow-[0_20px_60px_rgba(124,58,237,0.14)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0EEE8]">
        <span className="text-[12px] font-semibold text-[#0A0A0A]">Conversation Assistant</span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-[#7C3AED] bg-[rgba(124,58,237,0.08)]">
          Unlimited
        </span>
      </div>
      <div className="flex flex-col gap-2 px-4 py-4 bg-[#FBFAF6]">
        <p className="self-start max-w-[85%] rounded-2xl rounded-bl-sm bg-white border border-[#E5E3DE] px-3 py-2 text-[12px] text-[#3F3F46]">
          Loved your post on onboarding. We&apos;re fixing ours right now, honestly.
        </p>
        <p className="self-end max-w-[85%] rounded-2xl rounded-br-sm bg-[#EDE9FE] px-3 py-2 text-[12px] text-[#3F3F46]">
          Thanks! What&apos;s the biggest drop-off you&apos;re seeing?
        </p>
        <p className="self-start max-w-[85%] rounded-2xl rounded-bl-sm bg-white border border-[#E5E3DE] px-3 py-2 text-[12px] text-[#3F3F46]">
          Day 2. People sign up and never come back.
        </p>
      </div>
      <div className="flex flex-col gap-2 px-4 py-4">
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Your next message</span>
        <p className="rounded-xl border-2 border-[#7C3AED]/30 bg-white px-3 py-2.5 text-[12.5px] leading-[1.55] text-[#0A0A0A]">
          Day 2 is the classic one. We had the same thing — a single &ldquo;here&apos;s your first win&rdquo; email
          fixed most of it. Happy to share what we sent if it helps?
        </p>
        <div className="flex gap-2">
          <span className="rounded-lg bg-[#7C3AED] px-3 py-1.5 text-[11px] font-semibold text-white">Insert</span>
          <span className="rounded-lg border border-[#E5E3DE] px-3 py-1.5 text-[11px] font-semibold text-[#3F3F46]">Copy</span>
          <span className="rounded-lg border border-[#E5E3DE] px-3 py-1.5 text-[11px] font-semibold text-[#3F3F46]">Shorter</span>
        </div>
      </div>
    </div>
  )
}

export function ExtensionFeature() {
  return (
    <section id="extension" className="py-24 px-6">
      <div className="max-w-5xl mx-auto flex flex-col gap-14">
        <AnimatedSection className="flex flex-col gap-4 text-center items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E5E3DE] text-[12px] font-medium text-[#7C3AED]">
            <Puzzle size={12} strokeWidth={2.2} />
            New — Chrome Extension
          </div>
          <h2 className="max-w-3xl text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.02em] text-[#0A0A0A] leading-[1.15]">
            Comments, Replies and Conversations on LinkedIn — Written in Your Voice
          </h2>
          <p className="max-w-2xl text-[15px] text-[#6B7280] leading-[1.7]">
            The CarouseLabs extension sits next to LinkedIn and writes as many comments, replies,
            connection notes and messages as you want. It follows the conversation, so every message
            moves it forward — and turns more of your chats into leads.
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
                <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] flex items-center justify-center flex-shrink-0">
                  <f.icon size={18} className="text-[#7C3AED]" strokeWidth={1.8} />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-[14px] font-semibold text-[#0A0A0A]">{f.title}</p>
                  <p className="text-[13px] text-[#6B7280] leading-[1.55]">{f.text}</p>
                </div>
              </AnimatedScale>
            ))}
          </div>

          <AnimatedSection delay={0.1}>
            <PanelMock />
          </AnimatedSection>
        </div>

        <AnimatedSection className="flex flex-col items-center gap-3">
          <Link
            href={EXTENSION_CHECKOUT_PATH}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-[15px] font-semibold text-white transition-colors shadow-[0_10px_30px_rgba(124,58,237,0.25)]"
          >
            Get the extension — ${EXTENSION_PLAN.price}/month
            <ArrowRight size={16} strokeWidth={2.2} />
          </Link>
          <p className="text-[12.5px] text-[#9CA3AF] text-center">
            Unlimited generations. Try {EXTENSION_PLAN.freeGenerations} free first — sold separately from the
            web plans.
          </p>
        </AnimatedSection>
      </div>
    </section>
  )
}
