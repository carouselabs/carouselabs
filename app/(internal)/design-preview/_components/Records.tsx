import { Section } from "./Section"

const RECORDS = [
  ["docs/redesign/progress.md", "What Phase 0 built, what was verified, what's open"],
  ["docs/redesign/design-system.md", "Token names and decisions (why `brand`, not `accent`, is the violet)"],
  ["docs/redesign/route-inventory.md", "Every page in the repo with access rule, phase and status, plus redirects and API routes"],
  ["docs/redesign/copy-ledger.md", "Current line → proposed line, with file and approval status"],
  ["docs/redesign/landing-structure.md", "The proposed landing page order"],
  ["docs/redesign/asset-checklist.md", "Screenshots, testimonials, numbers and decisions needed from you"],
] as const

const DECISIONS = [
  "Approve the warm editorial direction (or name the element to change).",
  "Approve the landing order in landing-structure.md.",
  "Mark which copy-ledger rows are approved.",
  "Keep the current logo, or adopt the proposed mark (a separate choice).",
]

export function Records() {
  return (
    <Section id="records" title="Records and open decisions" description="Phase 0 stops here for one combined review.">
      <div className="grid gap-8 lg:grid-cols-2">
        <ul className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface">
          {RECORDS.map(([file, what]) => (
            <li key={file} className="flex flex-col gap-0.5 p-4">
              <code className="text-label font-medium text-foreground">{file}</code>
              <span className="text-label text-muted-foreground">{what}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6">
          <p className="text-body font-semibold">Decisions for this review</p>
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-label text-muted-foreground">
            {DECISIONS.map((decision) => (
              <li key={decision}>{decision}</li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  )
}
