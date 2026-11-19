import { ProductStage, type StageStep } from "@/components/landing/ProductStage"

// Copy is unchanged from the previous hero's How it works and the "Export &
// Publish" feature. The section now stands on its own after the hero.
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

// The marquee's words: the platforms and formats CarouseLabs makes (the
// create flow's own platform list and output types).
const FORMATS = [
  "LinkedIn posts",
  "Instagram carousels",
  "Twitter/X threads",
  "Facebook posts",
  "Threads",
  "Pinterest pins",
  "Captions",
  "Single images",
  "PDF carousels",
  "YouTube thumbnails",
]

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-24 bg-surface font-ui">
      <div className="wrap-site flex flex-col gap-12 py-24 lg:py-[120px]">
        <div className="flex flex-col gap-4">
          <p className="text-[13px] font-medium text-brand">How it works</p>
          <h2 id="how-title" className="max-w-[18ch] text-[clamp(2rem,1.1rem+2.5vw,3.25rem)] leading-[1] font-semibold tracking-[-0.04em] text-balance">
            From idea to <span className="serif-accent gradient-word pr-[0.04em] text-[1.08em]">published post</span>
          </h2>
        </div>
        <ProductStage label="From idea to published post" steps={STEPS} />
        {/* A dealt moment (taste skill): the formats run sideways under the
            demo, pause under the pointer, and carry a pause button. */}
        <div data-moment="marquee-row" data-moment-opts='{"speed": 34, "gap": 56}' className="-mt-2">
          <ul className="mo-mq__track">
            {FORMATS.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
