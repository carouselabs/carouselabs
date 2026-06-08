"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Check } from "lucide-react"

const FREE_FEATURES = [
  "1 post lifetime",
  "Unlimited idea generation",
  "Post breakdown",
  "Caption generation",
]

const PRO_FEATURES = [
  "1 post per day",
  "Unlimited idea generation",
  "Post breakdown",
  "Caption generation",
  "AI carousel builder",
  "PDF export",
  "Priority support",
]

export function Pricing() {
  return (
    <section className="py-28 px-6 bg-[#0D0D1A]">
      <div className="max-w-4xl mx-auto flex flex-col gap-16">
        <motion.div
          className="flex flex-col gap-4 text-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[11px] font-semibold text-[#A78BFA] uppercase tracking-widest">
            Pricing
          </p>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.02em] text-white">
            Simple, honest pricing
          </h2>
          <p className="max-w-sm mx-auto text-[15px] text-[rgba(255,255,255,0.42)] leading-[1.65]">
            Start free. Upgrade when you&apos;re ready to publish consistently.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
          {/* Free */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45 }}
            className="flex flex-col gap-7 p-7 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]"
          >
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-semibold text-[rgba(255,255,255,0.32)] uppercase tracking-widest">
                Free
              </p>
              <div className="flex items-end gap-1.5 mt-2">
                <span className="text-[2.6rem] font-bold text-white leading-none">₹0</span>
                <span className="text-[13px] text-[rgba(255,255,255,0.32)] pb-1.5">forever</span>
              </div>
            </div>

            <ul className="flex flex-col gap-3">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check
                    size={13}
                    className="text-[rgba(255,255,255,0.28)] mt-0.5 flex-shrink-0"
                    strokeWidth={2.5}
                  />
                  <span className="text-[13px] text-[rgba(255,255,255,0.48)]">{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.07)] text-[13px] font-semibold text-[rgba(255,255,255,0.65)] transition-colors"
            >
              Get started free
            </Link>
          </motion.div>

          {/* Pro */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45 }}
            className="relative flex flex-col gap-7 p-7 rounded-2xl border border-[rgba(124,58,237,0.42)] bg-[rgba(124,58,237,0.05)] overflow-hidden"
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 90% 55% at 50% 0%, rgba(124,58,237,0.14) 0%, transparent 70%)",
              }}
            />

            <div className="relative flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-semibold text-[#A78BFA] uppercase tracking-widest">
                  Pro
                </p>
                <span className="px-2 py-0.5 rounded-full bg-[rgba(124,58,237,0.2)] text-[10px] font-semibold text-[#C4B5FD] border border-[rgba(124,58,237,0.28)]">
                  Popular
                </span>
              </div>
              <div className="flex items-end gap-1.5 mt-2">
                <span className="text-[2.6rem] font-bold text-white leading-none">₹2,499</span>
                <span className="text-[13px] text-[rgba(255,255,255,0.32)] pb-1.5">/ month</span>
              </div>
              <p className="text-[11px] text-[rgba(255,255,255,0.28)] mt-0.5">
                $34 / month · billed monthly
              </p>
            </div>

            <ul className="relative flex flex-col gap-3">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check
                    size={13}
                    className="text-[#A78BFA] mt-0.5 flex-shrink-0"
                    strokeWidth={2.5}
                  />
                  <span className="text-[13px] text-[rgba(255,255,255,0.62)]">{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/sign-up"
              className="relative inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-[13px] font-semibold text-white transition-colors shadow-[0_0_28px_rgba(124,58,237,0.28)]"
            >
              Start with Pro
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
