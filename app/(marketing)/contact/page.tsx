import type { Metadata } from "next"
import { Mail, Clock, MessageCircle } from "lucide-react"
import { ContactForm } from "@/components/marketing/ContactForm"
import {
  AnimatedSection,
  AnimatedSlideLeft,
  AnimatedSlideRight,
} from "@/components/marketing/AnimatedSection"

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with the CarouseLabs team.",
}

const DETAILS = [
  {
    icon: Mail,
    label: "Email",
    value: "support@carouselabs.com",
    href: "mailto:support@carouselabs.com",
  },
  {
    icon: Clock,
    label: "Response time",
    value: "Within 2–3 business days",
  },
  {
    icon: MessageCircle,
    label: "What we help with",
    value: "Billing, account, and product questions",
  },
]

export default function ContactPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-20">
      <AnimatedSection className="flex flex-col gap-3 pb-10 mb-12 border-b border-[#E5E3DE]">
        <p className="text-[11px] font-semibold text-[#1A1A1A] uppercase tracking-widest">Contact</p>
        <h1 className="text-[clamp(2rem,5vw,3rem)] font-bold tracking-[-0.025em] text-[#0A0A0A] leading-[1.1]">
          Get in touch
        </h1>
        <p className="mt-2 max-w-xl text-[15px] text-[#6B7280] leading-[1.7]">
          Have a question, need help with your account, or want to share feedback? Send us a message
          and our team will get back to you.
        </p>
      </AnimatedSection>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-10 lg:gap-16">
        {/* Contact details */}
        <AnimatedSlideLeft className="flex flex-col gap-5">
          {DETAILS.map((d) => (
            <div
              key={d.label}
              className="flex items-start gap-4 p-5 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8]"
            >
              <div className="w-10 h-10 rounded-xl bg-[rgba(26,26,26,0.06)] border border-[rgba(26,26,26,0.14)] flex items-center justify-center flex-shrink-0">
                <d.icon size={17} className="text-[#1A1A1A]" strokeWidth={1.9} />
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-widest">
                  {d.label}
                </p>
                {d.href ? (
                  <a
                    href={d.href}
                    className="text-[14px] text-[#0A0A0A] hover:text-[#1A1A1A] transition-colors"
                  >
                    {d.value}
                  </a>
                ) : (
                  <p className="text-[14px] text-[#0A0A0A]">{d.value}</p>
                )}
              </div>
            </div>
          ))}
        </AnimatedSlideLeft>

        {/* Form */}
        <AnimatedSlideRight className="p-7 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8]">
          <h2 className="text-[16px] font-semibold text-[#0A0A0A] mb-5">Send us a message</h2>
          <ContactForm />
        </AnimatedSlideRight>
      </div>
    </div>
  )
}
