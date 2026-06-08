"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Sparkles } from "lucide-react"

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 pt-16 overflow-hidden">
      {/* Purple radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(124,58,237,0.18) 0%, rgba(124,58,237,0.06) 45%, transparent 70%)",
        }}
      />
      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative max-w-4xl mx-auto text-center flex flex-col items-center gap-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[rgba(124,58,237,0.3)] bg-[rgba(124,58,237,0.08)] text-[12px] font-medium text-[#C4B5FD]"
        >
          <Sparkles size={11} strokeWidth={2.2} />
          AI-powered LinkedIn content
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="text-[clamp(2.4rem,6vw,4.5rem)] font-bold leading-[1.08] tracking-[-0.025em] text-white"
        >
          Your LinkedIn presence,{" "}
          <span className="text-[#A78BFA]">crafted in ten minutes.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15 }}
          className="max-w-lg text-[17px] text-[rgba(255,255,255,0.48)] leading-[1.65]"
        >
          Generate scroll-stopping post ideas, write high-performing captions, and design polished carousels — all shaped by your personal brand.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.22 }}
          className="flex flex-col sm:flex-row items-center gap-3.5"
        >
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-[14px] font-semibold text-white transition-colors shadow-[0_0_40px_rgba(124,58,237,0.28)]"
          >
            Start for free
            <ArrowRight size={15} strokeWidth={2.2} />
          </Link>
          <p className="text-[12px] text-[rgba(255,255,255,0.25)]">No credit card required</p>
        </motion.div>
      </div>
    </section>
  )
}
