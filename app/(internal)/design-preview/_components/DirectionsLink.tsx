import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Section } from "./Section"

export function DirectionsLink() {
  return (
    <Section
      id="samples"
      title="Layout directions"
      description="The first sample screens are withdrawn. Two structurally different directions now cover the landing opening, Generate and a creation screen, on desktop and mobile."
    >
      <Link
        href="/design-preview/directions"
        className="group flex flex-col gap-2 rounded-card border border-border bg-surface p-6 transition-colors hover:border-control-border md:flex-row md:items-center md:justify-between"
      >
        <span className="flex flex-col gap-1">
          <span className="text-body-lg font-semibold">A · Studio desk and B · Focus flow</span>
          <span className="text-label text-muted-foreground">Clickable prototypes, the comparison, the recommendation and the full navigation map.</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-label font-medium">
          Open <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </Link>
    </Section>
  )
}
