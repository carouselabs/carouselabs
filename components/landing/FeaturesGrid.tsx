"use client"

import { motion } from "framer-motion"
import { Lightbulb, PenLine, BookOpen, LayoutGrid, Download } from "lucide-react"

const FEATURES = [
  {
    icon: Lightbulb,
    title: "AI Ideas",
    description:
      "Get 12 post ideas tailored to your niche and goals every session, powered by Claude AI.",
  },
  {
    icon: PenLine,
    title: "Smart Captions",
    description:
      "Full-length LinkedIn captions written in your voice, with tone selector and hook variations.",
  },
  {
    icon: BookOpen,
    title: "Deep Dive",
    description:
      "Structured post breakdowns — objective, emotion, talking points, storytelling angle, CTA.",
  },
  {
    icon: LayoutGrid,
    title: "AI Carousels",
    description:
      "Multi-slide carousel decks with DALL-E generated visuals, sized perfectly for LinkedIn.",
  },
  {
    icon: Download,
    title: "Export Ready",
    description:
      "Download PDF carousels, copy captions, and publish directly — one click away from live.",
  },
]

export function FeaturesGrid() {
  return (
    <section className="py-28 px-6 bg-[#0D0D1A]">
      <div className="max-w-6xl mx-auto flex flex-col gap-16">
        <motion.div
          className="flex flex-col gap-4 text-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[11px] font-semibold text-[#A78BFA] uppercase tracking-widest">
            Features
          </p>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.02em] text-white">
            Everything you need to own LinkedIn
          </h2>
          <p className="max-w-xl mx-auto text-[15px] text-[rgba(255,255,255,0.42)] leading-[1.65]">
            From idea to published post, CarouseLabs handles every step of your content workflow.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.45, delay: i * 0.07 }}
              className="flex flex-col gap-4 p-6 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(124,58,237,0.22)] hover:bg-[rgba(124,58,237,0.04)] transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-xl bg-[rgba(124,58,237,0.12)] border border-[rgba(124,58,237,0.18)] flex items-center justify-center">
                <f.icon size={18} className="text-[#A78BFA]" strokeWidth={1.8} />
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-[14px] font-semibold text-[rgba(255,255,255,0.85)]">
                  {f.title}
                </h3>
                <p className="text-[13px] text-[rgba(255,255,255,0.38)] leading-[1.6]">
                  {f.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
