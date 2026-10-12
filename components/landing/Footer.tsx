import Link from "next/link"

// Same links as before, grouped. Group names are new layout labels
// (docs/redesign/copy-ledger.md).
const GROUPS = [
  {
    label: "Product",
    links: [
      { href: "/#pricing", label: "Pricing" },
      { href: "/#referrals", label: "Referrals" },
    ],
  },
  {
    label: "Resources",
    links: [
      { href: "/tools/tap-hold-maker", label: "Tap & Hold Maker (Free)" },
      { href: "/verify-certificate", label: "Verify Certificate" },
      { href: "/#contact", label: "Contact" },
    ],
  },
  {
    label: "Legal",
    links: [
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
      { href: "/refund", label: "Refund" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-border font-ui">
      <div className="mx-auto grid max-w-showcase gap-10 gutter-x py-12 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] lg:py-16">
        <div className="flex flex-col gap-4">
          <Link href="/" className="flex items-center gap-2 self-start text-body font-semibold tracking-[-0.02em]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="CarouseLabs" className="size-7" />
            <span>CarouseLabs</span>
          </Link>
          <a href="mailto:support@carouselabs.com" className="self-start text-label text-muted-foreground hover:text-foreground">
            support@carouselabs.com
          </a>
        </div>
        {GROUPS.map((group) => (
          <nav key={group.label} aria-label={group.label} className="flex flex-col gap-3">
            <h2 className="text-caption font-medium text-muted-foreground">{group.label}</h2>
            <ul className="flex flex-col gap-1">
              {group.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="inline-flex min-h-9 items-center text-label text-foreground hover:underline hover:underline-offset-4">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto max-w-showcase gutter-x pb-10">
        <p className="border-t border-border pt-6 text-caption text-muted-foreground">© 2026 CarouseLabs. All rights reserved.</p>
      </div>
    </footer>
  )
}
