import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { ProductStage, type StageStep } from "@/components/landing/ProductStage"

// Copy is unchanged from the previous hero, How it works and the "Export &
// Publish" feature; only the composition is new (Phase 1, approved layout A).
const STEPS: StageStep[] = [
  {
    id: "ideas",
    title: "Get AI-powered ideas",
    description: "Start with fresh post ideas generated from trending news and tailored to your niche, audience, and goals.",
  },
  {
    id: "caption",
    title: "Build your caption",
    description:
      "Turn any idea into a high-performing caption with AI ghostwriting that sounds like you — tone controls and hook variations included.",
  },
  {
    id: "visuals",
    title: "Generate images & carousels",
    description: "Produce stunning visuals and multi-slide carousels sized for each platform, then export and publish in a click.",
  },
  {
    id: "publish",
    title: "Export & Publish",
    description: "Download PDF carousels, copy captions, and publish directly — one click away from going live.",
  },
]

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="font-ui">
      <div className="mx-auto flex max-w-showcase flex-col gap-10 gutter-x pt-10 pb-16 sm:pt-16 lg:gap-14 lg:pb-24">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
          <div className="flex flex-col gap-5">
            <p className="text-label font-medium text-brand">AI-powered content creation</p>
            <h1 id="hero-title" className="text-display font-semibold text-balance text-foreground">
              Create viral content for <span className="font-display font-normal italic">every platform</span>
            </h1>
          </div>
          <div className="flex flex-col gap-6 lg:pb-2">
            <p className="text-body-lg text-pretty text-muted-foreground">
              Tell CarouseLabs about your business and it generates post ideas, writes your captions, and creates the images and
              carousels — ready for LinkedIn, Instagram, and Twitter/X in minutes.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/sign-up" className={buttonVariants({ size: "lg" })}>
                Start for free
                <ArrowRight aria-hidden />
              </Link>
              <Link href="#how-it-works" className={buttonVariants({ size: "lg", variant: "outline" })}>
                See how it works
              </Link>
            </div>
          </div>
        </div>

        <div id="how-it-works" className="flex scroll-mt-20 flex-col gap-5">
          <div className="flex flex-col gap-1 lg:hidden">
            <p className="text-label font-medium text-brand">How it works</p>
            <h2 className="text-title-sm font-semibold">From idea to published post</h2>
          </div>
          <ProductStage eyebrow="How it works" title="From idea to published post" steps={STEPS} />
        </div>
      </div>
    </section>
  )
}
