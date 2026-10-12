import Link from "next/link"
import { notFound } from "next/navigation"

import { fontVariables } from "@/lib/fonts"
import { cn } from "@/lib/utils"
import { destinations, placement, type DestinationId } from "./_proto/nav"

const SCREENS = [
  ["landing", "Landing opening"],
  ["generate", "Generate"],
  ["create", "Create (carousel)"],
] as const

const COMPARE: { aspect: string; a: string; b: string }[] = [
  {
    aspect: "Navigation",
    a: "Two-tier top bar: Create · Content · Engage, with the active area's pages as sub-tabs. New post menu, credits, account menu on the right. Mobile: top bar, full-screen menu, scrollable sub-tabs.",
    b: "Almost no chrome: a slim top bar with breadcrumb and Go to… (Ctrl/⌘ K). A floating dock holds Create · Content · Engage as menus. Mobile: bottom tab bar.",
  },
  {
    aspect: "Generate",
    a: "A brief line, category filters, then a numbered editorial list. The selected idea sits in a sticky detail column with angle, fit and “Develop this idea”. Scan first, decide second.",
    b: "One idea at a time, large, with Use · Pin · Skip and keyboard shortcuts (← → P X Enter). All ten stay one glance away in a grouped index. Decide one by one.",
  },
  {
    aspect: "Creation screen",
    a: "A toolbar with the full step trail. The post fills the centre (Write · Slides · Post preview). Settings in a collapsible side panel; Download · Schedule · Post in one fixed bar.",
    b: "Write on the left, the real post on the right. Settings are chips above the preview; everything about finishing sits behind one Finish button. Navigation hides while editing.",
  },
  {
    aspect: "Landing opening",
    a: "A wide headline row, then the product itself as a clickable four-step stage. The Engage reply is attached to the stage where the post meets its first conversation.",
    b: "Visitors pick their job first (Create posts / Reply faster), which swaps the headline and CTA. The proof is a feed: a post made in the studio and a reply drafted by Engage.",
  },
  {
    aspect: "Mobile",
    a: "Same structure, compressed: detail and settings become sheets; the action bar stays at the bottom.",
    b: "Re-sequenced: Write → Preview → Finish as full-screen steps; ideas as a deck; a native-feeling tab bar.",
  },
  {
    aspect: "Secondary tools",
    a: "Sub-tabs of each area, the New post menu, the account menu, the editor's side panel.",
    b: "Dock menus, the Go to… palette, the account menu, chip popovers in the editor.",
  },
]

const ORDER: DestinationId[] = [
  "generate", "ownIdea", "create", "thumbnail", "tapHold",
  "calendar", "ideasBoard", "history", "pinned",
  "liOverview", "liAgents", "liProfiles", "liHistory", "liSettings", "liBilling",
  "xOverview", "xAgents", "xProfiles", "xHistory", "xSettings", "xBilling",
  "profile", "voicePresets", "billing", "referrals", "startPage", "account", "toolkit",
]

function ProtoLink({ dir, screen, device }: { dir: "a" | "b"; screen: string; device: "desktop" | "mobile" }) {
  return (
    <Link
      href={`/design-preview/directions/${dir}?screen=${screen}&device=${device}`}
      className="inline-flex h-9 items-center rounded-control-sm border border-border bg-surface px-3 text-label font-medium transition-colors hover:border-control-border hover:bg-surface-muted"
    >
      {device === "desktop" ? "Desktop" : "Mobile"}
    </Link>
  )
}

