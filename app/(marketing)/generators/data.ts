// app/(marketing)/generators/data.ts
// Generic product/feature-keyword SEO pages at /generators/[slug] — distinct
// from the niche-specific /tools/[slug] pages (which target "AI tools for
// SaaS founders" style keywords). These target the underlying product/feature
// terms themselves ("LinkedIn carousel maker", "AI caption generator") with
// no audience attached.

export interface GeneratorPage {
  slug: string
  keyword: string
  h1: string
  metaTitle: string
  metaDescription: string
  intro: string
  howItWorks: { step: string; description: string }[]
  useCases: string[]
  faq: { question: string; answer: string }[]
  relatedSlugs: string[]
}

export const GENERATOR_PAGES: GeneratorPage[] = [
  {
    slug: "linkedin-carousel-maker",
    keyword: "LinkedIn Carousel Maker",
    h1: "LinkedIn Carousel Maker: Turn Any Idea Into a Multi-Slide Post",
    metaTitle: "LinkedIn Carousel Maker — Turn Any Idea Into a Carousel | CarouseLabs",
    metaDescription:
      "Make a LinkedIn carousel in minutes with CarouseLabs' AI carousel maker. Give it a topic, choose your structure, and get a caption plus a full multi-slide carousel ready to post.",
    intro:
      "A LinkedIn carousel maker takes one idea and turns it into a multi-slide document post — the swipeable format that consistently outperforms plain text and single images in the LinkedIn feed, because each swipe is a fresh chance to hold attention. The catch is that building one by hand usually means writing the narrative arc yourself, then opening a design tool to lay out 7 or 8 slides so they look like one coherent set. CarouseLabs collapses that into a single flow: you describe your idea, choose how you want the story structured, and the tool writes the caption and designs every slide — matching fonts, colors, and layout across the whole set — so what used to take an afternoon takes a few minutes.",
    howItWorks: [
      {
        step: "Enter your topic or idea",
        description:
          "Type out what you want to post about — a lesson, a framework, a story, a mistake you made. A few sentences of raw material is enough to work with.",
      },
      {
        step: "Choose your platform and caption style",
        description:
          "Select LinkedIn (or another platform) and pick how the caption should be structured — let AI decide, choose a proven framework, or describe your own.",
      },
      {
        step: "Pick your carousel structure",
        description:
          "Choose from over 30 slide-flow templates (problem → solution, before → after, myth vs. truth, and more), describe your own structure, or let AI design one from scratch based on your topic.",
      },
      {
        step: "Review your caption and slides",
        description:
          "CarouseLabs generates a full caption and a 7-9 slide carousel with consistent typography, color, and layout — upload a past post as a style reference if you want it to match your existing visual brand.",
      },
      {
        step: "Download and post",
        description:
          "Export the slides and post directly to LinkedIn, or download them to upload manually as a PDF document for the classic swipeable carousel format.",
      },
    ],
    useCases: [
      "LinkedIn creators and ghostwriters who need to publish several carousels a week without spending hours in a design tool for each one",
      "B2B marketers turning product features, case studies, or research into carousels that explain rather than just announce",
      "Coaches and consultants packaging a framework or process into a teachable, saveable slide format",
      "Founders documenting lessons learned or building in public, who want their story told with a clear beginning, middle, and end",
      "Social media managers batching a week or month of carousel content in a single sitting",
    ],
    faq: [
      {
        question: "How many slides should a LinkedIn carousel have?",
        answer:
          "Most high-performing LinkedIn carousels run 7 to 9 slides — enough room to set up a hook, deliver the substance, and close with a clear takeaway, without so many slides that readers drop off. CarouseLabs chooses the exact count within that range based on how much your specific topic actually needs to say, rather than forcing every post to the same length.",
      },
      {
        question: "Do I need design skills to use a LinkedIn carousel maker?",
        answer:
          "No. CarouseLabs handles the layout, typography, and visual consistency across every slide automatically. You choose the content structure and, optionally, a style reference — the design decisions happen for you.",
      },
      {
        question: "Can the carousel match my personal brand's visual style?",
        answer:
          "Yes. Upload a past post or any reference image and CarouseLabs will reverse-engineer its color palette, typography treatment, and illustration style, then apply that same visual language to your new carousel — while every slide's content and artwork is generated fresh, not copied.",
      },
    ],
    relatedSlugs: [
      "linkedin-carousel-generator",
      "ai-carousel-generator",
      "linkedin-carousel-template",
      "carousel-post-maker",
    ],
  },

  {
    slug: "ai-caption-generator",
    keyword: "AI Caption Generator",
    h1: "AI Caption Generator for Scroll-Stopping Social Posts",
    metaTitle: "AI Caption Generator — Platform-Aware Captions in Seconds | CarouseLabs",
    metaDescription:
      "CarouseLabs' AI caption generator writes platform-aware captions with a real hook, structure, and voice — not generic filler. Pick your platform, describe your idea, and get a caption plus alternate hooks.",
    intro:
      "Most AI caption generators do one thing: turn a rough sentence into a slightly more polished paragraph, with the same generic tone no matter what platform it's headed for or what the post is actually trying to do. That's the gap CarouseLabs' caption generator is built to close. It asks what platform the caption is for, because a LinkedIn post and an X post earn attention differently, and it asks how you want the caption structured, so the output has an actual narrative shape — a hook, a build, a payoff — rather than reading like a rewritten version of your input. You get a finished caption plus a few alternate opening lines, so you're never stuck with just one option to work with.",
    howItWorks: [
      {
        step: "Pick your platform",
        description:
          "Choose LinkedIn, Instagram, X, or another supported platform. Character limits, tone, and pacing are tuned to match.",
      },
      {
        step: "Share your topic or idea",
        description:
          "Give it the core idea, story, or point you want to make — a few lines of raw thinking is all it needs to start.",
      },
      {
        step: "Choose a caption structure",
        description:
          "Let the AI decide the best structure for your topic, pick from proven frameworks, or describe exactly how you want it organized.",
      },
      {
        step: "Get your caption and hook options",
        description:
          "Review the full caption alongside a few alternate opening lines, so you can swap the hook without regenerating the whole thing.",
      },
      {
        step: "Regenerate with specific instructions if needed",
        description:
          "Not quite right? Tell it what to change — shorter, funnier, more data-driven — and it edits the existing caption instead of starting over.",
      },
    ],
    useCases: [
      "Solo creators and freelancers who don't have a ghostwriter but still need to post consistently",
      "Marketing teams writing captions across multiple platforms who don't want one generic voice repeated everywhere",
      "Founders who know what they want to say but freeze up in front of a blank caption box",
      "Agencies producing captions for multiple client accounts, each needing its own voice and platform fit",
      "Non-native English speakers who want their ideas expressed in polished, natural-sounding copy",
    ],
    faq: [
      {
        question: "Does this AI caption generator work for platforms other than LinkedIn?",
        answer:
          "Yes. You choose your target platform up front — including Instagram and X — and the caption's length, tone, and structure adjust to fit that platform's norms rather than using one generic format everywhere.",
      },
      {
        question: "How is this different from a general-purpose AI writing tool?",
        answer:
          "A general AI writing tool doesn't know what a scroll-stopping hook looks like on a specific platform or how to structure a caption for engagement. CarouseLabs is built specifically around caption structures that are proven to work, with platform-specific tone and length baked in, rather than being a generic text rewriter.",
      },
      {
        question: "Can I control the tone of the generated caption?",
        answer:
          "Yes. You can select a tone when generating, and if you've saved writing-voice guidelines, the generator will apply them automatically so captions sound like you rather than like a generic AI.",
      },
    ],
    relatedSlugs: [
      "linkedin-caption-generator",
      "instagram-caption-generator",
      "linkedin-hook-generator",
      "social-media-caption-generator",
    ],
  },

  {
    slug: "free-linkedin-post-generator",
    keyword: "Free LinkedIn Post Generator",
    h1: "Free LinkedIn Post Generator — Create Your First Post at No Cost",
    metaTitle: "Free LinkedIn Post Generator — Try CarouseLabs at No Cost",
    metaDescription:
      "Generate a full LinkedIn post — caption, and optionally an image or carousel — for free with CarouseLabs. No credit card required to create your first post.",
    intro:
      "Searching for a free LinkedIn post generator usually means one of two things: you want to see whether AI-generated content actually sounds like something worth posting before paying for anything, or you just need a genuinely no-cost way to get your first post out the door. CarouseLabs is built for exactly that — you can sign up without a credit card and generate a full post, complete caption included, at no cost. This page is deliberately upfront about what \"free\" means here: it's a real, complete first post, not a stripped-down demo or a locked preview. Once you've seen the quality for yourself, upgrading for ongoing use is optional, not a requirement to see what the tool can do.",
    howItWorks: [
      {
        step: "Sign up for free",
        description: "Create an account with no credit card required — you're generating real output from the first step, not a locked trial.",
      },
      {
        step: "Enter your idea or pick a trending one",
        description:
          "Describe your own idea, or browse AI-surfaced trending topics in your niche if you're not sure what to post about yet.",
      },
      {
        step: "Generate your caption",
        description:
          "Get a complete, platform-aware LinkedIn caption built around your idea, with alternate hook options included.",
      },
      {
        step: "Optionally add an image or full carousel",
        description:
          "Turn the same idea into a single AI-generated image or a full multi-slide carousel, depending on which format fits your post.",
      },
      {
        step: "Post directly or download",
        description: "Publish straight to LinkedIn from CarouseLabs, or download your content to post manually whenever you're ready.",
      },
    ],
    useCases: [
      "First-time users who want to see whether AI-generated content actually sounds like their voice before committing to a paid plan",
      "Students and job seekers building a LinkedIn presence on a tight budget",
      "Small business owners testing content tools before deciding whether to invest in a subscription",
      "Freelancers evaluating whether to recommend the tool to clients before spending anything themselves",
      "Anyone who just wants to get one solid post published today without a paywall in the way",
    ],
    faq: [
      {
        question: "Is this actually free, or is there a hidden paywall?",
        answer:
          "It's genuinely free to create your first full post — caption, and your choice of an AI image or a complete carousel — with no credit card required to sign up. Continued use beyond that first post moves to a paid plan, which is stated plainly rather than hidden behind a surprise paywall mid-generation.",
      },
      {
        question: "What's the difference between the free plan and a paid plan?",
        answer:
          "The free plan gives you one full post on the house so you can evaluate the quality of the captions, images, and carousels for yourself. Paid plans unlock ongoing monthly generation, carousel creation, and higher-volume use for creators and teams posting regularly.",
      },
      {
        question: "Do I need a credit card to try it?",
        answer:
          "No. You can sign up and generate your first LinkedIn post without entering any payment details.",
      },
    ],
    relatedSlugs: [
      "free-ai-caption-generator",
      "free-linkedin-carousel-maker",
      "linkedin-post-generator",
      "ai-content-creation-tool-for-linkedin",
    ],
  },
]
