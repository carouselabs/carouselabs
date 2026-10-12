"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRight,
  AtSign,
  Laugh,
  MessageSquare,
  MessagesSquare,
  Puzzle,
  Reply,
  ShieldCheck,
  Sparkles,
  Target,
  UserPlus,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { EXTENSION_CHECKOUT_PATH, EXTENSION_PLAN, X_EXTENSION_CHECKOUT_PATH, X_EXTENSION_PLAN } from "@/lib/plans"

// Copy moved verbatim from the former ExtensionFeature and XExtensionFeature
// sections; the switch between them is the approved Phase 1 layout.

const LINKEDIN_FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: MessageSquare, title: "Comments in your voice", text: "Click Comment on any LinkedIn post and get a specific, human comment that sounds like you — not like AI." },
  { icon: Reply, title: "Replies with context", text: "Reply to a comment and the extension reads the whole thread first, so your answer actually fits the conversation." },
  { icon: MessagesSquare, title: "Conversation Assistant", text: "Open a LinkedIn chat and it reads the messages, then writes your next one — the reply that keeps it going." },
  { icon: Target, title: "Turn chats into leads", text: "Reconnect, follow up, and move a conversation toward a call without sounding pushy." },
  { icon: UserPlus, title: "Connection notes", text: "Short, personal invitation notes written from their profile — the kind people actually accept." },
  { icon: ShieldCheck, title: "You stay in control", text: "Everything is a draft you can edit. Nothing is ever posted or sent for you." },
]

const X_FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Reply, title: "Replies that sound like you", text: "Click Reply on any post on X and get a short, natural reply in your own voice — not like AI." },
  { icon: MessagesSquare, title: "X messages", text: "Open a chat on X and it reads the conversation, then writes your next message." },
  { icon: Sparkles, title: "Pick your style", text: "Short & Simple, Natural (with slang), Simple & Detailed, or Funny — or make your own." },
  { icon: Laugh, title: "Shorter, longer, funnier", text: "Not quite right? Rewrite it shorter or longer in one click." },
  { icon: AtSign, title: "Reads the whole thread", text: "It reads the post, the thread above it and any quoted post before it writes." },
  { icon: ShieldCheck, title: "You stay in control", text: "Everything is a draft you can edit. Nothing is ever posted or sent for you." },
]

function DraftActions() {
  return (
    <div className="flex gap-2 text-caption font-medium">
      <span className="rounded-control-sm bg-primary px-2.5 py-1.5 text-primary-foreground">Insert</span>
      <span className="rounded-control-sm border border-border px-2.5 py-1.5">Copy</span>
      <span className="rounded-control-sm px-2.5 py-1.5 text-muted-foreground">Shorter</span>
    </div>
  )
}

/** A static illustration of the LinkedIn side panel in a real conversation. */
function LinkedInMock() {
  return (
    <div aria-hidden className="flex flex-col gap-4 rounded-showcase border border-border bg-surface-raised p-5 shadow-dialog sm:p-6">
      <div className="flex items-center justify-between">
        <span className="text-label font-semibold">Conversation Assistant</span>
        <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-caption font-medium text-brand">Unlimited</span>
      </div>
      <div className="flex flex-col gap-2 text-label">
        <p className="max-w-[85%] self-start rounded-card rounded-bl-detail bg-surface-muted px-3.5 py-2.5">
          Loved your post on onboarding. We&apos;re fixing ours right now, honestly.
        </p>
        <p className="max-w-[85%] self-end rounded-card rounded-br-detail bg-primary px-3.5 py-2.5 text-primary-foreground">
          Thanks! What&apos;s the biggest drop-off you&apos;re seeing?
        </p>
        <p className="max-w-[85%] self-start rounded-card rounded-bl-detail bg-surface-muted px-3.5 py-2.5">Day 2. People sign up and never come back.</p>
      </div>
      <div className="flex flex-col gap-3 rounded-card border border-dashed border-brand/50 bg-brand-soft/40 p-4">
        <span className="text-caption font-medium text-brand">Your next message</span>
        <p className="text-label">
          Day 2 is the classic one. We had the same thing — a single &ldquo;here&apos;s your first win&rdquo; email fixed most of it. Happy to
          share what we sent if it helps?
        </p>
        <DraftActions />
      </div>
    </div>
  )
}

/** A static illustration of the X side panel, in X's black and white. */
function XMock() {
  return (
    <div aria-hidden className="flex flex-col gap-4 rounded-showcase border border-border bg-surface-raised p-5 shadow-dialog sm:p-6">
      <div className="flex items-center justify-between">
        <span className="text-label font-semibold">Reply on X</span>
        <span className="rounded-full bg-primary px-2.5 py-0.5 text-caption font-medium text-primary-foreground">Natural (Slang)</span>
      </div>
      <div className="flex flex-col gap-2 rounded-card border border-border p-4">
        <span className="text-label font-semibold">
          Rahul Mehta <span className="font-normal text-muted-foreground">@rahulm</span>
        </span>
        <p className="text-label">Took a full week off with no laptop for the first time in 3 years. Came back and nothing broke.</p>
      </div>
      <div className="flex flex-col gap-3 rounded-card border border-dashed border-control-border/70 bg-surface-muted/50 p-4">
        <span className="text-caption font-medium text-muted-foreground">Your reply</span>
        <p className="text-label">a full week with no laptop and nothing broke... honestly, needed to hear this</p>
        <DraftActions />
      </div>
    </div>
  )
}

