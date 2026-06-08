"use client"

import { motion } from "framer-motion"

const STEPS = [
  {
    number: "01",
    title: "Set up your profile",
    description:
      "Tell CarouseLabs about your niche, target audience, content pillars, and writing style. This context makes every output feel like you wrote it.",
  },
  {
    number: "02",
    title: "Pick an idea",
    description:
      "Generate a fresh batch of 12 LinkedIn post ideas tailored to your brand. Browse by category — trending, educational, storytelling, and more.",
  },
  {
    number: "03",
    title: "Generate and download",
    description:
      "Get a deep breakdown, write a full caption with tone controls, build a carousel, and export — in under ten minutes.",
  },
]

export function HowItWorks() {
  return (
    <section className="py-28 px-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-16">
        <motion.div
          className="flex flex-col gap-4 text-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[11px] font-semibold text-[#A78BFA] uppercase tracking-widest">
            How it works
          </p>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.02em] text-white">
            From zero to polished post
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.45, delay: i * 0.1 }}
              className="flex flex-col gap-5 p-7 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]"
            >
              <span className="text-[clamp(2.8rem,5vw,3.5rem)] font-bold text-[rgba(124,58,237,0.18)] leading-none tabular-nums">
                {step.number}
              </span>
              <div className="flex flex-col gap-2">
                <h3 className="text-[15px] font-semibold text-[rgba(255,255,255,0.85)]">
                  {step.title}
                </h3>
                <p className="text-[13px] text-[rgba(255,255,255,0.38)] leading-[1.65]">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
