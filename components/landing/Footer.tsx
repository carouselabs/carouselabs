import Link from "next/link"
import { AnimatedFadeIn } from "@/components/marketing/AnimatedSection"

const FOOTER_LINKS = [
  { href: "/#pricing", label: "Pricing" },
  { href: "/#contact", label: "Contact" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refund", label: "Refund" },
]

const NICHE_LINKS = [
  { href: "/for/saas-founders", label: "SaaS Founders" },
  { href: "/for/business-coaches", label: "Business Coaches" },
  { href: "/for/digital-marketers", label: "Digital Marketers" },
  { href: "/for/content-creators", label: "Content Creators" },
  { href: "/for/freelancers", label: "Freelancers" },
  { href: "/for/startup-founders", label: "Startup Founders" },
  { href: "/for/social-media-managers", label: "Social Media Managers" },
  { href: "/for/copywriters", label: "Copywriters" },
  { href: "/for/real-estate-agents", label: "Real Estate Agents" },
  { href: "/for/personal-trainers", label: "Personal Trainers" },
]

export function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-[#E5E3DE] bg-[#F9F7F2]">
      <AnimatedFadeIn className="max-w-6xl mx-auto flex flex-col gap-8">
        <div className="flex flex-col items-center gap-4 pb-8 border-b border-[#E5E3DE]">
          <span className="text-[13px] font-semibold text-[#0A0A0A]">For Your Niche</span>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
            {NICHE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[12px] text-[#6B7280] hover:text-[#7C3AED] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.ico" alt="CarouseLabs" className="w-6 h-6 rounded-md object-cover" />
            <span className="text-[14px] font-semibold text-[#0A0A0A]">CarouseLabs</span>
          </Link>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[12px] text-[#6B7280] hover:text-[#1A1A1A] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-[#E5E3DE]">
          <p className="text-[11px] text-[#9CA3AF]">© 2026 CarouseLabs. All rights reserved.</p>
          <a
            href="mailto:support@carouselabs.com"
            className="text-[11px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
          >
            support@carouselabs.com
          </a>
        </div>
      </AnimatedFadeIn>
    </footer>
  )
}
