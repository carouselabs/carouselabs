import type { Metadata } from "next"
import { ShieldCheck } from "lucide-react"
import { VerifyCertificateForm } from "@/components/marketing/VerifyCertificateForm"
import { AnimatedSection } from "@/components/marketing/AnimatedSection"

export const metadata: Metadata = {
  title: "Verify a Certificate",
  description: "Confirm a CarouseLabs internship certificate is genuine by entering its verification code.",
  alternates: { canonical: "https://carouselabs.com/verify-certificate" },
}

export default function VerifyCertificatePage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 py-20">
      <AnimatedSection className="w-full max-w-lg">
        <div className="flex flex-col items-center gap-3 text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.2)] flex items-center justify-center">
            <ShieldCheck size={20} className="text-[#7C3AED]" strokeWidth={1.9} />
          </div>
          <h1 className="text-[clamp(1.6rem,4vw,2.2rem)] font-bold tracking-[-0.02em] text-[#0A0A0A]">
            Verify a CarouseLabs Certificate
          </h1>
          <p className="max-w-sm text-[14px] text-[#6B7280] leading-[1.6]">
            Enter the verification code printed on the certificate to confirm it&apos;s genuine.
          </p>
        </div>

        <div className="p-6 sm:p-8 rounded-2xl border border-[#E5E3DE] bg-white shadow-[0_20px_50px_rgba(10,10,10,0.06)]">
          <VerifyCertificateForm />
        </div>
      </AnimatedSection>
    </div>
  )
}
