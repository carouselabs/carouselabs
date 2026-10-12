import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"

// Copy unchanged except row 12 of docs/redesign/copy-ledger.md: the
// unverified "Join 1,000+ creators" line was removed (owner, 2026-10-11).
export function CTA() {
  return (
    <section aria-labelledby="cta-title" className="font-ui gutter-x pb-16 lg:pb-24">
      <div className="mx-auto flex max-w-showcase flex-col items-start gap-6 rounded-showcase bg-primary px-6 py-12 text-primary-foreground sm:px-12 lg:flex-row lg:items-end lg:justify-between lg:px-16 lg:py-16">
        <div className="flex max-w-[40rem] flex-col gap-4">
          <p className="text-label font-medium opacity-70">One day or day one</p>
          <h2 id="cta-title" className="text-section font-semibold text-balance">
            Start creating content that actually gets noticed.
          </h2>
        </div>
        <div className="flex flex-col items-start gap-2">
          <Link
            href="/sign-up"
            className={buttonVariants({ size: "lg", className: "bg-primary-foreground text-primary hover:bg-[color-mix(in_oklab,var(--primary-foreground),var(--primary)_8%)]" })}
          >
            Get started free
            <ArrowRight aria-hidden />
          </Link>
          <p className="text-caption opacity-70">No credit card required</p>
        </div>
      </div>
    </section>
  )
}