function FeatureList({ items }: { items: typeof LINKEDIN_FEATURES }) {
  return (
    <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
      {items.map((f) => (
        <li key={f.title} className="flex gap-3">
          <f.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.8} aria-hidden />
          <div className="flex flex-col gap-1">
            <p className="text-label font-semibold">{f.title}</p>
            <p className="text-label text-muted-foreground">{f.text}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

type Platform = "linkedin" | "x"

export function EngageSection() {
  const [active, setActive] = React.useState<Platform>("linkedin")

  // /#x-extension (nav, old links) opens the X panel; /#extension the LinkedIn one.
  React.useEffect(() => {
    const sync = () => {
      if (window.location.hash === "#x-extension") setActive("x")
      else if (window.location.hash === "#extension") setActive("linkedin")
    }
    sync()
    window.addEventListener("hashchange", sync)
    return () => window.removeEventListener("hashchange", sync)
  }, [])

  return (
    <section id="extension" aria-label="CarouseLabs Engage" className="scroll-mt-20 border-t border-border bg-surface-muted/40 font-ui">
      <span id="x-extension" aria-hidden className="block scroll-mt-20" />
      {/* Without JavaScript both panels show, one after the other. Panels hide
          with a class, not the `hidden` attribute: Tailwind's base styles make
          [hidden] display:none !important, which this fallback can't override. */}
      <noscript dangerouslySetInnerHTML={{ __html: "<style>[data-engage-panel]{display:grid!important}[data-engage-switch]{display:none!important}</style>" }} />
      <div className="mx-auto flex max-w-showcase flex-col gap-10 gutter-x section-y">
        <div data-engage-switch role="group" aria-label="Choose an extension" className="inline-flex self-start rounded-full border border-border bg-surface p-1">
          {([
            ["linkedin", "Engage for LinkedIn"],
            ["x", "Engage for X"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={active === value}
              aria-controls={`engage-${value}`}
              onClick={() => setActive(value)}
              className="h-10 rounded-full px-4 text-label whitespace-nowrap sm:px-5 font-medium text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-foreground aria-pressed:text-background"
            >
              {label}
            </button>
          ))}
        </div>

        <div
          id="engage-linkedin"
          data-engage-panel
          className={cn("grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16", active !== "linkedin" && "hidden")}
        >
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <p className="inline-flex items-center gap-1.5 text-label font-medium text-brand">
                <Puzzle className="size-3.5" strokeWidth={2.2} aria-hidden />
                New — Chrome Extension
              </p>
              <h2 className="text-title font-semibold text-balance lg:text-[2.625rem] lg:leading-[1.1]">Comments, Replies and Conversations on LinkedIn — Written in Your Voice</h2>
              <p className="text-body-lg text-muted-foreground">
                The CarouseLabs extension sits next to LinkedIn and writes as many comments, replies, connection notes and messages as you
                want. It follows the conversation, so every message moves it forward — and turns more of your chats into leads.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Link href={EXTENSION_CHECKOUT_PATH} className={cn(buttonVariants({ size: "lg" }), "self-start")}>
                Get the extension — ${EXTENSION_PLAN.price}/month
                <ArrowRight aria-hidden />
              </Link>
              <p className="text-label text-muted-foreground">
                Unlimited generations. Try {EXTENSION_PLAN.freeGenerations} free first — sold separately from the web plans.
              </p>
            </div>
            <FeatureList items={LINKEDIN_FEATURES} />
          </div>
          <div className="lg:sticky lg:top-24 lg:self-start">
            <LinkedInMock />
          </div>
        </div>

        <div
          id="engage-x"
          data-engage-panel
          className={cn("grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16", active !== "x" && "hidden")}
        >
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <p className="inline-flex items-center gap-1.5 text-label font-medium text-foreground">
                <span aria-hidden className="font-semibold">𝕏</span>
                New — CarouseLabs Engage for X
              </p>
              <h2 className="text-title font-semibold text-balance lg:text-[2.625rem] lg:leading-[1.1]">Replies and Messages on X — Written in Your Voice</h2>
              <p className="text-body-lg text-muted-foreground">
                A separate Chrome extension for x.com. It writes as many replies and messages as you want, in plain, natural English that
                sounds like you — so you can show up in more conversations without spending your whole day on X.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Link href={X_EXTENSION_CHECKOUT_PATH} className={cn(buttonVariants({ size: "lg" }), "self-start")}>
                Get Engage for X — ${X_EXTENSION_PLAN.price}/month
                <ArrowRight aria-hidden />
              </Link>
              <p className="text-label text-muted-foreground">
                Unlimited replies and messages. Try {X_EXTENSION_PLAN.freeGenerations} free first — sold separately from the LinkedIn extension
                and the web plans.
              </p>
            </div>
            <FeatureList items={X_FEATURES} />
          </div>
          <div className="lg:sticky lg:top-24 lg:self-start">
            <XMock />
          </div>
        </div>
      </div>
    </section>
  )
}
