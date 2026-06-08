"use client"

import { motion } from "framer-motion"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"

const FAQS = [
  {
    q: "Is CarouseLabs really free to start?",
    a: "Yes. You can generate unlimited ideas, break down a post, and publish one full post completely free — no credit card needed.",
  },
  {
    q: "What does 'one post per day' mean on Pro?",
    a: "Each day you can generate one full caption and one carousel deck. Idea generation is always unlimited on both plans.",
  },
  {
    q: "How does CarouseLabs know my writing style?",
    a: "During onboarding, you fill in your niche, target audience, content pillars, and writing preferences. Every Claude prompt uses that profile as context so the output feels like you wrote it.",
  },
  {
    q: "Which AI model does CarouseLabs use?",
    a: "CarouseLabs uses Anthropic's Claude for ideas, breakdowns, and captions. DALL-E 3 is used for carousel image generation.",
  },
  {
    q: "Can I edit the AI-generated content?",
    a: "Absolutely. The caption editor is fully editable. You can also choose from hook variations to change the opening line, or regenerate with a different tone at any time.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "Cancel any time from your account settings. Your Pro access continues until the end of the billing period — no questions asked.",
  },
]

export function FAQ() {
  return (
    <section className="py-28 px-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-14">
        <motion.div
          className="flex flex-col gap-4 text-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[11px] font-semibold text-[#A78BFA] uppercase tracking-widest">
            FAQ
          </p>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.02em] text-white">
            Common questions
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
        >
          <Accordion>
            {FAQS.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border-[rgba(255,255,255,0.06)]"
              >
                <AccordionTrigger className="py-4 text-[14px] font-medium text-[rgba(255,255,255,0.7)] hover:text-white hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-[13px] text-[rgba(255,255,255,0.42)] leading-[1.65] pb-1">
                    {faq.a}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  )
}
