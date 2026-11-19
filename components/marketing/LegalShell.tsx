import type { ReactNode } from "react"

// Legal pages: a white reading panel on the lavender ground. No motion; the text inside each page is
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
    <div className="wrap-site pt-6 pb-20 sm:pt-10">
    <article className="mx-auto max-w-[52rem] rounded-[28px] bg-surface px-5 py-10 shadow-card ring-1 ring-[#100C33]/5 sm:px-12 sm:py-14">
      <header className="mb-12 flex flex-col gap-3 border-b border-border pb-10">
        <p className="text-label font-medium text-brand">CarouseLabs</p>
        <h1 className="text-title font-semibold sm:text-[2.75rem] sm:leading-[1.1] sm:tracking-[-0.03em]">{title}</h1>
        <p className="text-label text-muted-foreground">Last updated: {updated}</p>
        {intro && <p className="mt-3 text-body-lg text-muted-foreground">{intro}</p>}
      </header>

      <div className="flex flex-col gap-10">{children}</div>
    </article>
    </div>
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
