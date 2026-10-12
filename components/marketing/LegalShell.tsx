import type { ReactNode } from "react"

// Legal pages: a calm reading column. No motion; the text inside each page is
// unchanged and must stay so (see docs/redesign).
export function LegalShell({
  title,
  updated,
  intro,
  children,
}: {
  title: string
  updated: string
  intro?: string
  children: ReactNode
}) {
  return (
    <article className="mx-auto max-w-reading gutter-x pt-12 pb-20 sm:pt-20">
      <header className="mb-12 flex flex-col gap-3 border-b border-border pb-10">
        <p className="text-label font-medium text-brand">CarouseLabs</p>
        <h1 className="text-title font-semibold sm:text-[2.75rem] sm:leading-[1.1] sm:tracking-[-0.03em]">{title}</h1>
        <p className="text-label text-muted-foreground">Last updated: {updated}</p>
        {intro && <p className="mt-3 text-body-lg text-muted-foreground">{intro}</p>}
      </header>

      <div className="flex flex-col gap-10">{children}</div>
    </article>
  )
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-title-sm font-semibold">{heading}</h2>
      <div className="flex flex-col gap-3 text-body text-muted-foreground [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-4">{children}</div>
    </section>
  )
}
