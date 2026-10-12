import type { Metadata } from "next"
import { ShieldCheck } from "lucide-react"
import { VerifyCertificateForm } from "@/components/marketing/VerifyCertificateForm"

export const metadata: Metadata = {
  title: "Verify a Certificate",
  description: "Confirm a CarouseLabs internship certificate is genuine by entering its verification code.",
  alternates: { canonical: "https://carouselabs.com/verify-certificate" },
}

export default function VerifyCertificatePage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center gutter-x py-16 sm:py-24">
      <div className="w-full max-w-form">
        <header className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="grid size-12 place-items-center rounded-control bg-brand-soft text-brand">
            <ShieldCheck className="size-5" strokeWidth={1.9} aria-hidden />
          </div>
          <h1 className="text-title-sm font-semibold text-balance sm:text-title">Verify a CarouseLabs Certificate</h1>
          <p className="max-w-sm text-body text-muted-foreground">
            Enter the verification code printed on the certificate to confirm it&apos;s genuine.
          </p>
        </header>

        <div className="rounded-showcase border border-border bg-surface p-6 shadow-card sm:p-8">
          <VerifyCertificateForm />
        </div>
      </div>
    </div>
  )
}