export default function DirectionsPage() {
  if (process.env.NODE_ENV !== "development") notFound()
  return (
    <div className={cn(fontVariables, "min-h-svh bg-background font-ui text-foreground")} data-theme="light">
      <main className="mx-auto flex max-w-marketing flex-col gap-16 gutter-x py-14">
        <header className="flex flex-col gap-4">
          <Link href="/design-preview" className="text-label text-muted-foreground underline-offset-4 hover:underline">← Design system</Link>
          <h1 className="text-display font-semibold text-balance">Two layout directions</h1>
          <p className="max-w-[44rem] text-lead text-muted-foreground">
            Same design system, same example story (the “day two” onboarding post), two different structures. Click through the navigation,
            panels and sheets. Nothing is generated, posted or scheduled; copy on these screens is still a proposal.
          </p>
        </header>

        <section aria-labelledby="open" className="flex flex-col gap-5">
          <h2 id="open" className="text-title-sm font-semibold">Open the prototypes</h2>
          <div className="overflow-x-auto rounded-card border border-border bg-surface">
            <table className="w-full text-label">
              <thead className="bg-surface-muted/70 text-caption text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Screen</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">A · Studio desk</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">B · Focus flow</th>
                </tr>
              </thead>
              <tbody>
                {SCREENS.map(([id, label]) => (
                  <tr key={id} className="border-t border-border">
                    <th scope="row" className="px-4 py-3 text-left font-medium">{label}</th>
                    <td className="px-4 py-3"><div className="flex gap-2"><ProtoLink dir="a" screen={id} device="desktop" /><ProtoLink dir="a" screen={id} device="mobile" /></div></td>
                    <td className="px-4 py-3"><div className="flex gap-2"><ProtoLink dir="b" screen={id} device="desktop" /><ProtoLink dir="b" screen={id} device="mobile" /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-caption text-muted-foreground">Inside a prototype, the dark bar at the top switches screen, device, theme and direction.</p>
        </section>

        <section aria-labelledby="compare" className="flex flex-col gap-5">
          <h2 id="compare" className="text-title-sm font-semibold">How they differ</h2>
          <dl className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface">
            {COMPARE.map((row) => (
              <div key={row.aspect} className="grid gap-3 p-5 md:grid-cols-[10rem_1fr_1fr] md:gap-8">
                <dt className="text-label font-semibold">{row.aspect}</dt>
                <dd className="text-label"><span className="mb-1 block text-caption font-medium text-muted-foreground md:hidden">A</span>{row.a}</dd>
                <dd className="text-label"><span className="mb-1 block text-caption font-medium text-muted-foreground md:hidden">B</span>{row.b}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="rec" className="flex flex-col gap-6 rounded-showcase border border-brand/40 bg-brand-soft/40 p-6 md:p-10">
          <p className="text-label font-medium text-brand">Recommendation</p>
          <h2 id="rec" className="text-title font-semibold text-balance">Direction A, with B&apos;s mobile tab bar and Go to… palette</h2>
          <dl className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <dt className="text-body font-semibold">What users notice first</dt>
              <dd className="text-label text-muted-foreground">The work itself: the brief line on Generate, the post on the canvas. On the landing page, one headline and then the real product, not icons.</dd>
            </div>
            <div className="flex flex-col gap-1.5">
              <dt className="text-body font-semibold">How they start the main task</dt>
              <dd className="text-label text-muted-foreground">Type a topic (or leave it blank), scan ten numbered ideas, open one in the detail column, press “Develop this idea”. New post is in the top bar from anywhere.</dd>
            </div>
            <div className="flex flex-col gap-1.5">
              <dt className="text-body font-semibold">Where secondary tools live</dt>
              <dd className="text-label text-muted-foreground">Each area&apos;s sub-tabs (Calendar, Ideas board, History, Pinned; LinkedIn/X with their six tabs), the account menu (settings, billing, referrals, Start Page, all tools), and the editor&apos;s side panel.</dd>
            </div>
            <div className="flex flex-col gap-1.5">
              <dt className="text-body font-semibold">Why it suits CarouseLabs</dt>
              <dd className="text-label text-muted-foreground">
                People come to do a batch of work: scan ideas, make a post, schedule it. A list with a detail view is faster than one-at-a-time for 10–30 ideas;
                an 8-slide carousel needs the centre of the screen; the calendar needs full width; and the three activities match the three products, so the
                separately sold extensions get a clear home without crowding.
              </dd>
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <dt className="text-body font-semibold">Trade-offs</dt>
              <dd className="text-label text-muted-foreground">
                The two-row header uses about 100px of height (B uses 56px) — the sub-row can tuck away on scroll in Phase 3. Engage&apos;s row is dense (platform
                switch + six tabs). A is calmer but less surprising than B&apos;s spotlight, and A&apos;s own mobile menu is weaker than B&apos;s tab bar, hence the borrow.
                B&apos;s audience switch on the landing page is worth testing for the Engage section in Phase 1.
              </dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="map" className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h2 id="map" className="text-title-sm font-semibold">Every destination, in both directions</h2>
            <p className="max-w-[44rem] text-label text-muted-foreground">
              All {ORDER.length} customer-app destinations keep their routes. Intern accounts still see only Intern Points. Admin keeps its sidebar — dense
              operational work suits it.
            </p>
          </div>
          <div className="overflow-x-auto rounded-card border border-border bg-surface">
            <table className="w-full text-label">
              <thead className="bg-surface-muted/70 text-caption text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Destination</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Route</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">A · Studio desk</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">B · Focus flow</th>
                </tr>
              </thead>
              <tbody>
                {ORDER.map((id) => (
                  <tr key={id} className="border-t border-border align-top">
                    <th scope="row" className="px-4 py-2.5 text-left font-medium whitespace-nowrap">{destinations[id].label}</th>
                    <td className="px-4 py-2.5"><code className="text-caption">{destinations[id].route}</code></td>
                    <td className="px-4 py-2.5 text-muted-foreground">{placement[id].a}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{placement[id].b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
