# Proposed landing page structure

Pending owner approval. Every existing anchor stays (`#how-it-works`, `#extension`, `#x-extension`, `#pricing`, `#referrals`, `#contact`); no new public routes.

| # | Section | Anchor | What it shows | Motion |
| --- | --- | --- | --- | --- |
| 1 | Navbar | — | Logo · Product · Engage · Pricing · Resources · Contact · Sign in · Start for free. Resources holds the free Tap & Hold maker and certificate verification. Accessible mobile menu | None |
| 2 | Hero | — | Editorial split: promise, subhead, Start for free + See how it works, a quiet Engage link; right side a real studio composition (idea → caption → carousel) in a neutral browser frame, labeled "Example" until real captures exist | Optional one-time headline blur-in (≤420ms); static is the baseline |
| 3 | Evidence | — | Only verified numbers, logos with permission, or a dated Chrome Web Store rating. **Omitted entirely until assets exist** | None |
| 4 | Product tour | `#how-it-works` | Four chapters: Find an angle · Make it sound like you · Turn words into visuals · Publish on your terms. Replaces How it works + the six-feature grid. No "coming soon" placeholder | Desktop: one bounded GSAP pinned story with step buttons. Mobile / reduced motion / no JS: stacked chapters |
| 5 | Engage | `#extension`, `#x-extension` | LinkedIn / X switch; each panel has its own full product name, $15/month, 10 free generations, install link and checkout; separate subscription stated next to the price | 180ms panel fade |
| 6 | Supporting tools | — | Asymmetric grid: Thumbnail recreation (real reference/result pair), Content Hub (real calendar), Tap & Hold maker, Start Page, voice profiles, AI agents — each labeled Studio, Extension or Free tool | One faint pointer spotlight on one card (desktop only) |
| 7 | Testimonials | — | Up to three real, approved quotes. **Omitted until supplied** | None |
| 8 | Pricing | `#pricing` | Tabs: Studio plans (Free · Pro "Most Popular" · Growth, aligned rows) / Engage extensions (LinkedIn, X). "How credits work" disclosure with all five costs. All values from lib/plans.ts and lib/creditActions.ts | None |
| 9 | FAQ | — | Existing answers via the existing FAQ component | Accordion only |
| 10 | Referral | `#referrals` | Compact band: 8% recurring, 50 bonus credits if the friend stays free, real link action | None |
| 11 | Final CTA | — | One approved headline, Start for free | None |
| 12 | Contact | `#contact` | Existing form and support email, compact two-column | None |
| 13 | Footer | — | Product · Resources · Company · Legal groups, support email, copyright; social links only when supplied | None |

Removed from today's page: the floating sticker badges, the "Calendar preview coming soon" placeholder, the third hero button, the unverified "1,000+ creators" line, the amber Growth styling.
