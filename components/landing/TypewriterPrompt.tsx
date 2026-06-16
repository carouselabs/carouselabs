"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Sparkles, ArrowUp } from "lucide-react"

const PHRASES = [
  "Generate post ideas for my SaaS business…",
  "I run a coffee brand — give me 10 content ideas…",
  "I post about fitness, suggest topics for this week…",
  "Generate content ideas for my X (Twitter) account…",
  "Write a LinkedIn caption for my product launch…",
  "Create a 6-slide carousel for my design agency…",
  "Make an image for my morning routine post…",
  "I'm a freelancer — what should I post about today?",
  "Give me viral hooks about remote work culture…",
  "Turn today's tech news into a post idea…",
  "Generate Instagram ideas for my skincare brand…",
]

export function TypewriterPrompt() {
  const [text, setText] = useState("")
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [deleting, setDeleting] = useState(false)

  // Drives the streaming effect. State is only updated inside the timer
  // callbacks (never synchronously in the effect body), so it types a phrase
  // out, pauses, deletes it, then advances to the next one — forever.
  useEffect(() => {
    const current = PHRASES[phraseIndex]
    let timeout: ReturnType<typeof setTimeout>

    if (!deleting && text === current) {
      timeout = setTimeout(() => setDeleting(true), 1600)
    } else if (deleting && text === "") {
      timeout = setTimeout(() => {
        setDeleting(false)
        setPhraseIndex((i) => (i + 1) % PHRASES.length)
      }, 400)
    } else {
      timeout = setTimeout(
        () =>
          setText((prev) =>
            deleting ? prev.slice(0, -1) : current.slice(0, prev.length + 1),
          ),
        deleting ? 30 : 55,
      )
    }

    return () => clearTimeout(timeout)
  }, [text, deleting, phraseIndex])

  return (
    <div className="w-full max-w-2xl mx-auto text-left">
      <div className="relative rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8] shadow-[0_16px_50px_rgba(10,10,10,0.07)] p-5">
        <p className="min-h-[52px] text-[16px] text-[#0A0A0A] leading-[1.6]">
          {text}
          <span className="inline-block w-[2px] h-[19px] bg-[#1A1A1A] ml-[1px] align-[-3px] animate-pulse" />
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E3DE] bg-[#F9F7F2] text-[12px] font-medium text-[#6B7280]">
            <Sparkles size={12} strokeWidth={2} />
            Brainstorm ideas
          </span>
          <Link
            href="/sign-up"
            aria-label="Start creating"
            className="w-9 h-9 rounded-lg bg-[#1A1A1A] hover:bg-black flex items-center justify-center text-white transition-colors"
          >
            <ArrowUp size={16} strokeWidth={2.4} />
          </Link>
        </div>
      </div>
    </div>
  )
}
