import { BookOpen, LayoutGrid, Lightbulb, PenLine, Share2 } from "lucide-react"

// "Export & Publish" now lives in the product demo above (Hero), so it
// isn't repeated here. All other copy is unchanged.
const FEATURES = [
  {
    icon: Lightbulb,
    title: "AI Idea Engine",
    description: "Get 10 post ideas every session, grounded in trending news and shaped by your niche and goals.",
  },
  {
    icon: PenLine,
    title: "AI Ghostwriting",
    description: "Full-length captions written in your voice, with a tone selector and multiple hook variations.",
  },
  {
    icon: BookOpen,
    title: "Deep Dive Breakdowns",
    description: "Structured breakdowns — objective, emotion, talking points, storytelling angle, and CTA — for every post.",
  },
  {
    icon: LayoutGrid,
    title: "AI Carousels",
    description: "Multi-slide carousel decks with AI-generated visuals, sized perfectly for each platform.",
  },
  {
    icon: Share2,
    title: "Built for Every Platform",
    description: "Create and adapt content for LinkedIn, Instagram, and Twitter/X from a single workflow.",
  },
]

/** Editorial index: the heading holds its place while the list reads down. */
export function FeaturesGrid() {
  return (
    <section aria-labelledby="features-title" className="border-t border-border font-ui">
      <div className="mx-auto grid max-w-showcase gap-10 gutter-x section-y lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-20">
        <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <p className="text-label font-medium text-brand">Features</p>
          <h2 id="features-title" className="text-section font-semibold text-balance">
            Everything you need to own social media
          </h2>
          <p className="max-w-[32rem] text-body-lg text-muted-foreground">
            From idea to published post on LinkedIn, Instagram, and Twitter/X — CarouseLabs handles every step of your content workflow.
          </p>
        </div>
        <ul className="flex flex-col">
          {FEATURES.map((f) => (
            <li key={f.title} className="grid grid-cols-[2.5rem_1fr] gap-4 border-t border-border py-6 first:border-t-0 first:pt-0 lg:py-8">
                <f.icon className="mt-1 size-5 text-muted-foreground" strokeWidth={1.8} aria-hidden />
                <div className="flex flex-col gap-2">
                  <h3 className="text-body-lg font-semibold">{f.title}</h3>
                  <p className="text-body text-muted-foreground">{f.description}</p>
                </div>
              </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
