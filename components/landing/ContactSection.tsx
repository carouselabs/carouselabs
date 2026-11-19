import Link from "next/link"
import { ArrowRight, Mail } from "lucide-react"

import { ContactForm } from "@/components/marketing/ContactForm"

/**
 * The page's close, on the blue → violet ground (anantgoyal.in's contact
 * section): the final call to action, then the contact promise beside the
 * working form on a white card. Copy unchanged from the former CTA and
 * Contact sections (CTA: row 12 of docs/redesign/copy-ledger.md applies).
 */
export function ContactSection() {
  return (
    <div className="ground-canvas relative isolate overflow-hidden font-ui text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <span className="orb orb-blue top-[4%] -left-36 size-[300px] opacity-95" />
        <div className="drift absolute top-[6%] right-[6%] hidden lg:block" style={{ ["--dur" as string]: "13s" }}>
          <span className="orb orb-pearl relative block size-24" />
        </div>
        <span className="orb orb-violet top-[48%] -right-40 hidden size-[320px] opacity-95 sm:block" />
        <span className="orb orb-lime top-[38%] left-[46%] hidden size-6 lg:block" />
      </div>

      <section aria-labelledby="cta-title" className="wrap-site pt-24 lg:pt-[120px]">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-6">
          <div className="flex flex-col gap-4 lg:col-span-8">
            <p className="self-start rounded-full bg-white px-3 py-1 text-[13px] font-medium text-[#100C33]">One day or day one</p>
            <h2 id="cta-title" className="max-w-[16ch] text-[clamp(2rem,1.1rem+2.5vw,3.25rem)] leading-[0.98] font-semibold tracking-[-0.045em] text-balance">
              Start creating content that <span className="serif-accent tracking-[-0.02em]">actually gets noticed.</span>
            </h2>
          </div>
          <div className="flex flex-col items-start gap-3 lg:col-span-4 lg:items-end">
            <Link
              href="/sign-up"
              className="btn-nudge inline-flex h-14 items-center gap-2 rounded-full bg-white px-7 text-base font-medium text-[#100C33] shadow-[0_10px_30px_-12px_rgb(10_0_60/0.5)] transition-[translate,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-14px_rgb(10_0_60/0.6)] active:translate-y-0 active:scale-[0.97] motion-reduce:hover:translate-y-0"
            >
              Get started free
              <ArrowRight aria-hidden className="nudge size-4" />
            </Link>
            <p className="text-[15px] font-medium text-white">No credit card required</p>
          </div>
        </div>
      </section>

      <section id="contact" aria-labelledby="contact-title" className="wrap-site scroll-mt-24 pt-20 pb-24 lg:pt-28 lg:pb-[120px]">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-6">
          <div className="flex flex-col gap-4 lg:col-span-5">
            <p className="self-start rounded-full bg-white px-3 py-1 text-[13px] font-medium text-[#100C33]">Contact</p>
            <h2 id="contact-title" className="text-[clamp(2rem,1.1rem+2.5vw,3.25rem)] leading-[1.02] font-semibold tracking-[-0.04em]">
              Get in <span className="serif-accent tracking-[-0.02em]">touch</span>
            </h2>
            <p className="max-w-[30rem] text-lg leading-[1.6] text-white">
              Questions, feedback, or need a hand? Send us a message and we&apos;ll get back to you within 2–3 business days.
            </p>
            <a href="mailto:support@carouselabs.com" className="inline-flex min-h-11 items-center gap-2 self-start pt-2 text-lg font-medium text-white">
              <Mail className="size-4" strokeWidth={2} aria-hidden />
              <span className="link-draw">support@carouselabs.com</span>
            </a>
          </div>
          <div className="lg:col-span-7">
            <div className="rounded-[28px] bg-white p-5 text-[#100C33] shadow-[0_40px_100px_-40px_rgb(10_0_60/0.7)] sm:p-8">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
