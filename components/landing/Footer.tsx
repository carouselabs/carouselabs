import Link from "next/link"

// Same links as before, grouped. Group names are new layout labels
// (docs/redesign/copy-ledger.md). On the night ground, after anantgoyal.in.
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
    <footer className="ground-night font-ui text-white">
      <div className="wrap-site grid gap-12 py-16 md:grid-cols-12 md:gap-6 lg:py-20">
        <div className="flex flex-col gap-4 md:col-span-6">
          <Link href="/" className="flex items-center gap-2.5 self-start text-xl font-semibold tracking-[-0.02em]">
            <span className="grid size-9 place-items-center rounded-full bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.png" alt="" className="size-8" />
            </span>
            <span>CarouseLabs</span>
          </Link>
          <a href="mailto:support@carouselabs.com" className="inline-flex min-h-11 items-center self-start text-[15px] text-white/80 hover:text-white">
            <span className="link-draw">support@carouselabs.com</span>
          </a>
        </div>
        {GROUPS.map((group) => (
          <nav key={group.label} aria-label={group.label} className="flex flex-col gap-3 md:col-span-2">
            <h2 className="text-[13px] font-medium text-white/60">{group.label}</h2>
            <ul className="flex flex-col">
              {group.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="inline-flex min-h-11 items-center text-[15px] text-white/90 hover:text-white">
                    <span className="link-draw">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="wrap-site pb-10">
        <p className="border-t border-white/15 pt-6 text-[13px] text-white/65">© 2026 CarouseLabs. All rights reserved.</p>
      </div>
    </footer>
  )
}
