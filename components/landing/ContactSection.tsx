import { Mail } from "lucide-react"
import { ContactForm } from "@/components/marketing/ContactForm"
import { AnimatedSection } from "@/components/marketing/AnimatedSection"

export function ContactSection() {
  return (
    <section id="contact" className="py-24 px-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-10">
        <AnimatedSection className="flex flex-col gap-4 text-center">
          <p className="text-[11px] font-semibold text-[#1A1A1A] uppercase tracking-widest">
            Contact
          </p>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.02em] text-[#0A0A0A]">
            Get in touch
          </h2>
          <p className="max-w-md mx-auto text-[15px] text-[#6B7280] leading-[1.65]">
            Questions, feedback, or need a hand? Send us a message and we&apos;ll get back to you
            within 2–3 business days.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.1} className="p-7 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8]">
          <ContactForm />
        </AnimatedSection>

        <AnimatedSection delay={0.2} className="text-center">
          <a
            href="mailto:support@carouselabs.com"
            className="inline-flex items-center gap-2 text-[13px] font-medium text-[#1A1A1A] hover:underline"
          >
            <Mail size={14} strokeWidth={2} />
            support@carouselabs.com
          </a>
        </AnimatedSection>
      </div>
    </section>
  )
}
