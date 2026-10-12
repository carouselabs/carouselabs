import { notFound } from "next/navigation"

import { fontVariables } from "@/lib/fonts"
import { StartPageView } from "@/components/startpage/StartPageView"
import { START_PAGE_THEMES } from "@/lib/startPage"

// Development-only: the public Start Page in each theme with EXAMPLE data
// (no database record is read or created).
const LINKS = [
  { id: "example-1", label: "Read my newsletter" },
  { id: "example-2", label: "Book a call" },
  { id: "example-3", label: "Latest carousel" },
]

export default function StartPagePreview() {
  if (process.env.NODE_ENV !== "development") notFound()
  return (
    <div data-theme="light" className={`${fontVariables} grid gap-px bg-border font-ui lg:grid-cols-3`}>
      {START_PAGE_THEMES.map((theme) => (
        <section key={theme} aria-label={`${theme} theme`}>
          <p className="bg-background px-4 py-2 text-caption text-muted-foreground">Theme: {theme} · example</p>
          <StartPageView
            title="Aarav Mehta"
            bio="Founder at Northwind Analytics. Writing about SaaS growth."
            avatarUrl={null}
            theme={theme}
            slug="aarav"
            links={LINKS}
          />
        </section>
      ))}
    </div>
  )
}
