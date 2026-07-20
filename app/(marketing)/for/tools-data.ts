import type { NicheResult, ToolBenefit } from "./data"

/**
 * Per-niche content that powers the /tools/[slug] pages. Kept in its own module
 * so the large body of tools content stays separate from the base niche records
 * in ./data.ts, where it is merged into the exported `niches` array by slug.
 *
 * Every slug in data.ts must have a matching entry here — the merge throws at
 * build time if one is missing.
 *
 * Note on `tool_name`: the same four names are used for every niche because
 * they describe real product surfaces (idea generation, /generate/caption,
 * /generate/carousel, /generate/image). Only benefit / time_saved /
 * example_output are niche-specific.
 */
export interface ToolsContent {
  tool_benefits: ToolBenefit[]
  use_cases: string[]
  results: NicheResult[]
}

export const toolsContent: Record<string, ToolsContent> = {
  "saas-founders": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Every morning it scans real SaaS news, funding announcements, and product launches, then hands you 10 post angles tied to what's actually happening in your market this week. For a founder, the hard part was never having opinions — it was remembering that the churn conversation from Tuesday was worth writing about. This turns the blank page into a shortlist you edit rather than a void you stare at.",
        time_saved: "Saves ~3 hours a week of idea hunting",
        example_output:
          "\"Three SaaS companies raised Series A this week by leading with retention, not growth. Here's what their pitch decks had in common — and what yours is probably missing.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drop in your raw metric and the change behind it, and it drafts a caption that keeps the number front and centre in plain English. It's tuned to translate technical products for non-technical buyers, so your activation-rate story reads for a VP of Ops rather than your engineering team. You edit for truth and voice instead of fighting the first draft.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "\"Our churn was 6% a month. We didn't ship a single feature to fix it. We added a 3-step activation checklist — users hit their first win in 10 minutes instead of never. Churn: 3.6% in 60 days.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns one founder story into a full 7–8 slide narrative that follows the arc buyers actually think in: hook, problem with a real number, the wrong assumption, the insight, the change, the result, a soft CTA. You're editing a structured draft rather than wrestling slides into Canva at midnight.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide teardown titled \"How We Cut Churn 40% Without Touching the Product\" — churn curve, the week-two drop-off, the empty-dashboard problem, the activation checklist, the 60-day result, and a comment prompt.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Upload one reference image and it matches your brand colours and style on every slide and visual from then on. For a SaaS founder this matters more than it sounds — buyers extrapolate from your feed to your product, and a scattered visual identity quietly signals a scattered company. You get a designed-looking feed without hiring a designer.",
        time_saved: "Saves ~1 hour per post, and the cost of a designer",
        example_output:
          "On-brand slide visuals and a cover image in your exact product palette — plus sized variants for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning Monday's metrics review into Tuesday's post — you already pull the numbers, so the caption writer converts the one that moved into a story with the change behind it, before the insight goes stale.",
      "Publishing the churn or support conversation you had this week as a teaching carousel, so the objections your customers voice become the answers your future buyers find.",
      "Batching a full week of build-in-public content in one sitting, so posting stops competing with shipping and the three-week silences that reset your reach finally end.",
      "Explaining one technical concept per week in plain English, which is what makes non-technical buyers, journalists, and investors remember you as the founder who makes the complicated simple.",
      "Turning a killed feature or a pricing reversal into an honest post — the counterintuitive founder content that gets shared in other founders' group chats and lands you in front of their audiences.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "3 hours", after: "15 minutes" },
      { metric: "Posts published per month", before: "2 (when a milestone hits)", after: "12 (batched weekly)" },
      { metric: "Design cost per post", before: "$80 freelancer or 90 min in Canva", after: "$0 — brand-matched automatically" },
    ],
  },
  "fitness-coaches": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Hands you 10 angles a day drawn from fitness research, trends, and the questions your ideal client is actually asking — so on the days your brain is fried from back-to-back sessions, you still have something worth posting. Crucially, it leans toward adherence and psychology angles rather than another workout clip, which is what reaches the paying professional instead of other coaches.",
        time_saved: "Saves ~2.5 hours a week of thinking up content",
        example_output:
          "\"Your client didn't fall off because they lack discipline. They fell off because the plan assumed a week that never happens. Here's the minimum viable version.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Give it a few bullets about a client's habit change and it drafts an empathetic, systems-based caption that takes blame off the client and puts it on the plan. It's tuned away from 'no excuses' shaming, which is exactly the tone that repels the stressed professional who's already failed five gym plans and blames themselves.",
        time_saved: "Saves ~40 minutes per post",
        example_output:
          "\"She'd restarted 5 times in a year. We didn't change her workout — we cut it from 60 minutes to 20 and moved it before her kids woke up. 8 months later she hasn't missed a week. Adherence isn't discipline. It's design.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns a client story or a myth-bust into a full outcome-led carousel — hook, the problem your reader recognises, the trap, your method, the sustainable habit, the real result, a comment prompt. Instead of an evening researching a myth-busting post, you get a structured draft to check and publish.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide myth-bust titled \"Why You Keep Quitting (It's Not Willpower)\" — the serial-restart pattern, why extreme plans are engineered to fail, the 20-minute minimum, and a client who's 8 months consistent.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Creates warm, on-brand visuals from one reference image, so your feed doesn't default to the intimidating gym aesthetic that scares off the exact beginner you want. Consistent, approachable slides quietly signal that training with you won't be a punishing experience — which is the whole barrier for a nervous professional.",
        time_saved: "Saves ~1 hour per post",
        example_output:
          "Clean, warm slide visuals in your coaching palette — no stock six-packs — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a client's permission-cleared habit breakthrough into a story carousel from a few bullet points, so your results become marketing while you're still between sessions.",
      "Busting one fitness myth a week with the actual evidence, without losing an evening to research — the fastest route to being the credible voice above the influencer noise.",
      "Batching the whole week's content on your lightest coaching day, so the feed survives your busiest block instead of going dark for two weeks and resetting your reach.",
      "Reframing a client's 'failure' into a systems post that takes the blame off them, which is the single piece of content that makes a serial quitter finally book a discovery call.",
      "Repurposing one carousel into Instagram and Twitter/X formats, so the professional audience on LinkedIn and the fitness audience elsewhere both see it without you rebuilding it twice.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Longest gap between posts", before: "2–3 weeks during busy blocks", after: "0 — a week batched in 90 min" },
      { metric: "Weekly hours spent on content", before: "5+ hours after coaching", after: "Under 90 minutes, batched" },
    ],
  },
  "real-estate-agents": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Delivers 10 angles a day anchored to your farm area and the questions buyers and sellers actually ask, so on weeks with fewer client conversations your idea feed still fills itself. It steers you toward market insight and local knowledge rather than another 'just listed' graphic — the content that builds trust with the much larger group who'll sell someday.",
        time_saved: "Saves ~2 hours a week between showings",
        example_output:
          "\"Homes in [your neighborhood] are selling 11 days faster than in spring. Here's what that actually means if you were planning to list in the autumn.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drop in a raw MLS stat and it turns the spreadsheet into a clear takeaway a normal person wants to read. Nobody wants median-days-on-market; they want to know what it means for them. This is what makes you look like the agent who reads the market rather than one who just lists in it.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"Zillow says your home is worth $612K. My last three sales in your zip closed 4–7% above their estimate. Here's the one thing their algorithm can't see: what your street actually feels like on a Saturday morning.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your street-level knowledge into a neighbourhood-spotlight carousel — hook, the price trend, the commute, the schools, one hidden gem, and an invitation to ask. This is the format locals forward into their group chats, which is the warmest lead source in real estate and the one you can't buy.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 6-slide tour titled \"The Most Underrated Neighborhood in [your town], By the Numbers\" — price trend, commute, schools, a hidden gem, and a soft CTA.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Applies your colours, headshot placement, and template to every slide automatically. In a feed of interchangeable agent posts, visual consistency is how people start recognising you before they read your name — and you're selling trust in a six-figure decision, so a mismatched feed quietly undercuts the competence you're projecting.",
        time_saved: "Saves ~1 hour per post, and the cost of a designer",
        example_output:
          "Branded market-update and neighbourhood slides in your exact colours with consistent headshot placement — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning last month's MLS pull into a plain-English market carousel the same morning, so the data you already gather becomes the content that positions you as the local expert.",
      "Answering the question a buyer asked at a Saturday showing as a public post, because if one client asked it, hundreds of silent scrollers in your area are wondering the same thing.",
      "Building a neighbourhood-spotlight carousel that residents forward into local group chats — proving you know the streets, not just the listings.",
      "Batching a week of posts before a heavy closing stretch, so your pipeline keeps warming while you're buried in inspections instead of going cold the moment a deal closes.",
      "Reframing a 'just sold' into the staging or negotiation lesson behind it, so the listing still gets seen but the lesson is what earns the follow.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Pipeline activity between deals", before: "Goes cold after each closing", after: "Stays warm — feed runs while you close" },
      { metric: "Monthly content cost", before: "$300+ for a social media VA", after: "$24.99/month" },
    ],
  },
  "startup-founders": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Surfaces 10 angles a day from startup news and your own weekly log, so the build-in-public momentum that usually dies around week three has something to run on. The failure mode was never a lack of story — it's that by Friday you've forgotten the lost deal on Tuesday that would have made the best post of the month.",
        time_saved: "Saves ~2.5 hours a week of staring at a blank page",
        example_output:
          "\"You're not behind. You're comparing your month 8 to someone else's launch post. Here's what our month 8 actually looked like.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Takes the rough, unglamorous truth of your week and drafts a vulnerable founder post that still sounds like you rather than a LinkedIn template. It keeps the specific, slightly awkward detail — the number, the mistake, the 2am bug — which is exactly what makes build-in-public believable instead of performative.",
        time_saved: "Saves ~40 minutes per post",
        example_output:
          "\"I spent six months building the wrong thing. Not because we skipped customer calls — because I only called the customers who already liked us.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Arranges your weekly progress into the narrative arc investors actually follow — where you were, the obstacle, the decision, what you tried, what happened, what's next. It turns a status update nobody reads into a story people subscribe to, which is what makes a founder's feed compound.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide arc titled \"The Pivot That Saved Us (And The 4 Months We Wasted First)\" — the original bet, the signal we ignored, the call that changed it, and what's next.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Gives you one consistent visual identity from a single reference image, so your journey reads as a body of work rather than scattered posts. For a founder this is quietly strategic: the audience you build now is the distribution for your next launch, raise, and hire, and recognisability is what makes them stick.",
        time_saved: "Saves ~1 hour per post",
        example_output:
          "Consistent journey-post visuals in your startup's palette — sized for LinkedIn, Instagram, and Twitter/X in one pass.",
      },
    ],
    use_cases: [
      "Turning Friday's messy week — the hard hire, the lost deal, the 2am bug — into Monday's honest post, before the detail fades and the story flattens into a generic update.",
      "Documenting a milestone as a narrative arc rather than a brag, so investors watching your feed see your judgment develop rather than just your numbers go up.",
      "Batching a week of build-in-public content in one reflective sitting, so momentum survives the sprint that usually kills it around week three.",
      "Reframing a metric as a lesson — 'we hit 1,000 users and the channel that worked surprised us' — so traction reads as generosity rather than a humblebrag.",
      "Publishing the failure post you keep avoiding, which consistently outperforms your wins because everyone else in your feed is faking certainty.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "3 hours", after: "15 minutes" },
      { metric: "Build-in-public streak", before: "Dies at week 3", after: "Survives sprints — batched weekly" },
      { metric: "Weekly hours spent on content", before: "4+ hours stolen from product", after: "75 minutes, batched" },
    ],
  },
  "solopreneurs": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns the work you're already doing into a daily shortlist of angles, so content stops requiring a separate creative block you don't have. As a business of one you have no marketing team and no spare hours — this is the difference between marketing yourself and only ever meaning to.",
        time_saved: "Saves ~2 hours a week you don't have",
        example_output:
          "\"The client boundary I set last month cost me one project and saved me three weekends. Here's the exact wording I used.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Takes the one-line lesson you jotted between client calls and turns it into a full post aimed at your specific ideal client. It writes to one person rather than broadcasting to nobody, which is what makes a solo feed feel personal instead of generic.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"If you're a freelancer scared to raise your rates: the client who leaves over a 20% increase was never the client keeping your business alive.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns one lesson from your work into a value-first teaching carousel — hook, the mistake most people make, why it happens, your approach, the steps, a comment prompt. Generosity is a solopreneur's growth engine, and this makes it cost minutes rather than an afternoon.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide teardown of your process — the mistake, why it happens, your method, the step-by-step, and one thing the reader can use today.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Applies your colours and template to every carousel from one reference image, so a one-person business looks established rather than improvised. That quiet consistency answers the exact worry a prospect has about hiring a solopreneur instead of an agency: will this person be reliable?",
        time_saved: "Saves ~1 hour per post, and the cost of a designer",
        example_output:
          "On-brand, professional-looking slides in your palette with your headshot — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Capturing a lesson between client calls and publishing it the same day, so the work itself becomes the content rather than competing with it.",
      "Batching a week of posts in one session so your pipeline keeps warming during a heads-down client sprint — the exact weeks your marketing used to vanish.",
      "Turning a hard-won boundary or a slow month into an honest post, because the human behind the business is the one thing a faceless competitor can't copy.",
      "Publishing a teaching carousel that gives away your actual method, which proves your expertise and makes DIY-ers realise they'd rather hire you.",
      "Keeping every post anchored to one clear positioning, so a scattered feed turns into a business asset that tells the right person exactly why to hire you.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Marketing during client sprints", before: "Stops completely", after: "Runs on autopilot — batched" },
      { metric: "Monthly content cost", before: "$400+ for a VA or ghostwriter", after: "$24.99/month" },
    ],
  },
  "agency-owners": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Feeds you 10 angles a day tied to your point of view and your ideal client's frustrations, so marketing your own agency stops being the thing that only happens between projects. The cobbler's-children problem is really a systems problem, and this is the system.",
        time_saved: "Saves ~2.5 hours a week of your own marketing",
        example_output:
          "\"Your last agency sent you a beautiful monthly report and zero pipeline. Here's the question you should have asked in the kickoff call.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Takes a rough client result and the approach behind it and drafts a proof-driven caption in your founder voice, not a corporate brand account's. It leads with the specific outcome and the thinking, which is what prospects actually buy — agencies are hired on proof, not on service lists.",
        time_saved: "Saves ~40 minutes per post",
        example_output:
          "\"We cut a client's cost-per-lead 40% without touching their ad spend. We killed three of their five campaigns. The two that remained were the only ones ever working.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns a client win into a case-study carousel without the case-study writing project nobody has time for — the situation, the mistake, your process, the change, the result. Your best proof gets generated every week by your delivery team and previously never became content.",
        time_saved: "Saves ~2.5 hours per case-study carousel",
        example_output:
          "A 7-slide client story — the broken funnel, the misdiagnosis, the audit that found it, the fix, and the 90-day number.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Matches your agency's colours and style on every carousel from one branded reference. Your feed is a live sample of your work, so this matters more for you than most: a scrappy feed tells prospects exactly what to expect from your deliverables.",
        time_saved: "Saves ~1 hour per post of designer time",
        example_output:
          "Premium, on-brand slides in your agency's exact palette — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning last week's client win into a proof carousel in minutes, so the results your team generates finally become the marketing your agency never had time to make.",
      "Batching a week of content like it's a client account — one session, scheduled, protected — which ends the feast-or-famine pipeline that forces you to take bad-fit clients.",
      "Publishing your sharp point of view on how the work should be done, so your feed attracts the clients who agree with you and repels the ones who'd fight you on everything.",
      "Teaching one part of your process openly — the audit, the framework, the mistake you fix on every account — which wins the prospects who realise they'd rather hire the expert.",
      "Posting from your personal profile in your own voice, so prospects and future hires connect with the owner rather than a faceless brand page.",
    ],
    results: [
      { metric: "Time to produce one case-study carousel", before: "4 hours (nobody had them)", after: "20 minutes" },
      { metric: "Own-agency marketing", before: "Only between projects", after: "Weekly — batched and scheduled" },
      { metric: "Cost to produce your own content", before: "Billable hours diverted from clients", after: "$24.99/month" },
    ],
  },
  "freelancers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Gives you a daily shortlist anchored to your specialism, so your feed keeps signalling the one thing you want to be hired for. Freelancers who market as generalists compete on price — staying visibly specialised is what lets you charge more, and this keeps you on-message without a strategy session.",
        time_saved: "Saves ~2 hours a week of marketing yourself",
        example_output:
          "\"The onboarding email mistake costing SaaS companies 20% of new signups — and the three-line fix.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns a finished project into a proof-of-skill post pitched at clients who can afford you, not bargain hunters. It leads with the stakes a serious buyer cares about, which quietly filters your inbound toward budgets rather than lowballs.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"They came to me for a redesign. The problem was never the design — their signup form asked for 11 fields before it asked what the user wanted. We cut it to 3.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns one technique into a teaching carousel that proves you're the expert. Freelancers worry that teaching gives away the goods; in practice it does the opposite — it makes DIY-ers realise they'd rather hire you than fumble it, and authority is what lets you raise rates.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide breakdown of your technique — the problem, the common mistake, your method, a worked example, and a takeaway.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Applies one consistent visual identity to every post from a single reference, so you look like a professional rather than a side project. That signal reassures the exact high-value client deciding whether you're worth their budget.",
        time_saved: "Saves ~1 hour per post",
        example_output:
          "Clean, consistent, professional slides in your palette with your headshot — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a finished project into a proof-of-skill carousel, so your portfolio grows every time you deliver rather than only when you sit down to update it.",
      "Batching a week of posts so visibility keeps running during a heads-down project — which is what stops the boom-bust cycle where you scramble for work the moment a job ends.",
      "Teaching your craft openly to build the authority that justifies a rate rise, rather than competing on price with a global pool of strangers.",
      "Publishing the honest freelance-life post — the boundary, the client you fired, the lesson — because clients hire freelancers they'd actually enjoy working with.",
      "Keeping every post pointed at your specialism, so prospects arrive already knowing exactly what you do and already convinced.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Marketing during a big project", before: "Stops — then you scramble", after: "Runs in the background — batched" },
      { metric: "Cost per post", before: "Unbillable hours you can't afford", after: "$24.99/month, all-in" },
    ],
  },
  "ecommerce-founders": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns the operational grind — the supplier drama, the packaging redesign, the margin you got wrong — into a daily shortlist of angles. This is your unfair advantage: polished brand accounts can't share the mess and pure influencers don't have it, but on LinkedIn it's exactly what partners and investors want to read.",
        time_saved: "Saves ~2 hours a week between fires",
        example_output:
          "\"Our return rate was 3% until we changed one product photo. It wasn't a better photo — it was an honest one.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Takes a rough number and a hard decision and drafts a caption that leads with the specific detail rather than a product pitch. Ecommerce runs on numbers, and a number-led hook is what stops the scroll and gets your lesson saved by other founders.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"We raised prices 22% and lost 4% of customers. Revenue went up 17%. We should have done it 14 months earlier.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns one real decision — a channel, a fulfilment change, a pricing test — into a lessons-learned carousel with a proper arc. It proves you actually operate the business, which is what earns credibility with the wholesale buyers and investors quietly watching your feed.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide story titled \"We Killed Our Bestseller\" — the margin math, what we assumed, what we tried, the result, what we'd do differently.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Matches your brand palette on every slide from one reference image, so your LinkedIn feed reinforces the brand you've built rather than undercutting it. For a product founder this does double duty: it strengthens recognition and signals to buyers and investors that you understand brand-building.",
        time_saved: "Saves ~1 hour per post",
        example_output:
          "Brand-matched slides plus product-in-story visuals — sized for LinkedIn, Instagram, and Twitter/X in one pass.",
      },
    ],
    use_cases: [
      "Turning this week's supplier issue or packaging change into a behind-the-brand carousel, so the operational reality becomes the content nobody else can make.",
      "Publishing a pricing or margin lesson with the real numbers, which is the founder content that gets saved and shared rather than scrolled past.",
      "Batching a week before a launch or restock crunch, so your feed survives the chaos instead of resetting your visibility to zero every cycle.",
      "Weaving the product into a genuine story — the customer problem, the design choice, the review that surprised you — so it gets seen without your feed reading like a catalogue.",
      "Reaching the retail partners, wholesale buyers, and investors who live on LinkedIn while your competitors assume DTC only exists on Instagram.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Feed during launch/restock crunch", before: "Goes dark for weeks", after: "Keeps running — batched ahead" },
      { metric: "Reach beyond Instagram", before: "Zero B2B visibility", after: "LinkedIn, Instagram and X from one build" },
    ],
  },
  "product-managers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Hands you 10 angles a day built around the real tensions of product work rather than recycled framework summaries. Your daily prioritisation calls and killed features are content other PMs want, and this makes sure the good ones don't stay buried in Jira.",
        time_saved: "Saves ~2 hours a week of context-switching",
        example_output:
          "\"Stakeholders asked for 10 features. We shipped 2. The other 8 weren't wrong — they were just someone else's roadmap.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns a real product decision and your reasoning into a post that reads as practitioner judgment rather than a book summary. It leads with the uncomfortable trade-off, which is what earns recognition from PMs who are living the same tension right now.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"We killed our most-requested feature. Retention went up. Turns out 'most-requested' just means 'loudest' — and the loudest users were never the ones paying.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns a decision you actually made into a framework carousel grounded in the real story — the situation, the naive approach, your model, how you applied it, the outcome. That grounding is what separates a credible practitioner-thinker from someone summarising a book they read.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide framework titled \"How I Say No Without Losing the Room\" — the pressure, the naive yes, the model, the exact wording, the result.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, consistent slides from one reference so your frameworks are legible at a glance. Clear communication of complex thinking is literally the PM job, so a well-presented feed doubles as a live demonstration of the competency you want to be promoted for.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clean framework diagrams and consistent slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a prioritisation call into a teaching post the same week, so your everyday decisions become the reputation that gets you promoted.",
      "Publishing a framework you actually use, grounded in the story where you used it — which reads as judgment rather than theory.",
      "Batching a week of posts so reputation-building survives a launch crunch instead of being the first thing dropped.",
      "Sharing the feature that flopped and what you learned, because reflecting honestly on a miss signals exactly the maturity senior PM roles hire for.",
      "Naming a tension every PM feels — scope vs deadline, data vs intuition, saying no to your CEO — and getting the recognition that earns the follow.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Posting consistency", before: "Dropped during every launch", after: "Held — a week batched in 60 min" },
      { metric: "Weekly hours on personal brand", before: "0 (always lost to the next fire)", after: "60 minutes, batched" },
    ],
  },
  "ceos-executives": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns 20 minutes of your raw thinking into a week of angles built around your point of view rather than a comms team's press release. The executive objection to content is always time, and this is what makes it a leveraged activity instead of an hour a day you'll never find.",
        time_saved: "Saves ~4 hours a week you don't have",
        example_output:
          "\"We stopped doing annual reviews two years ago. Here's what replaced them, and the six months of mess in between.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Takes a hard decision you made and drafts a post that leads with conviction or genuine vulnerability instead of cautious corporate voice. Both cut through the say-nothing content most executives publish — and both are what make a leader worth following rather than a figurehead.",
        time_saved: "Saves ~40 minutes per post",
        example_output:
          "\"I made the wrong call on our biggest hire. Not because I misread them — because I'd already decided and used the interviews to confirm it.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns one leadership lesson into a carousel with the story that makes the principle credible — the situation, the decision, what you chose and why, the outcome, the principle you'd pass on. This is the content that gets you board seats, keynote invitations, and inbound talent.",
        time_saved: "Saves ~2.5 hours per carousel",
        example_output:
          "A 7-slide lesson titled \"The Layoff I Handled Badly\" — the decision, what I got wrong in the room, what I'd do now, and the principle.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Delivers executive-clean, on-brand visuals from one reference so your feed matches the standard you set for the business. At your level a sloppy feed is a credibility risk — partners, investors, and press are all reading it.",
        time_saved: "Saves ~1 hour per post of comms-team time",
        example_output:
          "Understated, executive-caliber slides in your brand palette — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Handing over 20 minutes of raw thinking on a Monday and getting a week of polished, on-brand posts back — visibility without the calendar cost.",
      "Turning a hard decision — the pivot, the layoff, the hire that transformed the team — into content that builds the trust which recruits senior talent.",
      "Publicly championing your team's wins and your culture in action, so your feed doubles as a recruiting engine in a market where senior talent is scarce.",
      "Taking a clear stand on where your industry is heading, which attracts the people who share your conviction and marks you as a leader rather than an official.",
      "Staying consistently visible through a brutal quarter, because influence compounds and a leader who only surfaces occasionally builds none.",
    ],
    results: [
      { metric: "Your time per week on content", before: "An hour a day you never found", after: "20 minutes of raw input" },
      { metric: "Posts published per month", before: "1 ghostwritten, says nothing", after: "12 in your own voice" },
      { metric: "Cost per month", before: "$2,000+ ghostwriter retainer", after: "$24.99/month" },
    ],
  },
  "serial-entrepreneurs": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Mines your multi-venture experience for daily angles, so the pattern recognition you earned across companies stops living only in your head. No first-time founder can produce this content — it requires having lived several full cycles — and this is what finally makes it visible.",
        time_saved: "Saves ~2.5 hours a week",
        example_output:
          "\"I've started 4 companies. I made the same hiring mistake in the first 3. Here's the interview question that finally fixed it.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns a cross-venture pattern into a post that leverages your battle scars rather than sounding like generic startup advice. It leads with the number of ventures and the honest lesson, which is what makes a scarred veteran instantly more trustworthy than a theory-only guru.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"Venture one, I hired for experience. Venture two, I overcorrected and hired for hunger. Venture three finally taught me what I was actually screening for.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Builds the lessons-across-ventures carousel only you could write — the same problem across different companies, how your response evolved, the principle you landed on. That arc is riveting because it shows real learning over time rather than a single lucky outcome.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide arc showing the same mistake across three ventures, the overcorrection, and the balanced approach you now swear by.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Keeps one personal visual identity across everything you build, so your audience follows you rather than any single company. That's the whole point for a serial founder — each new venture should inherit the trust you've compounded instead of launching into silence.",
        time_saved: "Saves ~1 hour per post",
        example_output:
          "A consistent personal brand identity that survives every venture — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a cross-venture pattern into a teaching carousel — content no first-time founder can produce, which is your entire differentiation.",
      "Publishing a failed venture honestly, because dissecting a loss with real specificity builds more trust than any exit announcement.",
      "Batching a week so your durable personal audience keeps compounding regardless of what your current venture demands.",
      "Building the distribution you'll own forever, so your next launch, raise, or hire starts warm instead of from cold outreach.",
      "Keeping one visual identity across ventures, so the audience follows you rather than resetting every time you start something new.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Audience at next launch", before: "Start from zero, every time", after: "Warm distribution you already own" },
      { metric: "Weekly hours on content", before: "0 — current venture eats it all", after: "60 minutes, batched" },
    ],
  },
  "vcs-investors": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns the market thinking you already do into a daily shortlist of founder-facing angles. Your thesis work happens anyway between pitches and diligence — this is what stops it dying in a Notion doc and starts it reaching the founders forming their impression of you.",
        time_saved: "Saves ~2.5 hours a week between pitches",
        example_output:
          "\"The pitch deck slide that makes me pass in 10 seconds — and it's not the traction slide.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts value-first posts aimed at founders rather than gatekeeper-speak. Founders devour honest, tactical investor insight because they can rarely get it directly, and giving it away is what makes you the first call rather than another name on a list.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"I've seen 400 seed decks this year. The ones that got funded didn't have better metrics — they had a clearer answer to 'why now'.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your evaluation process into a founder-education carousel — how you actually assess a deal, what makes a metric credible, why you passed on a company that later blew up. This is the content founders forward into their group chats, which is precisely where your next great deal is talking.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide breakdown titled \"How I Actually Read Your Metrics\" — what I check first, what I ignore, and the number that changes my mind.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, credible slides from one reference, matching the rigor founders and LPs expect. Your feed represents the judgment people are trusting with their company and their capital — a considered feed reinforces a considered investor.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Understated, credible thesis slides in your fund's palette — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning this week's market observation into a thesis post, so founders in that space think 'this investor understands what I'm building' before you've met.",
      "Publishing tactical fundraising insight founders can't get elsewhere, which builds the goodwill that makes you a first call rather than a cold email.",
      "Batching a week so your investor brand compounds through a heavy diligence period instead of going quiet exactly when founders are looking.",
      "Celebrating a portfolio founder's win publicly, which proves you're a value-add investor — the word-of-mouth that drives the best deal flow.",
      "Demystifying how you evaluate deals, so the founders you actually want start pitching you already understanding your lens.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Thesis work that reaches founders", before: "Stays in Notion", after: "Published weekly — batched" },
      { metric: "Weekly hours on content", before: "0 — pitches eat everything", after: "60 minutes, batched" },
    ],
  },
  "angel-investors": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Mines your operating background for daily angles that show why your check is worth more than someone else's. Angel investing is usually your side game, so this is what keeps your angel brand alive despite a day job — and visibility is how you get into competitive rounds without the biggest wallet.",
        time_saved: "Saves ~2 hours a week alongside your day job",
        example_output:
          "\"I've raised angel money and written angel checks. Here's what the pitch deck should actually say — from both sides of the table.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns an operating lesson into a post that connects your experience to how you help founders. It leads with your dual operator-and-investor credibility, which is insight founders can't get from a pure investor or a pure operator — and that's exactly what earns the inbound.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"I scaled a go-to-market team from 3 to 40. That's why I don't ask founders about TAM in the first meeting — I ask who's actually going to sell it.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your approach into a carousel that demystifies angel investing — how you size a check, what makes you say yes, how you help post-investment. It grows your deal flow and your co-investor network at once, because both founders and fellow angels want to understand your lens.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide explainer titled \"How I Size an Angel Check\" — what I look for, what I ignore, and the one thing that makes me pass.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Applies one consistent personal identity to every post from a single reference. Your angel brand is personal — it's you, not a fund — so a polished, recognisable feed signals you take your investing seriously rather than writing occasional hobby checks.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clean, personal-brand slides that look as serious as your checks — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning an operating lesson into a post that proves your check comes with value, so founders want you specifically on their cap table.",
      "Publishing your dual operator-and-investor perspective, which is insight founders genuinely can't find elsewhere.",
      "Batching a week so your angel brand stays visible even though investing sits alongside a day job.",
      "Celebrating a portfolio founder's milestone, because founders compare notes on which angels actually show up — and that word-of-mouth brings you the best rounds.",
      "Demystifying how angels think, which attracts both founders and co-investors and quietly improves your own deal flow.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Angel brand while working a day job", before: "Invisible", after: "Weekly presence — batched in 50 min" },
      { metric: "Deal flow source", before: "Only people you already know", after: "Inbound from founders who found you" },
    ],
  },
  "fintech-founders": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Surfaces daily angles around the money problems your customers actually feel, plus the regulatory and security topics you explain one-to-one all week. In a category where trust is the whole ballgame, this keeps your credibility-building running even during a heavy build cycle.",
        time_saved: "Saves ~2.5 hours a week",
        example_output:
          "\"Your business loses money on every cross-border payment. Not on the FX rate — on the 2 days it sits in limbo.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Takes a complex compliance or financial concept and drafts it in plain English. Your superpower as a fintech founder is making the intimidating understandable — and this is what turns a concept you explain in a support call into a post that builds trust at scale.",
        time_saved: "Saves ~40 minutes per post",
        example_output:
          "\"Your money isn't 'in our app'. It's in a segregated account at a regulated bank, and legally it was never ours. Here's why that distinction is everything.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your safeguards into a transparency carousel — how funds are protected, how data is handled, what happens if something goes wrong. This kind of radical clarity is rare and disarming in fintech, and it converts cautious prospects into confident customers.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide explainer titled \"Where Your Money Actually Sits\" — the account structure, the regulator, the protections, and what happens if we disappear.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces polished, on-brand visuals from one reference. In fintech a sloppy feed is a trust liability — people extrapolate from your content to how carefully you'll handle their money — so a consistently credible look does real conversion work for you.",
        time_saved: "Saves ~1 hour per post",
        example_output:
          "Clean, trust-signalling slides in your brand palette — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a concept you explained to a customer this week into a plain-English carousel that demystifies money for thousands.",
      "Publishing a transparency post about your safeguards, which is the content that converts a cautious prospect in a category built on trust.",
      "Batching a week so credibility-building never stops, even during a demanding security or compliance sprint.",
      "Turning a regulatory war story into content, because your battle scars prove you can build where most startups can't survive.",
      "Leading with a real money problem rather than 'the future of finance', so your posts grab customers instead of fellow founders.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "3 hours", after: "15 minutes" },
      { metric: "Trust-building during build cycles", before: "Stops completely", after: "Runs weekly — batched" },
      { metric: "Jargon in customer-facing posts", before: "Reassures nobody", after: "Plain English by default" },
    ],
  },
  "personal-finance-coaches": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Delivers 10 empathetic angles a day around the specific money struggle you help with, so you can compete for attention against a feed full of get-rich-quick gurus. It leans toward permission and psychology rather than shame, which is what reaches the anxious person who needs you.",
        time_saved: "Saves ~2 hours a week between client sessions",
        example_output:
          "\"You're not bad with money. You were taught budgeting by people who'd never been broke.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts shame-free captions that reframe financial struggle as a lack of education rather than a character flaw. Money is emotional and shame-loaded, so tone is everything — 'stop buying coffee' repels the exact client you want, and this is tuned the other way.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"He wasn't overspending. He was earning £48K and paying £1,400 in interest a year because nobody ever showed him the order to attack debt in.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your method into a step-by-step money carousel that hands the reader an actual win — the starter emergency fund, the debt order, the automation. When your free advice genuinely helps someone's money, they believe your paid coaching can change their life.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide system titled \"The Order To Pay Off Debt (Most People Get This Backwards)\" — the problem, why it feels impossible, the order, and the first step.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces calm, credible slides from one reference — no Lamborghini energy. In a space where people have been burned by financial gurus, a considered, professional feed is itself a trust signal that quietly sets you apart from the noise.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Calm, trustworthy slides in your palette — deliberately un-flashy — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a client's debt-payoff breakthrough into a story carousel that gives an anxious stranger hope, without exposing anyone's private details.",
      "Publishing an empathetic, shame-free post that makes someone feel understood rather than judged — the prerequisite to them ever letting a coach near their finances.",
      "Batching a week so you stay present through the long window in which someone slowly decides to fix their money.",
      "Handing over a real quick win for free, because when your advice actually moves someone's money they trust you with the rest of it.",
      "Talking about money psychology rather than just the math, which is what makes a prospect realise their problem was never really about budgeting.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Visibility vs finance influencers", before: "Invisible — they post daily", after: "Daily presence, batched weekly" },
      { metric: "Weekly hours on content", before: "4+ hours after sessions", after: "60 minutes, batched" },
    ],
  },
  "business-coaches": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Feeds you daily angles aimed at your specific stuck owner and their plateau, so your feed stops looking like every other 'business coach' posting motivational quotes. Precision is what separates you in a saturated market, and this keeps every post pointed at one person.",
        time_saved: "Saves ~2.5 hours a week between coaching calls",
        example_output:
          "\"You don't have a marketing problem. You have a positioning problem, and more leads will just make it more expensive.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns a client's business breakthrough into a proof-driven caption that leads with the mechanism, not just the outcome. Owners are rightly skeptical of coaches who can't show they've moved a business, so proof — with the specific shift behind it — is the only currency that works.",
        time_saved: "Saves ~40 minutes per post",
        example_output:
          "\"She went from £180K to £340K in a year. We didn't add a single lead source. We raised prices 40% and fired the three clients eating half her week.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Packages your methodology into a named framework carousel prospects can see and trust. Giving away the framework doesn't lose clients — it proves you have a system worth paying for and attracts the owners who realise they need guided implementation.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide framework — the problem owners face, why the obvious fix fails, your named method, how to apply it, and the result it produces.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Applies a premium, consistent look from one reference. Business coaching commands premium fees and your feed has to look like it — a scrappy feed quietly undercuts your pricing when an owner is deciding whether you're worth a serious investment.",
        time_saved: "Saves ~1 hour per post",
        example_output:
          "Premium, authority-signalling slides in your palette — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a client's revenue breakthrough into a proof carousel that answers the skeptic's first question before they ask it.",
      "Publishing your methodology as a named framework, which turns you from a generalist coach into a recognised authority.",
      "Batching a week so you stay visible even when your coaching calendar is full — and you're there at the unpredictable moment an owner hits the wall.",
      "Posting a contrarian-but-true take that gently disagrees with what owners assume, which positions you as a strategic thinker rather than a cheerleader.",
      "Calling out the real, often misdiagnosed frustration your ideal client feels, so the right owner feels read and books a call.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Visibility during full coaching weeks", before: "Goes quiet", after: "Held — batched in 60 min" },
      { metric: "Monthly content cost", before: "$500+ for a ghostwriter", after: "$24.99/month" },
    ],
  },
  "life-coaches": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Hands you daily angles that put language to what your clients feel but can't articulate, anchored to the specific life change you guide. It steers away from generic positivity — the thing that makes people distrust life coaches — and toward the precision that creates real recognition.",
        time_saved: "Saves ~2 hours a week between sessions",
        example_output:
          "\"You're not lazy. You're overwhelmed and calling it laziness, because 'lazy' is easier to fix in your head.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns a client's inner breakthrough into a relatable story that makes the intangible tangible. Life coaching is bought on emotional resonance, and a well-told transformation does more than any list of credentials — this makes writing one take minutes rather than an evening.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"She'd been 'about to leave' her job for four years. The block wasn't fear of failing. It was that leaving meant admitting the last four years were a choice.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns one exercise or reframe you use with clients into a mindset-tool carousel that delivers a real shift. Handing over a genuine tool proves your coaching has substance — and when free advice makes someone feel different, they trust your paid work can change their life.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide tool — the situation, the default response, the reframe, how to practise it, and what shifts when it lands.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Creates warm, calming slides from one reference, so your feed feels like the safe space your coaching provides. In a field where prospects are wary of both scammers and toxic positivity, a considered, calm look is itself a trust signal.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Warm, uncluttered slides in a calming palette — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a client's inner breakthrough into a story that lets a prospect see themselves in the transformation — the emotional pull that makes them reach out.",
      "Publishing a hook that names the feeling someone couldn't articulate, creating the 'how did they know' moment that earns the follow.",
      "Handing over a real mindset tool for free, which proves substance in a space full of motivational posters.",
      "Batching a week so your calm presence stays with someone through the long, emotional window before they invest in themselves.",
      "Sharing your own honest journey rather than relentless positivity, because authentic vulnerability is what builds trust with people actually in pain.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Content beyond inspirational quotes", before: "Rare — no time to write depth", after: "Weekly real tools, batched" },
      { metric: "Weekly hours on content", before: "3+ hours after client sessions", after: "60 minutes, batched" },
    ],
  },
  "executive-coaches": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns the anonymised patterns you see across senior leaders into daily angles. You hold a privileged view of what executives actually wrestle with — the isolation, the imposter feelings, the hard people calls — and this is what makes that vantage point visible without breaching a single confidence.",
        time_saved: "Saves ~2 hours a week between sessions",
        example_output:
          "\"The higher you rise, the less honest feedback you get. By the time you're CEO, almost everyone in the room is managing you.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts posts that speak to the private realities of leadership — the things executives feel but can't say out loud. That precision is what makes a senior buyer think 'this coach gets what it's actually like up here', which is where trust starts.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"He wasn't a micromanager. He'd just never been shown what to do with the four hours a week that opened up when he finally delegated.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns a leadership shift you facilitate into a carousel executives recognise in themselves — the old pattern, why smart leaders fall into it, the shift, what changes when it lands. That recognition is the essence of executive-coaching demand.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide shift titled \"From Operator to Strategist\" — the old pattern, why it's so sticky, the shift, and what changes for the team.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces refined, understated slides from one reference, meeting the standards an executive audience notices. At this level, a scrappy feed undercuts your credibility with people who are paying attention to exactly these signals.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Refined, executive-caliber slides — deliberately understated — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning an anonymised pattern you see across executives into an insight post that proves you understand the top of the org chart.",
      "Publishing a leadership shift that makes a senior leader recognise their own pattern and think 'I need this'.",
      "Batching a week so your credible presence stays steady for a small, discerning audience that decides slowly.",
      "Sharing a point of view on where leadership itself is heading, which positions you as a peer-level thinker rather than a service provider.",
      "Speaking to the loneliness of leadership, which resonates instantly with an executive who assumes nobody understands it.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Thought leadership output", before: "Rare — practice eats the time", after: "Weekly, batched in 50 min" },
      { metric: "Visibility to senior buyers", before: "Near-zero between referrals", after: "Consistent presence" },
    ],
  },
  "sales-coaches": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Delivers daily tactical angles drawn from the real deal situations you coach through, so your feed offers reps an edge rather than motivation. This audience is allergic to fluff and hungry for the concrete move that works on their next call — this keeps you on the right side of that line.",
        time_saved: "Saves ~2 hours a week between sessions",
        example_output:
          "\"The discovery question that doubles close rates: 'What happens if you do nothing?' Most reps never ask it.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns a real deal — the objection that killed it, the reframe that saved it — into a tactical teardown reps actually save. It leads with the specific technique and the exact words, which is what earns respect from a been-pitched-to audience.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"'It's too expensive' is never about price. Last week a rep flipped it with one question: 'Compared to what?' The deal closed at full rate.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your method into a technique carousel reps can apply on their next call — the situation, the common mistake, your technique, the exact words, the result. When a rep tries your free technique and it works, they become the word-of-mouth that brings you into their team.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide technique titled \"Handling The Price Objection\" — the situation, the reflex that kills it, the reframe, the exact script, the outcome.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces sharp, credible slides from one reference. Sales attracts hype and gimmicks, so a clean look signals you deliver real methodology rather than motivational theatrics — which is what discerning sales leaders want when investing in their team.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Sharp, no-gimmick slides in your palette — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a real deal situation into a tactical teardown that reps save and use on their next call.",
      "Publishing a technique with the exact words, because this audience wants the concrete move rather than encouragement.",
      "Batching a week so you're top of mind for the unpredictable moment a sales leader decides their team needs a coach.",
      "Challenging the outdated closing tactics reps were taught, which sparks debate and positions you as a modern coach.",
      "Anchoring every post to a metric — close rate, ramp time, deal size — because this audience only cares about what moves the number.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Tactical posts per month", before: "1–2 when time allows", after: "12, batched weekly" },
      { metric: "Weekly hours on content", before: "3+ hours after coaching", after: "60 minutes, batched" },
    ],
  },
  "linkedin-coaches": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Gives you daily angles about what's actually working on the platform you teach, so your own feed never goes quiet. For you specifically this isn't convenience — a LinkedIn coach with a flat feed has no credibility, so consistent output is literally your proof of concept.",
        time_saved: "Saves ~2 hours a week",
        example_output:
          "\"The post format getting 10x reach right now — and the reason the algorithm rewards it has nothing to do with the format.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts hooks and captions that demonstrate the exact skill you teach. Every post you publish is an audition: if your own hooks don't stop the scroll, no prospect will believe you can write theirs. This makes hitting that bar repeatable rather than exhausting.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"'Post daily' is the worst advice in this app. My client posts twice a week and out-reaches accounts 10x her size. Here's what she does instead.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Builds the growth-tactic carousel that teaches your strategy while demonstrating it. The carousel's own quality is the argument — a prospect reading a well-built carousel about building carousels doesn't need convincing.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide teardown titled \"Anatomy of a Hook That Actually Works\" — the principle, the common mistake, the structure, an example, and a takeaway.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Sets the visual standard you coach clients toward, from one reference image. You can't credibly teach great content while posting mediocre slides — and when prospects want their feed to look like yours, your visuals become a silent, ongoing sales pitch.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Polished, standard-setting slides in your palette — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Keeping your own feed thriving, because it's the case study your entire coaching offer depends on.",
      "Turning a client's follower or lead growth into a results carousel that proves your methods work on people other than you.",
      "Publishing a substantive, contrarian take that rises above the recycled-guru noise flooding this space.",
      "Modelling the consistency you preach even during your busiest coaching weeks — closing the credibility gap that costs you clients.",
      "Teaching a growth tactic so well that a follower tries it, sees their next post perform, and becomes a believer who wants your program.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Own-feed consistency", before: "Lapses when coaching is busy", after: "Never — batched weekly" },
      { metric: "Credibility gap", before: "Preaching consistency, posting sporadically", after: "Closed — you walk the talk" },
    ],
  },
  "career-coaches": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Delivers daily angles built around the fears and misconceptions job seekers actually carry, anchored to the specific transition you guide. Your audience is anxious and actively searching, so hooks that name their exact situation cut straight through the generic career advice they've already ignored.",
        time_saved: "Saves ~2 hours a week between clients",
        example_output:
          "\"Your resume isn't the problem. You're applying to roles that need a translator, and your resume is written in your old company's language.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns a client's career breakthrough into a hopeful story that reassures anxious job seekers that change is possible. Career struggle is scary and isolating — a real story of someone in the same spot succeeding is the emotional trigger that makes a worried prospect reach out.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"He was ghosted 40 times. We changed nothing about his experience — we changed the first line of his summary from what he'd done to what he'd fix.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your method into an actionable-step carousel that delivers a real win — the resume bullet rewrite, the 'tell me about yourself' answer, the negotiation script. When your free advice lands someone an interview, they believe your coaching can change their career.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide guide titled \"How To Answer 'Tell Me About Yourself'\" — why the usual answer fails, the structure, an example, and the practice drill.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces warm, credible slides from one reference so your feed feels both professional and human. You're helping people through a vulnerable, scary time, and a steady, reassuring look tells an anxious job seeker they're in capable hands.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Warm, encouraging, professional slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a client's offer or pivot into a hopeful story carousel that gives an anxious job seeker proof it's possible.",
      "Naming a job seeker's specific fear — the ghosting, the imposter feeling — so they feel read rather than lectured.",
      "Handing over one concrete step for free, because when your advice lands someone an interview they trust you with their career.",
      "Batching a week so you stay present through the whole emotional journey before someone decides to hire a coach.",
      "Talking about the mindset of career change, not just resume formatting, which is what sets you apart from the tactics-only crowd.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Posts that reach anxious job seekers", before: "Generic tips, ignored", after: "Specific, resonant, weekly" },
      { metric: "Weekly hours on content", before: "3+ hours after sessions", after: "60 minutes, batched" },
    ],
  },
  "leadership-coaches": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns the recurring patterns you see across leaders — the reluctance to delegate, the avoided hard conversation — into daily angles. Those patterns are content only a coach has, and this is what turns your client observations into the recognition that makes a leader think 'that's exactly me'.",
        time_saved: "Saves ~2 hours a week between sessions",
        example_output:
          "\"Your team isn't underperforming. You've been avoiding one conversation for six weeks and everyone can feel it.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts posts that name a leader's private struggle and hold up an honest mirror. Leaders are self-reflective by nature, so a hook that surfaces the uncomfortable truth stops them mid-scroll — and that precision is what makes them trust you understand the role from the inside.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"She thought she had a delegation problem. She had a trust problem — and the trust problem was about her, not the team.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns a leadership capability into a practical carousel — giving hard feedback, delegating without micromanaging, leading through uncertainty. Leaders respect practical substance, so content that helps them lead better today builds the credibility that makes them want the deeper work.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide skill breakdown titled \"How To Give Feedback That Actually Lands\" — the failure mode, why good leaders struggle, the method, the practice.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Delivers grounded, credible slides from one reference. Leaders are perceptive about signals of substance, so a considered feed quietly supports the impression that your coaching is considered too.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Grounded, credible slides in your palette — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a pattern you see across clients into an insight post that makes a leader recognise themselves.",
      "Publishing a leadership skill people can practise today, which proves your coaching produces growth rather than inspiration.",
      "Batching a week so your presence is steady for the pivotal, unpredictable moment a leader decides to get help.",
      "Sharing your philosophy of what good leadership is, which attracts the leaders who share your conviction.",
      "Naming the uncomfortable truth leaders feel but rarely say, which creates the honest-mirror moment that earns the follow.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Insight posts per month", before: "1–2 when the calendar allows", after: "12, batched weekly" },
      { metric: "Weekly hours on content", before: "3+ hours after coaching", after: "50 minutes, batched" },
    ],
  },
  "mindset-coaches": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Surfaces daily angles that expose the limiting beliefs your clients can't see in themselves, grounded in real psychology rather than empty positivity. In a space saturated with 'good vibes' content, this keeps you on the substantive side of the line where thoughtful prospects actually are.",
        time_saved: "Saves ~2 hours a week between sessions",
        example_output:
          "\"You don't lack discipline. You hold a belief that you're the kind of person who quits — and you've been collecting evidence for it since you were 12.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns a client's internal shift into a believable transformation story with a concrete before-and-after of their thinking. Mindset results are invisible and easily dismissed as fluffy — a specific story of a belief changing is far more persuasive than any claim about the power of mindset.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"He'd turned down three promotions. Not from fear of failing — from a belief that being visible meant being a target. That belief was 30 years old and had never once been examined.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns one reframe or exercise into a carousel that hands the reader an actual mental tool — the situation, the default pattern, the reframe, how to practise it, what changes. Real tools beat inspirational quotes, and when a reader's thinking shifts even slightly they trust your deeper work.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide tool — the trigger, the automatic thought, the reframe, the practice, and what changes after two weeks.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces calm, grounded slides from one reference — deliberately countering the hype this space is known for. A considered, professional feed signals depth and safety to the thoughtful prospect who's skeptical of positivity peddlers.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Calm, credible slides in a grounded palette — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a client's mental shift into a believable story that makes your internal results visible and persuasive.",
      "Exposing a hidden limiting belief in a hook, which creates the curiosity that makes someone wonder what else is running their life.",
      "Handing over a real reframe for free, proving your work has substance beyond motivation.",
      "Grounding a mindset concept in actual psychology, which sets you apart from the empty-positivity crowd.",
      "Batching a week so you stay present through the slow, personal journey toward deciding to do inner work.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Substance vs positivity quotes", before: "Defaulted to quotes — no time", after: "Real tools weekly, batched" },
      { metric: "Weekly hours on content", before: "3+ hours after clients", after: "60 minutes, batched" },
    ],
  },
  "productivity-coaches": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Delivers daily angles that challenge the hustle-and-willpower assumptions your audience carries, aimed at your specific overwhelmed person. Your readers are exhausted from failing at productivity systems, so reframing their struggle as a design problem rather than a personal failing is what actually lands.",
        time_saved: "Saves ~2 hours a week — ironically, you had none",
        example_output:
          "\"You don't need more discipline. You need fewer decisions. Your willpower isn't weak — it's being spent on things that should have been automatic.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns a client's turnaround into a proof post that leads with the specific system, not the outcome. Productivity buyers are skeptical of hacks that never stick, so showing the mechanism is what proves you have a repeatable method rather than another tip they'll abandon.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"He was working 65-hour weeks. We didn't optimise his calendar — we deleted the three recurring meetings he'd never once needed. He got 6 hours back and nobody noticed they were gone.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Packages your method into an adoptable system carousel — the problem, why the usual approach fails, your system, the setup steps, the result. When someone tries your free method and gets a calmer day, they believe your coaching can transform how they work.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide system titled \"The Weekly Reset That Takes 20 Minutes\" — the problem, why to-do lists fail, the system, the setup, the result.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Creates clean, uncluttered slides from one reference — embodying the calm you sell. A chaotic feed would contradict your entire message, so a serene, well-organised look is a live proof of the outcome you promise.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clean, calm, uncluttered slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a client's turnaround into proof that counters the skepticism about hacks that never stick.",
      "Challenging a productivity myth in a hook, offering relief to people exhausted from failing at systems.",
      "Handing over an adoptable system that gives a reader a genuinely calmer day.",
      "Talking about burnout and sustainability rather than output, which speaks to the exhausted professionals who secretly know hustle isn't working.",
      "Batching a week and staying consistent without chaos — itself a demonstration of the methods you teach.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Your own content chaos", before: "Selling clarity, living overwhelm", after: "One calm session a week" },
      { metric: "Weekly hours on content", before: "3+ hours", after: "50 minutes, batched" },
    ],
  },
  "public-speaking-coaches": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Hands you daily angles that name the visceral fear of the stage — the blank mind, the shaking hands — plus the techniques that fix them. Fear of speaking is nearly universal and rarely discussed openly, so naming it with empathy cuts straight through to a huge, quiet audience.",
        time_saved: "Saves ~2 hours a week between sessions",
        example_output:
          "\"The moment your mind goes blank on stage isn't nerves. It's a working-memory problem, and it's fixable in about ten minutes of practice.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns a client's on-stage breakthrough into a vivid story that gives a terrified reader hope. Because speaking fear is so visceral and relatable, a story of someone conquering it is deeply resonant — and it lets a nervous prospect imagine their own moment of confidence.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"She shook so hard she couldn't hold her notes. Six weeks later she keynoted to 400 people. We didn't build confidence — we built a structure her brain could hold onto when the adrenaline hit.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns a technique into a carousel someone can use in their next presentation — how to open, how to handle a blank, how to use pauses. When a reader tries your tip and their next talk goes better, they believe you can take them from terrified to compelling.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide technique titled \"What To Do When Your Mind Goes Blank\" — why it happens, the reflex that makes it worse, the recovery move, and the drill.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces confident, polished slides from one reference. Your feed should radiate the command you help clients develop — a scrappy feed would undercut the exact quality you're selling.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Confident, assured slides in your palette — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a client's breakthrough into a vivid story that gives terrified readers hope they could do it too.",
      "Naming the fear of the stage with empathy, connecting instantly with the huge audience who dreads presenting.",
      "Handing over a technique someone can use in the presentation they're dreading next week.",
      "Reframing speaking as a learnable skill rather than a talent, which gives hope to people who've written themselves off.",
      "Batching a week so you're top of mind the moment someone's intimidating keynote lands on the calendar.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Reach to nervous presenters", before: "Quiet feed, invisible", after: "Weekly presence, batched" },
      { metric: "Weekly hours on content", before: "3+ hours after coaching", after: "50 minutes, batched" },
    ],
  },
  "health-coaches": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Delivers daily angles that counter health misinformation with empathy rather than shame, anchored to your specific specialty. The internet is full of health confusion and guilt, so hooks that offer clarity and compassion are what reach the discouraged reader instead of scaring them off.",
        time_saved: "Saves ~2 hours a week between clients",
        example_output:
          "\"You're not lacking willpower. Your 3pm energy crash is a breakfast problem, and it's the most fixable thing on this list.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns a client's health win into a behavior-led story rather than a number-led one. Leading with the sustainable habit proves you deliver a repeatable process, which is exactly what a reader burned by crash approaches needs to see before they'll trust you.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"Her energy came back in three weeks. We changed one thing: she ate breakfast. Not a special breakfast — any breakfast. She'd been skipping it for nine years.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your method into a doable-step carousel that delivers a real, achievable change rather than an overwhelming overhaul. When your free advice actually helps someone feel better, they believe your coaching can improve their health.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide guide titled \"The 3pm Crash Is Fixable\" — what causes it, why the coffee makes it worse, the simple change, and how to start tomorrow.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Creates warm, approachable slides from one reference — not clinical, not preachy. In a space full of intimidating fitness aesthetics and shame, a warm and human feed is itself a reason for a hesitant person to feel safe reaching out.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Warm, encouraging, non-preachy slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a client's energy or habit win into a behavior-led story that proves a sustainable process, not a quick fix.",
      "Busting a health myth with empathy rather than condescension, because your audience was misled, not stupid.",
      "Handing over one genuinely doable step, since small real wins beat overwhelming plans for people tired of all-or-nothing.",
      "Championing sustainable health over detoxes and crash diets, which speaks to everyone exhausted by yo-yo cycles.",
      "Batching a week so you stay present through the slow, frustrating journey before someone commits to their health.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Visibility vs fad-diet influencers", before: "Drowned out", after: "Consistent weekly presence" },
      { metric: "Weekly hours on content", before: "4+ hours after sessions", after: "60 minutes, batched" },
    ],
  },
  "wellness-coaches": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Surfaces daily angles that name the real cost of ignoring wellbeing, anchored to your specific dimension rather than vague buzzwords. High-achievers ignore their own depletion until it's named plainly — this is what reaches the overworked professional who hasn't admitted it yet.",
        time_saved: "Saves ~2 hours a week between clients",
        example_output:
          "\"Your exhaustion isn't a productivity problem. It's a warning, and you've been treating the warning light as the malfunction.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns a client's wellbeing shift into a tangible story with the specific practice or boundary behind it. Wellness results are internal and easily dismissed as fluffy, so a concrete story of real life change is what makes your work credible.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"He wasn't burnt out from the work. He was burnt out from being available for it at 11pm. We changed one thing: his phone charges in the kitchen now.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns a real practice into a carousel that delivers actual calm — a boundary method, a stress reset, restorative habits for a busy day. Real, doable practices are what differentiate you from the abstract self-care content that helps nobody.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide practice titled \"The 90-Second Reset\" — the trigger, why we push through, the practice, when to use it, what shifts.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces serene, uncluttered slides from one reference — embodying the calm you help create. A chaotic feed would contradict your message, so a tranquil look is itself a small demonstration of the balance you offer.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Calming, restorative slides in a serene palette — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a client's shift from burnt out to balanced into a story that makes your internal results tangible.",
      "Naming the real cost of ignoring wellbeing, which reaches the depleted high-achiever running on empty.",
      "Handing over a real practice that gives a reader a moment of genuine calm.",
      "Being honest that wellbeing is hard and rest isn't lazy, which resonates with people exhausted by toxic positivity.",
      "Batching a week so your grounding presence is steady for the slow-building moment someone reaches their limit.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Substance vs self-care platitudes", before: "No time to write depth", after: "Real practices weekly" },
      { metric: "Weekly hours on content", before: "3+ hours", after: "60 minutes, batched" },
    ],
  },
  "relationship-coaches": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Delivers daily angles that name painful relationship patterns people recognise but have no words for. Because people rarely have language for their own dynamics, giving them that language is magnetic — and it reaches someone in a private struggle who'd never search for a coach.",
        time_saved: "Saves ~2 hours a week between sessions",
        example_output:
          "\"The reason you keep attracting the same wrong partner isn't bad luck. It's that 'familiar' and 'safe' feel identical from the inside.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns a client's breakthrough into a relatable story while protecting their privacy completely. Relationship pain is isolating, so a story of someone finding their way through is profoundly reassuring — and the caption writer keeps it compassionate and non-judgmental by default.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"They'd had the same argument for six years. It was never about the dishes. It was that one of them heard 'you're not doing enough' and the other meant 'I'm drowning'.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your method into a relationship-tool carousel someone can actually use — a communication technique, a boundary script, a conflict reframe. When a reader tries it and a real conversation goes better, they believe you can transform their relationships.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide tool titled \"The Repair Attempt\" — what it is, why most people miss it, the exact words, when to use it, what changes.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Creates warm, gentle, safe-feeling slides from one reference. You're inviting people to consider something vulnerable, so a feed that feels like a judgment-free space is itself a reason for a hurting person to reach out.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Warm, non-clinical, safe-feeling slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a client breakthrough into a relatable story that gives hope while protecting their privacy entirely.",
      "Naming a painful pattern in a hook, so a struggling reader feels seen in something they've never articulated.",
      "Handing over a real communication tool that makes one difficult conversation go better.",
      "Leading with compassion rather than judgment, because relationship struggles carry shame and preachy content repels the people who need you.",
      "Batching a week so you stay present through the slow, intimate journey before someone trusts you with their heart.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Posts beyond generic love quotes", before: "Rare — hard topic to write", after: "Weekly real tools, batched" },
      { metric: "Weekly hours on content", before: "3+ hours after sessions", after: "60 minutes, batched" },
    ],
  },
  "management-consultants": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns the frameworks and anonymised engagement insights you generate anyway into daily angles. Your structured thinking is your product, and it previously lived only in client decks — this is what makes it visible to the executives forming their impression of you.",
        time_saved: "Saves ~2.5 hours a week between engagements",
        example_output:
          "\"Your restructuring will fail for the same reason 70% do — and it has nothing to do with the org chart you're arguing about.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts posts that reframe a business problem with a sharper diagnosis than the reader has. Executives are sophisticated, so the hook must promise a genuinely more insightful lens — and that reframe is exactly the diagnostic skill they hire consultants for.",
        time_saved: "Saves ~40 minutes per post",
        example_output:
          "\"They thought they had a cost problem. They had a decision-rights problem — three people could say no and nobody could say yes.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your methodology into a framework carousel prospects can respect — how you diagnose a bottleneck, how you approach a transformation, how you measure change. Sophisticated buyers hire consultants whose approach they already admire, so teaching it openly is direct pipeline-building.",
        time_saved: "Saves ~2.5 hours per carousel",
        example_output:
          "A 7-slide framework — the situation, the flawed default approach, your diagnostic, how to apply it, and the outcome.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Delivers refined, executive-grade slides from one reference. Your audience lives in a world of high standards — anything scrappy undercuts your credibility with the discerning buyers you need.",
        time_saved: "Saves ~1 hour per post",
        example_output:
          "Refined, executive-polish slides in your palette — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a framework from a client deck into a public carousel that proves your analytical rigor.",
      "Publishing a reframe that makes an executive rethink an assumption about their own business.",
      "Batching a week so your authority stays visible to a small, senior buyer pool during demanding engagements.",
      "Sharing a point of view on where business is heading, which positions you as a strategic thinker rather than a hired pair of hands.",
      "Building the reputation that makes an executive think of you specifically when that problem lands on their desk.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "3 hours", after: "20 minutes" },
      { metric: "Thought leadership output", before: "Rare — projects eat everything", after: "Weekly, batched in 50 min" },
      { metric: "Frameworks that reach buyers", before: "Stay in client decks", after: "Published and visible" },
    ],
  },
  "strategy-consultants": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your strategic analysis into daily angles, including the contrarian takes that showcase superior thinking. For a strategy consultant the quality of your mind is the entire product — this is what stops it staying locked in client rooms and your own notes.",
        time_saved: "Saves ~2.5 hours a week",
        example_output:
          "\"Most companies pick the wrong market to enter, and it's because of a bias baked into how they size TAM in the first place.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts hooks that promise a non-obvious strategic truth to a senior, skeptical audience. Your readers have heard every generic strategy take, so surface commentary gets scrolled past — this keeps you on the side of genuine intellectual value.",
        time_saved: "Saves ~40 minutes per post",
        example_output:
          "\"Everyone's calling it a pricing decision. It's a positioning decision, and they made it two years ago without noticing.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Walks prospects through your strategic reasoning end-to-end — the framing, the flawed conventional approach, your logic, the conclusion. Since strategy buyers hire based on how a consultant thinks, showing your reasoning openly is the most direct proof you're worth an elite engagement.",
        time_saved: "Saves ~2.5 hours per carousel",
        example_output:
          "A 7-slide reasoning walk-through titled \"How I'd Evaluate This Market\" — the framing, the standard analysis, why it misleads, the sharper question.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces elite, understated slides from one reference. At the top of strategy consulting your buyers notice everything — anything flashy reads as a mismatch, so quiet quality is the right signal.",
        time_saved: "Saves ~1 hour per post",
        example_output:
          "Understated, elite-polish slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a strategic insight into a carousel that proves the caliber of your mind to an elite buyer pool.",
      "Publishing an incisive read on a major strategic move everyone's already discussing, showcasing your lens in real time.",
      "Batching a week so your high-caliber thinking stays visible through intense engagements.",
      "Walking through your reasoning so prospects experience your thinking firsthand rather than reading a service description.",
      "Owning one strategic domain, so a C-suite leader seeks your perspective specifically when that question arises.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "3 hours", after: "20 minutes" },
      { metric: "Best thinking that reaches buyers", before: "Stays in client rooms", after: "Published weekly" },
      { metric: "Weekly hours on content", before: "0 — engagements eat everything", after: "50 minutes, batched" },
    ],
  },
  "brand-consultants": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your brand philosophy into daily angles, including sharp analyses of brands everyone already recognises. Brand consulting is subjective, so a visible, consistent worldview is your differentiation — this is what keeps it in front of people rather than in your head.",
        time_saved: "Saves ~2 hours a week between client work",
        example_output:
          "\"Your brand isn't confusing customers because of your logo. It's your positioning — and you've been treating a strategy problem as a design problem for two years.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts posts that expose the branding mistakes readers are probably making. Business owners routinely misdiagnose their brand problems, so a hook that reframes the real issue signals your diagnostic expertise and creates the 'wait, is my brand doing that?' moment.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"They spent £40K on a rebrand. The logo was never the problem — three people in the company gave three different answers to 'what do you do?'\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns a brand transformation into a before-and-after carousel that leads with the strategic thinking rather than the pretty logo. Because branding results feel intangible, showing the business outcome is what makes your work credible to discerning clients.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide transformation — the confusion, the real diagnosis, the positioning shift, the identity that followed, the business result.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Keeps every carousel flawlessly on-brand from one reference. You sell brand consistency, so this matters more for you than anyone — a sloppy feed is fatal to your credibility, and an impeccable one is your strongest sales argument.",
        time_saved: "Saves ~1 hour per post",
        example_output:
          "Flawlessly coherent, distinctive slides that prove you practice what you preach — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a client transformation into a before-and-after carousel that shows real business results, not just a new logo.",
      "Exposing a common branding mistake, which signals diagnostic expertise and sparks self-recognition in a business owner.",
      "Analysing a famous rebrand, making your abstract expertise instantly tangible through an example everyone knows.",
      "Maintaining a flawlessly on-brand feed, which is the living proof of concept your entire offer depends on.",
      "Publishing your brand philosophy consistently, so clients who resonate with your worldview self-select in.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Your own brand consistency", before: "Cobbler with no shoes", after: "Impeccable — automated" },
      { metric: "Weekly hours on content", before: "0 — client work eats it", after: "50 minutes, batched" },
    ],
  },
  "marketing-consultants": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your client results and contrarian takes into daily angles, so you finally market yourself as well as you market clients. The cobbler's-children problem is a systems problem — this is the system that makes your own marketing survive delivery weeks.",
        time_saved: "Saves ~2.5 hours a week of your own marketing",
        example_output:
          "\"You don't need more content. You need to distribute the content you already made — you're publishing into a room with nobody in it.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns a client win into a proof-driven caption with the real number and the strategy behind it. Marketing buyers are skeptical because everyone claims results — showing the reasoning proves you have a repeatable approach rather than a lucky campaign.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"We tripled their qualified leads in 90 days. We didn't touch the ads. We rewrote who the offer was for — turns out they'd been selling to the wrong job title for three years.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your method into a playbook carousel prospects can respect — the positioning statement, the content engine, the funnel fix. Marketing buyers hire consultants whose approach they admire, so teaching openly attracts the clients who'd rather have you implement it.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide playbook titled \"How To Fix a Leaky Funnel\" — the symptom, the common misdiagnosis, the real audit, the fix, the result.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces polished, on-brand slides from one reference. Your feed is a live sample of your marketing ability — a scrappy feed suggests you can't make marketing look and perform well, which is exactly what you're selling.",
        time_saved: "Saves ~1 hour per post",
        example_output:
          "Polished, results-oriented slides in your palette — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a client result into a proof carousel that answers the skeptical buyer's first question.",
      "Challenging marketing conventional wisdom, which cuts through the generic best-practice noise.",
      "Batching a week so you model the consistency you'd advise any client to keep.",
      "Publishing a playbook that lets prospects experience your marketing thinking before they hire you.",
      "Staying current on channel and buyer-behaviour shifts, which reassures prospects your advice isn't from 2019.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Own marketing vs client marketing", before: "Neglected — cobbler's children", after: "Weekly, batched" },
      { metric: "Weekly hours on your own brand", before: "0", after: "50 minutes, batched" },
    ],
  },
  "innovation-consultants": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your engagement cases and grounded trend reads into daily angles that puncture innovation theater. Leaders are cynical about innovation buzz, so content that names the gap between talk and shipped results is what marks you as the consultant who delivers substance.",
        time_saved: "Saves ~2 hours a week between engagements",
        example_output:
          "\"Your innovation lab is theater. Nothing ships because the people in it can't kill anything — and killing things is the whole job.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts posts grounded in concrete cases rather than abstraction. Because innovation results sound intangible and buzzword-laden, leading with the specific intervention and what actually changed is what makes your work credible to a skeptical executive.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"They'd run 40 workshops in two years and shipped nothing. We changed one rule: every idea needed a named owner and a kill date. Six shipped in five months.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your methodology into a carousel that proves you deliver rather than inspire — how to run a real discovery sprint, how to kill bad ideas fast, how to build a culture that ships. Leaders hire innovation consultants with concrete approaches, not inspiring talks.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide method titled \"How To Kill an Idea Properly\" — why teams can't, the cost of zombie projects, the kill criteria, the ritual, the result.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces modern, credible slides from one reference. A dated or scrappy feed undercuts your entire premise — you should look forward-thinking and considered, because that's literally what you're selling.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Modern, contemporary slides in your palette — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning an engagement into a concrete case carousel that proves your innovation work drives real change.",
      "Puncturing innovation theater in a hook, which reads as refreshing substance to leaders tired of buzzwords.",
      "Publishing your practical method, which separates you from the inspiration-only crowd.",
      "Sharing a grounded read on what's actually driving change, cutting through hype to what matters.",
      "Batching a week so your authority stays visible for the unpredictable moment a company hits its crossroads.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Concrete cases published", before: "0 — stayed in decks", after: "Weekly, batched" },
      { metric: "Weekly hours on content", before: "0 — engagements eat it", after: "50 minutes, batched" },
    ],
  },
  "diversity-inclusion-consultants": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Surfaces daily angles that frame inclusion as a business imperative rather than a slogan, plus the nuanced takes this charged space needs. In a field facing skepticism and backlash, content anchored to measurable outcomes is what reaches the pragmatic leaders who'll actually fund the work.",
        time_saved: "Saves ~2 hours a week between engagements",
        example_output:
          "\"Your best people are leaving and your exit interviews are hiding why. Nobody tells the truth to the company that still signs their reference.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts evidence-based captions that read as measurable impact rather than good intentions. D&I is often dismissed as fluffy, so leading with retention, performance, and risk is what disarms skepticism and gets serious organisations to engage.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"Their retention gap wasn't about hiring. Women were leaving at 18 months — exactly when the first promotion round happened and the criteria were 'we just know'.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your practice into an actionable carousel leaders can implement — inclusive meetings, de-biased hiring, equitable feedback. Practical substance is what separates you from the awareness-only crowd and proves your engagements produce real change.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide practice titled \"How To De-Bias a Promotion Round\" — the failure mode, the well-intentioned mistake, the criteria, the process, the outcome.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces professional, credible slides from one reference. In a scrutinised field, a polished look reinforces that you're a substantive consultant and helps your evidence-based content land with discerning leaders.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Professional, credible slides in your palette — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning an engagement win into an evidence-based carousel that reads as measurable impact.",
      "Framing inclusion as a business imperative, which reaches pragmatic leaders beyond the already-convinced.",
      "Publishing a practical step leaders can implement today, proving your work is actionable rather than abstract.",
      "Navigating the hard, honest realities with nuance, which positions you as a mature guide in a polarised space.",
      "Batching a week so your credible presence is steady for the moment an organisation commits to real work.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Evidence published vs slogans", before: "Slogans — no time for depth", after: "Evidence weekly, batched" },
      { metric: "Weekly hours on content", before: "0", after: "50 minutes, batched" },
    ],
  },
  "performance-coaches": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Delivers daily angles that promise a real edge or expose a hidden limiter, aimed at your specific arena. High performers have long outgrown motivation — they stop scrolling for a genuine competitive advantage or a sharp insight into why they're plateaued.",
        time_saved: "Saves ~2 hours a week between clients",
        example_output:
          "\"The reason talented people plateau isn't effort. It's recovery — and you've been treating rest as the thing you earn rather than the thing that makes the work possible.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns a client breakthrough into an evidence-driven story with the systematic method behind it. High performers are outcome-focused and evidence-driven, so a concrete story of measurable improvement is far more persuasive than any motivational message.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"He'd been at the same number for three years. We cut his working hours by 20%. The next quarter was his best ever — the constraint forced the prioritisation he'd been avoiding.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your method into a performance-system carousel — sustainable focus, energy management, recovery for peak output. Systematic substance beats motivation for this discerning audience, and a real gain from your free method is what makes them want the deeper work.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide system titled \"Energy Management For a Brutal Week\" — the problem, the mistake driven people make, the system, the steps, the result.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces sharp, high-caliber slides from one reference. Your audience operates at a high level and notices quality — a feed that exemplifies excellence is a fitting demonstration of the standards you help clients reach.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Sharp, high-caliber slides in your palette — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a client breakthrough into an evidence-driven story that persuades an outcome-focused audience.",
      "Promising a real edge in a hook, which grabs high performers rather than getting dismissed as motivation.",
      "Handing over a performance system that delivers a genuine, measurable gain.",
      "Championing sustainable peak performance over burnout, which speaks to achievers who've hit the wall.",
      "Batching a week and staying consistent without burning out — itself a demonstration of your methods.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Systematic content vs motivation", before: "Defaulted to motivation", after: "Real systems weekly" },
      { metric: "Weekly hours on content", before: "3+ hours", after: "50 minutes, batched" },
    ],
  },
  "digital-marketers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Surfaces daily angles from your real campaigns and tests, plus the fast-moving landscape shifts worth a take. Digital marketers are hungry for tactical, real-world data — this is what turns the experiments in your dashboard into the practitioner content peers respect.",
        time_saved: "Saves ~2 hours a week",
        example_output:
          "\"The landing page change that lifted our conversion rate 34% — we removed something rather than adding it.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns a real campaign result into a number-backed caption that grabs a sophisticated, fluff-allergic audience. Vague 'marketing tips' get scrolled past instantly — this leads with the specific, tested tactic that proves you're actually in the arena.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"We cut our ad spend 30% and leads went up. We'd been paying to reach people who were already going to find us organically.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your tactic into a replicable carousel that spreads across the marketing community. In a peer-heavy field, shareable tactical value is exactly what grows your reach — when a marketer applies your method and it works, they follow you and pass it on.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide teardown titled \"Anatomy of an Ad That Converts\" — the structure, the common mistake, the hook, the proof, the result.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces scroll-stopping, consistent slides from one reference. Your feed is a live sample of your marketing sense — it demonstrates that you understand what makes content perform, which is the exact skill you're known for.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Scroll-stopping, on-brand slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a real campaign or A/B test into a tactical carousel that earns peer respect and proves you're a practitioner.",
      "Publishing a data-backed hook with the specific number, which grabs a sophisticated audience hunting for what works.",
      "Batching a week so your authority compounds through your busiest campaign period.",
      "Taking a sharp position on an algorithm update or channel shift, which keeps you ahead of the curve rather than repeating last year's playbook.",
      "Making your feed a demonstration of good marketing, which is a portfolio piece proving your competence to every recruiter and client scrolling by.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Your own marketing", before: "Neglected — clients came first", after: "Weekly, batched in 50 min" },
      { metric: "Results that reach an audience", before: "Locked in dashboards", after: "Published as tactical content" },
    ],
  },
  "content-marketers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns the content lessons you learn at work into a daily shortlist, plus takes on the shifting content landscape. Your career depends on a standout personal feed, but producing for employers leaves nothing left — this closes that gap.",
        time_saved: "Saves ~2 hours a week",
        example_output:
          "\"You don't have a content problem. You have a distribution problem — you're publishing into a room with nobody in it.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Generates hooks that are themselves a live audition for the attention-grabbing skill you claim. Because your subject is content itself, every hook you write is simultaneously a lesson and a demonstration — nailing them proves you understand attention.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"We published 60 blog posts last year. Four drove 90% of the pipeline. Here's what we should have done with the other 56.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Builds the framework carousel that teaches your methodology while demonstrating your quality in the doing. For a content marketer a great teaching carousel is both the message and the proof — there's no faking it.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide framework titled \"One Piece, Ten Posts\" — the source, the extraction method, the formats, the schedule, the result.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Sets the visual standard you'd advise others to meet, from one reference image. You can't credibly preach great content while posting mediocre-looking slides — this makes your feed a standard others aspire to.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Polished, standard-setting slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Keeping your own feed excellent, because it's the living portfolio your content-marketing career depends on.",
      "Publishing a framework that teaches your methodology while demonstrating your quality in the very act.",
      "Modelling the consistency you preach, since sporadic posting contradicts your entire expertise.",
      "Sharing a forward-looking take on AI, SEO shifts, or new formats, which keeps you relevant in a fast-moving discipline.",
      "Batching a week so the contradiction closes — the content expert whose own content strategy was neglected.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Own feed vs employer's content", before: "Yours went quiet", after: "Both — batched in 50 min" },
      { metric: "Credibility gap", before: "Preaching consistency, posting rarely", after: "Closed" },
    ],
  },
  "social-media-managers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your front-line platform knowledge into daily angles for your own feed. You grow brands all day and have nothing left by evening — this is what stops your personal presence, your best career asset, from sitting neglected.",
        time_saved: "Saves ~2 hours a week you'd never find",
        example_output:
          "\"What's actually working on LinkedIn right now, from managing 12 accounts — and the format everyone's about to over-use.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts hooks that promise current, practitioner-grade insight rather than the outdated advice flooding this space. Referencing your hands-on scale signals credibility instantly to peers, marketers, and the employers checking your socials.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"I've scheduled 4,000 posts. The best-performing ones all broke the rule I used to enforce in every content calendar.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your system into a carousel that teaches while demonstrating your quality — a content calendar that doesn't burn you out, cross-platform repurposing, engagement that isn't fake. A great carousel about social media, made by a social media manager, is both lesson and proof.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide system titled \"The Calendar That Doesn't Burn You Out\" — the trap, the batching rhythm, the buffer, the result.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces scroll-stopping, consistent slides from one reference. Your personal feed is a live demo of your ability — a scrappy look would undercut the exact content sense you're hired for.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Scroll-stopping, on-brand slides — sized for LinkedIn, Instagram, and Twitter/X in one pass.",
      },
    ],
    use_cases: [
      "Turning a platform insight from managing real accounts into insider content that proves your credibility.",
      "Batching your own week so your personal presence stays consistent without adding to your burnout.",
      "Publishing a take on a platform shift, which builds your reputation as someone genuinely ahead of the curve.",
      "Making your own feed a showcase, since recruiters and clients will check it before they ever email you.",
      "Repurposing one carousel across LinkedIn, Instagram, and X in a single pass rather than rebuilding it three times.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "1.5 hours", after: "15 minutes" },
      { metric: "Your own account", before: "Neglected — no energy left", after: "Consistent, batched in 50 min" },
      { metric: "Platforms covered per build", before: "One at a time, manually", after: "LinkedIn, Instagram and X at once" },
    ],
  },
  "performance-marketers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Surfaces daily angles from your real campaign data and the shifting performance landscape. Your proof lives locked in ad accounts — this is what turns it into the authority that separates a senior performance marketer from an interchangeable one.",
        time_saved: "Saves ~2 hours a week",
        example_output:
          "\"We cut CAC 40% by killing our best-performing campaign. It was cannibalising branded search we'd have won for free.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts number-led, counterintuitive hooks for an audience allergic to vague claims. Performance marketers live and die by data, so leading with the specific result and the reasoning is the only thing that earns their attention.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"Our ROAS looked incredible for six months. Then we ran a geo holdout and found 60% of it was people who'd have bought anyway.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your optimisation into a replicable carousel — a testing framework, honest attribution, scaling without tanking efficiency. When a marketer applies your method and their numbers improve, they share it, spreading your reputation across a tight, peer-driven community.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide framework titled \"How To Read Attribution Honestly\" — what the platform claims, what it can't see, the holdout test, the real number.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, data-friendly slides from one reference so your results are easy to grasp. Clear presentation of numbers is itself a signal of the analytical rigor you bring.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clean, data-clear slides in your palette — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a campaign turnaround into a proof carousel that reads as real credibility in a results-obsessed field.",
      "Publishing a counterintuitive, number-led hook that grabs a data-driven audience.",
      "Sharing a replicable optimisation that spreads across the performance community.",
      "Taking a strategic position on privacy changes or rising CACs, which elevates you from button-pusher to strategist.",
      "Batching a week so your authority-building holds through heavy campaign periods.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Results that reach an audience", before: "Locked in ad accounts", after: "Published weekly" },
      { metric: "Weekly hours on personal brand", before: "0 — buried in dashboards", after: "50 minutes, batched" },
    ],
  },
  "seo-specialists": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your real ranking wins and the constant algorithm churn into daily angles. You understand compounding better than anyone yet rarely apply it to your own content — this is what finally makes your authority compound the way your client sites do.",
        time_saved: "Saves ~2 hours a week between client work",
        example_output:
          "\"The ranking factor everyone obsesses over that barely moves the needle — and the boring one that does.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts myth-busting hooks backed by real testing, bringing clarity to a field drowning in contradictory advice. A data-backed correction positions you as a credible practitioner among the guesswork.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"We removed 400 pages from a client's site. Organic traffic went up 60%. Most 'content' was competing with the pages that actually earned rankings.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your process into an actionable carousel — a technical audit, topical authority, keyword research that converts. When someone applies your method and their rankings improve, you earn a follower and an advocate in a knowledge-hungry field.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide process titled \"The Technical Audit That Finds Real Problems\" — where to start, the red herrings, the checks that matter, the fix order.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, methodical slides from one reference so your audits and frameworks are easy to follow. Organised presentation signals the rigor SEO demands.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clean, process-clear slides in your palette — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a real ranking win into a case-study carousel that proves you know how search actually works.",
      "Publishing a myth-busting post that brings clarity to a field full of outdated advice.",
      "Being the calm, informed voice when a core update lands and everyone else is panicking.",
      "Batching a week so your personal authority compounds through consistency, just like the SEO you practise.",
      "Sharing an actionable process that grows your reputation across a knowledge-hungry community.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Personal authority compounding", before: "Ironically neglected", after: "Weekly, batched" },
      { metric: "Ranking wins published", before: "Stayed in client reports", after: "Case studies weekly" },
    ],
  },
  "email-marketers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your email wins and channel-advocacy takes into daily angles. Your work happens invisibly inside email platforms — this is what makes a highly measurable, revenue-driving skill set finally visible to the clients and employers who'd pay for it.",
        time_saved: "Saves ~2 hours a week",
        example_output:
          "\"Everyone's chasing the newest channel. Email quietly outperformed all of them again this quarter — here's the flow that did it.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Generates hooks that demonstrate the subject-line skill you sell. If you can't stop the scroll, why would a client trust you to get emails opened? Every hook is a mini-audition for exactly the skill you're known for.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"The subject line that lifted our open rate from 18% to 34% was four words long and slightly rude.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your framework into an actionable carousel — a welcome sequence, copy that converts, segmentation, deliverability. When someone applies your method and their email performance improves, they become an advocate who spreads your reputation.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide framework titled \"The Welcome Sequence That Pays For Itself\" — the emails, the timing, the one ask, the numbers.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, well-structured slides from one reference. You understand how design supports conversion, and your feed's clarity is a small demonstration of the conversion-focused thinking you bring to email.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clean, conversion-minded slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning invisible email revenue into a proof carousel that reads as real credibility.",
      "Publishing hooks that demonstrate your subject-line skill in the act of writing them.",
      "Sharing an email framework that grows your following and your authority.",
      "Championing email's ROI against the shiny-object crowd, which resonates with businesses tired of renting audiences.",
      "Batching a week so your authority-building holds through heavy campaign periods.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Work visible to employers/clients", before: "Invisible — lives in the ESP", after: "Published weekly" },
      { metric: "Weekly hours on personal brand", before: "0", after: "50 minutes, batched" },
    ],
  },
  "growth-hackers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your real experiments — the wins and the instructive failures — into daily angles. The growth community is obsessed with tactics that actually work, so your hands-on tests are far more valuable than the decade-old case studies everyone recycles.",
        time_saved: "Saves ~2 hours a week between experiments",
        example_output:
          "\"We 3x'd signups by making onboarding longer. Every instinct says shorten it. Every instinct was wrong.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts hooks that promise an unconventional, counterintuitive play. This audience craves creative tactics that break conventional wisdom — leading with a surprising, specific result signals the inventive thinking that defines good growth work.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"Our best acquisition channel was a support doc. Not a blog post, not an ad — a troubleshooting page that happened to rank for the problem our product solves.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your play into a replicable carousel — designing an experiment, building a referral loop, finding your activation moment. In a community that shares tactics obsessively, replicable value is exactly what spreads your reach.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide play titled \"Finding Your Activation Moment\" — the wrong metric, the cohort analysis, the moment, the redesign, the lift.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces sharp, clear slides from one reference so your experiment teardowns are easy to follow. Crisp presentation of data signals the analytical thinking good growth work requires.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Sharp, experiment-clear slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a real experiment into a teardown carousel — the credible tactical content this field craves.",
      "Publishing an unconventional result that grabs an audience hungry for creative plays.",
      "Sharing a replicable growth play that spreads across the community and builds your reputation.",
      "Treating your own content as a growth channel to test and optimise — proof of your skill in action.",
      "Publishing your mental models, which signals strategic depth beyond a bag of tactics.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Experiments that reach an audience", before: "Stayed in internal docs", after: "Published weekly" },
      { metric: "Your own audience growth", before: "Untested, unoptimised", after: "A channel you actually run" },
    ],
  },
  "brand-strategists": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your strategic frameworks and reads on famous brands into daily angles. Brand strategy is intellectual and subjective, so a visible, distinct point of view is your entire differentiation — this keeps it in front of clients rather than in your notes.",
        time_saved: "Saves ~2 hours a week between engagements",
        example_output:
          "\"A brand isn't your logo or your colours. It's the gap between what you promise and what you actually deliver — and everyone in your market can feel the size of that gap.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts hooks that reframe how sophisticated readers think about brand. Your audience includes marketers and founders who've heard the basics, so the hook must promise a genuinely more insightful lens — the kind that makes someone rethink what they thought they understood.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"They kept testing taglines. The problem was that the company couldn't agree on who they were for, and no tagline survives that.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your framework into a carousel prospects respect — defining positioning, brand architecture, finding a true differentiator. Clients hire strategists whose approach they admire, so sharing your thinking openly is direct authority-building.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide framework titled \"Finding The Real Differentiator\" — the shallow answers, the questions that surface it, the test, the outcome.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Keeps every carousel coherent and on-brand from one reference. You advise on brand, so inconsistency would undermine your credibility — a coherent feed is living proof you practise the disciplined brand-building you preach.",
        time_saved: "Saves ~1 hour per post",
        example_output:
          "Coherent, distinctive slides that exemplify your strategic sensibility — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a strategic insight into a carousel that makes your distinctive thinking visible.",
      "Publishing a reframe that makes a sophisticated reader rethink what a brand actually is.",
      "Analysing the strategy behind a famous success or failure, making your abstract expertise tangible through familiar examples.",
      "Maintaining a coherent feed, which proves you practise the brand discipline you sell.",
      "Batching a week so your intellectual authority compounds through consistent visibility.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Strategic thinking that reaches buyers", before: "Stayed in decks", after: "Published weekly" },
      { metric: "Own brand consistency", before: "Ironically inconsistent", after: "Coherent — automated" },
    ],
  },
  "content-strategists": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns the strategic decisions behind your work into daily angles — the audience insight, the distribution plan, the measurement call. Anyone can post content; showing how you strategise is what separates a strategist from a producer in the eyes of employers.",
        time_saved: "Saves ~2 hours a week",
        example_output:
          "\"You don't have a content problem. You have a distribution problem — and hiring another writer will make it worse.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts hooks that reframe how people approach content, signalling strategic depth. Your audience is marketers frustrated that their content isn't working — a hook diagnosing the real, higher-level issue marks you as the strategist who sees what they're missing.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"They published 200 pieces last year. Nobody could name a single one. Volume was never the strategy — it was the absence of one.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your method into a content-system carousel — a content engine, mapping to the buyer journey, measuring what matters. When a marketer adopts your system and their content finally works, you earn an advocate who spreads your authority.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide system titled \"The Content Engine\" — the inputs, the rhythm, the distribution, the measurement, the compounding.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clear, well-structured slides from one reference so your complex systems are easy to follow. Clarity of communication is core to a content strategist's value — a well-designed feed demonstrates it.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clear, system-legible slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a strategic decision into an insight post that proves you operate above content production.",
      "Publishing a reframe that diagnoses the real, higher-level content problem your reader has.",
      "Sharing a content system marketers can adopt, which grows your authority.",
      "Modelling the consistency you'd advise any client to keep, since sporadic posting undercuts your entire expertise.",
      "Taking a forward-looking position on AI and the shifting content ecosystem.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Perceived as strategist vs producer", before: "Mistaken for a writer", after: "Visible strategic thinking" },
      { metric: "Weekly hours on personal brand", before: "0", after: "50 minutes, batched" },
    ],
  },
  "copywriters": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your copywriting lessons and persuasion insights into daily angles for your specialism. Writing for clients all day leaves you drained with nothing for your own feed — which is the ultimate proof of the exact skill you sell.",
        time_saved: "Saves ~2 hours a week",
        example_output:
          "\"The word that quietly kills your sales copy — and it's in almost every headline I'm asked to fix.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Generates hook options that showcase your command of attention. Your hooks are the purest demonstration of your craft — if you can't stop the scroll, no client will trust you to sell. This makes hitting that bar repeatable rather than exhausting.",
        time_saved: "Saves ~25 minutes per post",
        example_output:
          "\"'Unlock your potential' has never sold anything to anyone. Here's what it's doing in your headline and what to replace it with.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns a technique into a carousel that teaches your craft while demonstrating it. Copywriters fear teaching gives away the goods — it does the opposite: it proves you're the expert while making DIY-ers realise they'd rather hire you.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide technique titled \"Handling Objections Inside The Copy\" — the objection, where it lives, the reframe, an example, the result.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Frames your words cleanly from one reference — professional, uncluttered, never competing with the copy. A considered feed signals you take your craft seriously, reassuring premium clients you're a pro worth their budget.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clean, typography-forward slides that let the words lead — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Making every post an audition, since your feed is the ultimate proof of the writing skill clients pay for.",
      "Teaching a technique in a carousel that demonstrates your skill in the very act of explaining it.",
      "Sharing the psychology behind persuasion, which sets you apart from writers who just string words together.",
      "Batching a week so your writing keeps attracting clients during busy project weeks — smoothing the feast-or-famine cycle.",
      "Owning a specialism and audience, which commands higher rates than generalist positioning.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Own feed vs client work", before: "Yours went quiet", after: "Both — batched in 50 min" },
      { metric: "Marketing during projects", before: "Stops — then you scramble", after: "Runs in the background" },
    ],
  },
  "linkedin-ghostwriters": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Keeps your own feed supplied while you write for a full client roster. You're hired to produce standout content, which leaves nothing for the personal presence that proves you can do the job — this closes the fatal contradiction.",
        time_saved: "Saves ~2.5 hours a week",
        example_output:
          "\"The hook structure I use to get my clients' posts 5x the reach — and why it works on a founder but fails on a coach.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Generates hooks that prove the scroll-stopping skill clients hire you for. Because you're literally selling the ability to write high-performing LinkedIn content, every hook you publish is a direct audition.",
        time_saved: "Saves ~25 minutes per post",
        example_output:
          "\"My client's post got 400,000 impressions. The first draft was better written. The published one just started in a more uncomfortable place.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your process into a carousel that teaches while demonstrating your quality — finding a client's voice, turning an idea into a post, structuring for reach. Sharing how you work attracts the clients who realise they'd rather hire your skill.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide process titled \"How I Find a Client's Voice in 30 Minutes\" — the questions, the transcript trick, the tells, the test.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Sets the visual standard clients will want for themselves. When a prospect wishes their feed looked like yours, your visual quality becomes a silent, ongoing sales pitch for your ghostwriting.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Polished, standard-setting slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Keeping your own feed thriving, because it's the case study your entire business depends on.",
      "Turning a client's growth into a results carousel that makes your invisible ghostwriting impact visible.",
      "Publishing thought-leadership takes that speak directly to the busy professionals who become clients.",
      "Modelling relentless consistency even with a full roster — closing the gap between your pitch and your feed.",
      "Teaching your writing process, which attracts prospects who conclude they'd rather hire the expert.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Own feed with a full client roster", before: "Went quiet — fatal contradiction", after: "Consistent, batched" },
      { metric: "Ghostwriting impact visibility", before: "Invisible by nature", after: "Results published (with consent)" },
    ],
  },
  "social-media-consultants": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Feeds you current, strategic angles about the platforms you consult on. Your own presence is your most important proof — no business hires a social media consultant whose socials are weak — so keeping it alive during client work is existential rather than nice-to-have.",
        time_saved: "Saves ~2 hours a week between client work",
        example_output:
          "\"The social strategy shift most businesses are missing right now — and it's not a platform, it's a format.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts current, strategic hooks rather than basic tips, positioning you as a strategist worth consulting. Because social changes fast and businesses feel behind, a hook that orients them to what actually works now grabs decision-makers.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"They were posting 5 times a day and growing nothing. We cut to 3 a week and tripled reach — the algorithm was rationing them for flooding.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your strategy into a carousel prospects can respect — building a presence from scratch, turning followers into customers, a content system that scales. Businesses hire consultants whose approach they admire, so teaching it openly attracts implementation clients.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide strategy titled \"Followers To Customers\" — why the funnel breaks, the missing step, the system, the metric that matters.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces scroll-stopping, consistent slides from one reference. Your feed is a live sample of your ability — a scrappy look would be disqualifying for someone selling social media expertise.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Scroll-stopping, on-brand slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a client win into a proof carousel that answers the skeptical business owner's ROI question.",
      "Keeping your own presence thriving, since it's the ultimate proof you can deliver social results.",
      "Publishing a current, strategic take that positions you above the poster crowd.",
      "Modelling the consistency you'd sell to any client, closing the credibility gap.",
      "Being the voice businesses turn to when a platform shift lands and they feel behind.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Your own socials while consulting", before: "Weak — disqualifying", after: "Thriving, batched" },
      { metric: "Weekly hours on your own brand", before: "0", after: "50 minutes, batched" },
    ],
  },
  "pr-professionals": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your PR wins and reads on live reputation moments into daily angles. You shape narratives for a living, yet your own has none — this is what turns the professional storyteller into someone with a compelling story of their own.",
        time_saved: "Saves ~2 hours a week between client work",
        example_output:
          "\"The reason your press release gets ignored isn't the news. It's that you wrote it for your CEO rather than the journalist's editor.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts well-framed hooks that demonstrate your narrative instinct — the core of your craft. Because PR is about making messages land, every hook you write showcases exactly the skill you sell.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"We landed the front page. Not because the story was bigger — because we gave the journalist the one thing every other pitch withheld: a named source who'd go on record.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your strategy into a carousel that demystifies PR — pitching journalists, handling a crisis, building thought leadership. Because so many misunderstand PR, showing how it actually works positions you as a credible authority.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide strategy titled \"How To Pitch a Journalist\" — what they need, what they ignore, the subject line, the follow-up, the result.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces polished, message-clear slides from one reference. PR is about clear, professional communication, and a feed that reflects that sensibility reinforces your credibility with every prospect.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Polished, message-clear slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a PR win into a behind-the-scenes carousel that proves the outcomes you deliver.",
      "Publishing your read on a reputation moment everyone's watching, showcasing your judgment in real time.",
      "Teaching how PR actually works, which builds authority in a craft outsiders find mysterious.",
      "Maintaining your own reputation consistently — a living case study of the discipline you sell.",
      "Writing hooks that demonstrate your narrative instinct in the act of publishing them.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Your own narrative", before: "None — you build others'", after: "Consistent, compelling, batched" },
      { metric: "Weekly hours on personal brand", before: "0", after: "50 minutes, batched" },
    ],
  },
  "marketing-agency-owners": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your client results and point of view into daily angles, so marketing your own agency stops happening only in the panic between projects. For a marketing agency this is existential: your own marketing is a live demonstration of whether you can do the job.",
        time_saved: "Saves ~2.5 hours a week of your own marketing",
        example_output:
          "\"If your last agency sent beautiful reports and no pipeline, the problem started in the kickoff call — and here's the question nobody asked.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns a client result into a proof caption that pre-qualifies prospects by naming their specific frustration. Speaking directly to a prospect's pain makes the right client feel understood before they book — which is when agency sales get easy.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"We tripled a client's qualified leads in 90 days. The first thing we did was turn off two of their four channels.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns a win into a case-study carousel without the case-study writing project nobody has time for. Prospects hire agencies on proof, and your delivery team generates that proof every week — this is what finally makes it content.",
        time_saved: "Saves ~2.5 hours per case study",
        example_output:
          "A 7-slide client story — the plateau, the misdiagnosis, the audit, the change, the 90-day number.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Matches your agency's colours and style on every carousel from one branded reference. Your feed is a live sample of your output — if it looks scrappy, prospects assume your deliverables will too.",
        time_saved: "Saves ~1 hour per post of designer time",
        example_output:
          "Premium, on-brand slides in your agency's palette — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning last week's client win into a proof carousel, so your results finally become your marketing.",
      "Systematising your own marketing like a client account — batched, scheduled, protected — ending the feast-or-famine pipeline.",
      "Publishing your point of view so your feed attracts dream clients and filters out the nightmares.",
      "Teaching part of your process, which wins the prospects who realise they'd rather hire the expert than DIY it.",
      "Making your own marketing excellent, since it's the most persuasive argument that clients should trust you with theirs.",
    ],
    results: [
      { metric: "Time to produce one case study", before: "4 hours (so nobody made them)", after: "20 minutes" },
      { metric: "Own-agency marketing", before: "Only in the panic between projects", after: "Weekly — batched, scheduled" },
      { metric: "Pipeline pattern", before: "Feast or famine", after: "Steady — runs on a system" },
    ],
  },
  "community-managers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your community wins and hard-won insight into daily angles. Community work is always-on and relentlessly demanding, so this is what stops your own authority-building from disappearing under the daily work of serving members.",
        time_saved: "Saves ~2 hours a week you're always-on",
        example_output:
          "\"Your community isn't dead because members are busy. You built it around your product instead of their problem.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts posts that reveal what really builds community, signalling genuine expertise. Founders whose communities are struggling are hungry for a diagnosis deeper than 'post more' — that reframe marks you as someone who understands the dynamics.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"Engagement tripled when we stopped posting. The founder was answering every question in 4 minutes — nobody else ever got the chance to be useful.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your system into a carousel others adopt — onboarding that makes members stick, sparking member-led conversation, measuring community health. It demonstrates strategic substance and attracts the roles that treat community as a business function.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide system titled \"Onboarding That Makes Members Stick\" — the first 48 hours, the introduction ritual, the first ask, the retention data.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Creates warm, human slides from one reference. Community is about people and belonging, and a feed that feels inviting rather than corporate reflects the atmosphere you know how to create.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Warm, human, inviting slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a community win into a proof carousel that shows real business value rather than good vibes.",
      "Publishing a sharp reframe about what actually builds community, which signals genuine expertise.",
      "Sharing a community system that founders adopt, growing your strategic authority.",
      "Making the case for community as a business driver, which elevates the discipline you work in.",
      "Batching a week so your authority-building continues while you're always-on for members.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Your own visibility", before: "Buried under member work", after: "Weekly, batched in 50 min" },
      { metric: "Perceived as strategist", before: "'The person who replies to comments'", after: "Visible strategic thinking" },
    ],
  },
  "b2b-sales-professionals": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns the objections and questions from your buyer conversations into daily angles. Every discovery call teaches you what buyers actually worry about — this makes that content magnetically relevant to the next prospect facing the same thing.",
        time_saved: "Saves ~2 hours a week between calls",
        example_output:
          "\"The hidden cost in your procurement process that nobody's tracking — and it's not the software licence.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts buyer-focused hooks that lead with their problem rather than your product. B2B buyers are drowning in pitches, so a hook offering genuine insight into their challenge positions you as a helpful expert instead of another rep to ignore.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"Most teams buying in this category write requirements for the tool they already know. Here's the question that surfaces what they actually need.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your insight into a buyer-education carousel — how to evaluate vendors, the mistakes teams make, building the business case. Giving genuine value builds trust long before they're ready to buy, so when they are, you're the rep they already trust.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide guide titled \"How To Build The Business Case Internally\" — who blocks it, the number that moves them, the framing, the one-pager.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces polished, credible slides from one reference. Your buyers are senior and judge credibility fast — a sharp feed reassures a decision-maker you're a credible partner rather than a spray-and-pray rep.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Polished, professional slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a real objection from a call into a post that warms the next prospect facing the same thing.",
      "Leading with the buyer's problem rather than your pitch, so decision-makers actually stop scrolling.",
      "Batching a week so you stay top of mind through long, unpredictable buying cycles.",
      "Being visibly human — the deal you lost, why you believe in what you sell — in a profession people are conditioned to distrust.",
      "Making your outreach warm, because a prospect who recognises your name from useful content actually opens the email.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Outreach temperature", before: "Cold — bare profile", after: "Warm — they recognise you" },
      { metric: "Weekly hours on social selling", before: "0 — calls and CRM eat it", after: "50 minutes, batched" },
    ],
  },
  "sales-managers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your coaching moments and team wins into daily angles about the real tensions of sales leadership. This is the material senior sales leadership roles hire for, and it previously never left your one-on-ones.",
        time_saved: "Saves ~2 hours a week through the quarter",
        example_output:
          "\"Your best rep isn't your best hire. Promoting them cost you your top closer and gave you your worst manager.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts posts naming the hard realities of carrying a number through other people — coaching underperformers, protecting culture under quota pressure. These specific, uncomfortable truths earn respect from peers and signal genuine leadership depth.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"He missed quota three quarters running. I nearly let him go. The problem was the territory, and it took me nine months to check.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your system into a leadership carousel — pipeline reviews that actually help, coaching a struggling rep, a forecast people trust. It positions you as a thinker in the sales-leadership space, which attracts both senior roles and strong reps.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide system titled \"Pipeline Reviews That Don't Waste Everyone's Time\" — the ritual that fails, the questions, the format, the outcome.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces polished, leadership-caliber slides from one reference. As you build a leadership brand your feed should look the part — it signals the professionalism senior leadership expects.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Polished, credible slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a coaching breakthrough into a story that proves you develop people, not just hit numbers.",
      "Naming a tension every sales manager feels, which resonates with peers rather than sounding like motivation.",
      "Championing your reps publicly, turning your feed into a recruiting magnet in a scarce talent market.",
      "Batching a week so your leadership brand keeps building through quarter-end chaos.",
      "Publishing a leadership system, which is exactly the profile VP roles are hired against.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Visibility at quarter-end", before: "Disappears entirely", after: "Held — batched ahead" },
      { metric: "Leadership evidence", before: "Invisible outside your team", after: "Published weekly" },
    ],
  },
  "account-executives": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns the objections and misconceptions from your discovery calls into daily angles. Your quota depends on getting meetings with people drowning in outreach — this is what makes a prospect recognise your name before your email lands.",
        time_saved: "Saves ~2 hours a week between demos",
        example_output:
          "\"Most teams buying in this category get the requirements wrong — they write them for the tool they already demoed.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts hooks that diagnose the buyer's problem rather than pitching. Because B2B buyers are pitched constantly, a hook that helps them think better about their decision positions you as a trusted advisor rather than another rep with a quota.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"I lost a deal last month because I answered the question they asked instead of the one they meant. Here's how I'd run that call again.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your insight into a carousel that helps buyers decide well — even neutrally. Helping them choose builds trust that pays off when they do buy: you become the rep they call rather than the one they dodge.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide guide titled \"How To Evaluate Vendors In This Category\" — the demo trap, the questions that matter, the reference checks, the red flags.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces polished, credible slides from one reference. Your buyers are senior and judge fast — a sharp feed signals you're a serious professional worth a meeting.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Polished, credible slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a real objection into a post that warms your next buyer before you reach out.",
      "Leading with the buyer's problem, so decision-makers who scroll past every ad actually stop.",
      "Helping buyers make a better decision, which makes you the rep they call rather than dodge.",
      "Showing the human behind the quota, which is a genuine differentiator in a profession people distrust.",
      "Batching a week so your visibility holds through quarter-end crunch and demo-heavy stretches.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Email open rate driver", before: "Unknown name, cold", after: "Recognised from their feed" },
      { metric: "Weekly hours on social selling", before: "0 — demos and CRM eat it", after: "50 minutes, batched" },
    ],
  },
  "business-development-managers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns the deals you structure and the partnerships you navigate into daily angles anchored to your ecosystem. BD runs entirely on relationships and reputation, so being a known name is the single biggest multiplier on your effectiveness.",
        time_saved: "Saves ~2 hours a week between meetings",
        example_output:
          "\"Most partnerships fail before the contract is signed — in the conversation nobody has about what happens when it isn't working.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts hooks around partnership and growth insight, signalling you think at a business level rather than a networking one. That proves you understand the mechanics of creating mutual value, which is what attracts the partners worth having.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"The partnership that doubled our pipeline started as a favour with no contract. The one we spent four months papering never shipped.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your approach into a carousel that demystifies how deals actually get done — structuring a partnership that lasts, finding the right partner, building a case both sides believe. It builds the authority that brings opportunities inbound.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide guide titled \"Structuring a Partnership That Survives\" — the incentive mismatch, the kill clause, the review cadence, the outcome.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces polished, partner-ready slides from one reference. You approach senior partners and executives, so a credible feed quietly supports every partnership conversation you're trying to start.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Polished, credible slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a partnership lesson into an insight carousel that proves you're a strategic operator, not just a networker.",
      "Publishing insight about how deals really get done, which attracts partners and founders who might work with you.",
      "Being visibly generous — celebrating partners, sharing insight — which builds the goodwill BD runs on.",
      "Batching a week so your visibility holds through a travel- and meeting-heavy schedule.",
      "Making opportunities find you, rather than opening every door manually through cold outreach.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "How opportunities arrive", before: "Cold outreach, every time", after: "Inbound from people watching" },
      { metric: "Weekly hours on visibility", before: "0 — meetings eat everything", after: "50 minutes, batched" },
    ],
  },
  "software-engineers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns the gnarly bugs, architecture decisions, and refactors from your week into daily angles. Engineers guard deep work fiercely and context-switching to find a topic is costly — this removes that cost entirely.",
        time_saved: "Saves ~2 hours a week of context-switching",
        example_output:
          "\"We spent 3 weeks building a caching layer we didn't need. Here's the question that would have saved us — and why nobody asked it.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts hooks around real engineering pain rather than 'clean code matters' platitudes. Engineers scroll past fluff but stop for concrete war stories with a genuine technical lesson inside — this keeps you on the right side of that.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"Our p99 latency dropped 80% after we deleted code. Not optimised — deleted. The retry logic was the thing causing the retries.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns a technical concept into a clear explainer carousel — the problem, the naive approach, the insight, the solution, the trade-off. Explaining depth clearly is rare and valued: it's exactly the combination that gets engineers into senior and staff roles.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide explainer titled \"Why Your Retry Logic Is Making Things Worse\" — the failure mode, the thundering herd, backoff, jitter, the fix.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, consistent slides from one reference so your explainers are legible. Clear presentation of complex ideas is itself a demonstration of the communication skill that separates senior engineers from strong coders.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clean, diagram-friendly slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a real problem you debugged into a teaching post, so your daily work becomes career-building content.",
      "Publishing a technical explainer that proves you can communicate depth clearly — the senior-engineer differentiator.",
      "Sharing an outage or a design you regret, which demonstrates the judgment that only comes from being wrong.",
      "Batching a week so reputation-building never interrupts deep work or your flow state.",
      "Naming a real engineering pain rather than a platitude, which earns respect from a skeptical audience.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours (and a broken flow state)", after: "15 minutes" },
      { metric: "Deep work interrupted by content", before: "Every time — so you skipped it", after: "Never — batched separately" },
      { metric: "Technical work that reaches an audience", before: "Stays in PRs and Slack", after: "Published weekly" },
    ],
  },
  "web-developers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your shipped projects, performance wins, and grounded takes on framework churn into daily angles. Whether you're freelance or employed, this is what stops your craft from being invisible until someone has already hired you.",
        time_saved: "Saves ~2 hours a week between builds",
        example_output:
          "\"Your Lighthouse score is lying to you. Here's what actually made our client's site feel fast — and it wasn't in the report.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts hooks with concrete problems and measurable results, which is what stops a practical audience mid-scroll. Generic 'learn to code' content gets ignored; a specific, technical reality earns attention from developers and technical buyers alike.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"We cut their page weight by 70% without touching a single image. The site was shipping three copies of the same font.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your technique into an actionable carousel — optimising load time, structuring a component library, real accessibility. When a developer applies it and it works, you earn an advocate; when a client sees it, they see the expert they'd rather hire.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide technique titled \"Making a Site Actually Feel Fast\" — perceived vs measured, the render path, the three fixes, the result.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, well-designed slides from one reference. Visual quality is part of your craft — a scrappy feed undercuts the attention to detail clients and employers are hiring for.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clean, well-crafted slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a shipped project into a proof-of-skill carousel, so your portfolio grows every time you deliver.",
      "Publishing a real web problem with a measurable result, which grabs a practical, fluff-allergic audience.",
      "Sharing a technique that grows your authority and makes clients see the expert they'd rather hire.",
      "Taking a grounded, pragmatic position on framework churn rather than chasing every hype cycle.",
      "Batching a week so visibility holds through heads-down build weeks without breaking your flow.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Marketing during a big project", before: "Stops — then you scramble", after: "Runs in the background" },
      { metric: "How clients judge you", before: "A portfolio link and a price", after: "Demonstrated expertise" },
    ],
  },
  "data-scientists": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your surprising findings, failed models, and methodological lessons into daily angles. Data work demands long stretches of focus, so context-switching to find a topic is costly — this removes it while keeping the content practitioner-grade.",
        time_saved: "Saves ~2 hours a week of context-switching",
        example_output:
          "\"Our A/B test was significant. It was also completely wrong — we'd been peeking at the results daily for three weeks.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts hooks around counterintuitive, technically-grounded truths for a rigorous, hype-resistant audience. Data people scroll past 'AI will change everything' but stop for a specific, well-reasoned insight that challenges how they work.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"The model was 94% accurate and completely useless. The base rate was 94% — we'd built a very expensive way of saying 'no'.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns a concept into a jargon-free explainer — designing a trustworthy experiment, spotting overfitting, communicating uncertainty. Explaining statistical depth clearly demonstrates both rigor and communication, the combination that gets data scientists promoted.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide explainer titled \"Why Your A/B Test Lied To You\" — peeking, the multiple-comparisons trap, the fix, the honest readout.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, credible slides from one reference so your quantitative ideas are easy to follow. Clear visual communication of complex ideas is literally part of the job — a well-presented feed demonstrates that competence.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clean, chart-friendly slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a real finding into an insight carousel that proves your practitioner judgment rather than your tooling.",
      "Publishing a counterintuitive data truth that earns attention from a rigorous, hype-resistant audience.",
      "Explaining a concept clearly, which demonstrates the rare combination of rigor and communication skill.",
      "Sharing the stakeholder side — pushing back on a bad metric, saying 'the data can't answer that' — which reflects the real job.",
      "Batching a week so reputation-building never interrupts the deep focus your analysis requires.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Deep work interrupted", before: "Every time — so you skipped it", after: "Never — batched separately" },
      { metric: "Judgment visible to employers", before: "Locked in notebooks", after: "Published weekly" },
    ],
  },
  "ai-researchers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your research insights and grounded reads on capability claims into daily angles. The AI conversation is deafening and mostly shallow — this is what lets someone with actual research depth contribute without it costing a research day.",
        time_saved: "Saves ~2 hours a week away from research",
        example_output:
          "\"This model isn't reasoning. Here's what it's actually doing — and why the distinction matters for what you're about to build on it.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts hooks that bring rigor to hype, which is genuinely refreshing and highly shareable in a noise-saturated space. Because so much AI content is breathless speculation, precise, honest framing stands out immediately.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"The benchmark everyone's citing measures something nobody actually wants. Here's what it's really testing.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns a hard idea into a legible explainer without dumbing it down — how a technique works, why an assumption is wrong, what a benchmark measures. Making hard ideas legible builds enormous authority and opens doors most researchers never see.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide explainer — the popular misconception, the actual mechanism, the caveat, and the implication for practitioners.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, credible slides from one reference, letting the substance lead. Research communication lives on clarity, and clear presentation signals the same rigor you bring to your work.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clean, rigorous, non-sensational slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a research insight into an accessible carousel that spreads your ideas beyond the handful who read papers.",
      "Bringing rigor to AI hype, delivering the signal a noise-saturated audience is starved for.",
      "Making a genuinely hard idea legible, which builds authority and bridges the technical and the public.",
      "Being honest about limitations and uncertainty, which builds deep trust with researchers and decision-makers.",
      "Batching a week so your voice stays present in a fast-moving field without derailing your research.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "3 hours away from research", after: "20 minutes" },
      { metric: "Reach of a research insight", before: "The dozen who read the paper", after: "Thousands, weekly" },
      { metric: "Public conversation in your field", before: "Happens without you", after: "Includes an actual expert" },
    ],
  },
  "ux-designers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns the design decisions you make daily into angles — the research insight that changed a flow, the trade-off, the pattern you rejected. Design work drains the exact creative energy needed for personal content, and this is what closes that gap.",
        time_saved: "Saves ~2 hours a week of creative energy",
        example_output:
          "\"Your users aren't confused by your UI. They're confused by your product's model of the world, and no amount of tooltips will fix that.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts hooks that reframe design problems at a deeper level, signalling strategic thinking rather than aesthetics. That's what attracts the product leaders and founders who need a designer who thinks systemically.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"We ran five rounds of usability testing on a screen that shouldn't have existed. The research was flawless. The question was wrong.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your principle into a carousel whose own craft demonstrates your ability — research on a budget, why a pattern fails, designing the unhappy path. For a designer the medium is the portfolio: a well-built carousel about design is its own proof.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide principle titled \"Designing The Unhappy Path\" — the happy-path bias, where products break, the method, the outcome.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces flawlessly designed slides from one reference. Your feed's visual quality is judged mercilessly as a portfolio piece — this makes it your strongest one, without the creative drain.",
        time_saved: "Saves ~1 hour per post",
        example_output:
          "Beautifully designed, perfectly consistent slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a design decision into a reasoning carousel that proves you're a strategic designer, not a decorator.",
      "Publishing a reframe that signals depth beyond aesthetics, attracting leaders who need systemic thinking.",
      "Making the case for design as a business driver, which earns you a seat at the table.",
      "Letting your feed be a flawless portfolio piece — the most direct proof you can do the thing you claim.",
      "Batching a week so building your presence doesn't drain the creative energy your real work needs.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "3 hours of creative energy", after: "15 minutes" },
      { metric: "Your feed as a portfolio", before: "Quiet or rushed — a liability", after: "Flawless, consistent" },
      { metric: "Design thinking visible", before: "Locked in Figma", after: "Published weekly" },
    ],
  },
  "product-designers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your shipped work and the outcomes it drove into daily angles, plus the real tensions of product design. This is the material that separates a senior product designer from a pixel executor — and it was previously invisible.",
        time_saved: "Saves ~2 hours a week of creative energy",
        example_output:
          "\"The prettiest design we shipped was our worst-performing. It tested beautifully and converted terribly — we'd optimised for the review, not the user.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts hooks naming the hard trade-offs — craft vs speed, user needs vs business goals, saying no to a stakeholder. These uncomfortable realities resonate with practitioners and signal maturity rather than design theory.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"I argued against the feature for three weeks. We shipped it. It failed exactly as I predicted — and I was still wrong, because I never made the case in their language.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your method into a carousel whose craft proves your ability — designing a first version worth shipping, a design system that survives, validating before building. A double demonstration few professions get from one post.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide method titled \"A First Version Worth Shipping\" — the scope trap, the smallest real test, the cut list, the outcome.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces beautifully consistent slides from one reference. You're judged on both thinking and execution — a feed demonstrating both is the most complete proof of your ability.",
        time_saved: "Saves ~1 hour per post",
        example_output:
          "Beautifully executed, consistent slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a shipped project into an outcome-led carousel that reframes design work as business impact.",
      "Naming a real product-design tension, which resonates with practitioners rather than sounding like theory.",
      "Sharing the collaboration side — influencing without authority, disagreeing with a PM — which is the profile senior roles hire for.",
      "Letting your feed prove both your thinking and your execution.",
      "Batching a week so your presence doesn't drain the energy your product work demands.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "3 hours of creative energy", after: "15 minutes" },
      { metric: "Perceived as product partner", before: "Seen as a pixel executor", after: "Visible product judgment" },
      { metric: "Outcomes that reach an audience", before: "Stay in Figma and reviews", after: "Published weekly" },
    ],
  },
  "developer-advocates": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns the real developer pain you hear daily into angles for genuinely helpful content. Conference travel, docs, and community support leave no room for the consistent public output that is literally the core measurable of your role.",
        time_saved: "Saves ~3 hours a week during conference season",
        example_output:
          "\"The auth pattern that breaks in production — and the reason nobody documents it is that it works fine locally.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts hooks promising concrete technical help rather than product marketing. Developers detect marketing instantly and scroll past it — this keeps your content on the side that earns trust, which is the entire product of your job.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"Our docs were wrong for eight months. Here's the bug it caused, why nobody reported it, and what we changed about how we write examples.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your knowledge into a technical teaching carousel that helps without pitching — how a protocol works, debugging a common failure, an architecture pattern. Teaching without selling is the essence of good DevRel, and trust is what eventually makes developers try your product.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide explainer — the failure mode, the naive fix, the actual mechanism, the correct pattern, and the trade-off.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, developer-friendly slides from one reference — no over-designed marketing aesthetics that developers distrust. Clear presentation signals the same care you'd want in documentation.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clean, code-friendly slides that let the substance lead — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning real developer pain into helpful content that serves the community first and your product second.",
      "Publishing a hook that promises a concrete fix, which earns attention from an audience that detects marketing instantly.",
      "Teaching without pitching, because trust is what eventually makes developers try what you build.",
      "Being honest about your product's limits, which is counterintuitive to marketing instincts and exactly what makes developers listen.",
      "Batching a week so your public output — the core of your role — survives conference and travel season.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Output during conference season", before: "Lapses for weeks", after: "Consistent — batched ahead" },
      { metric: "Tone under time pressure", before: "Drifts into product marketing", after: "Stays genuinely helpful" },
    ],
  },
  "technical-writers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns the documentation challenges you solve daily into angles about information design. Technical writing is a rare, undervalued craft practised entirely in private — this is what finally makes it visible in a field where almost nobody builds a public profile.",
        time_saved: "Saves ~2 hours a week between deadlines",
        example_output:
          "\"Your docs aren't too technical. They're answering the question you wanted to answer rather than the one the reader arrived with.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Generates sharp, clear hooks that demonstrate the make-it-simple skill at the heart of your craft. Every hook you write is an audition for exactly what employers and clients are evaluating.",
        time_saved: "Saves ~25 minutes per post",
        example_output:
          "\"We deleted 60% of the documentation. Support tickets dropped. The missing 60% had been actively misleading people.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your principle into a carousel whose own clarity proves your ability — structuring docs people finish, writing to a reader's mental model, deciding what not to document. Clarity is your product, so the medium is the proof.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide principle titled \"What Not To Document\" — the completeness trap, the maintenance cost, the decision rule, the result.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, legible slides from one reference — a model of the clarity you sell. Cluttered visuals would contradict your entire value proposition.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clean, well-structured, legible slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a documentation challenge into a craft carousel that makes your information-design skill visible and valued.",
      "Writing hooks that prove you can make complexity graspable — the exact skill you're hired for.",
      "Making the case for docs as a business asset, which elevates an undervalued discipline.",
      "Building a public profile in a field where almost no writers have one, so your reputation compounds unusually fast.",
      "Letting your feed exemplify the clarity you sell — the most fitting possible proof.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Public profile in your field", before: "None — nobody has one", after: "Weekly, compounding fast" },
      { metric: "Craft visibility", before: "Uncredited in docs sites", after: "Published and attributed" },
    ],
  },
  "cto-tech-leaders": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns 20 minutes of your real thinking — a hard decision, a technical stand, a team win — into a week of angles. Your calendar is architecture reviews, hiring, incidents, and board prep; this makes visibility a leveraged activity rather than an hour a day you'll never find.",
        time_saved: "Saves ~4 hours a week you don't have",
        example_output:
          "\"We chose the boring technology. It was the best decision we made, and I still have to defend it in every architecture review.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts posts that take a real technical stand or admit an honest mistake, cutting through the cautious content most executives publish. Engineers respect leaders with real opinions and real scars — and those are exactly the people you want joining your team.",
        time_saved: "Saves ~40 minutes per post",
        example_output:
          "\"I approved a rewrite. It nearly killed us. Not because rewrites are wrong — because I couldn't articulate what 'done' meant and neither could anyone else.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns a leadership lesson into a carousel with the story that makes the principle credible — scaling an org, build vs buy, managing technical debt strategically. This is the content engineers actually follow and that leads to board and advisory roles.",
        time_saved: "Saves ~2.5 hours per carousel",
        example_output:
          "A 7-slide lesson titled \"The Technical Debt We Chose To Keep\" — the pressure to fix it, the real cost model, the decision, the outcome.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, credible slides from one reference. Your feed is read by engineers who judge quality instinctively and investors who read polish as competence — a considered feed matches the standards you set in code review.",
        time_saved: "Saves ~1 hour per post",
        example_output:
          "Clean, technically-credible slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Handing over 20 minutes of raw thinking and getting a week of on-brand posts back — visibility without the calendar cost.",
      "Taking a real technical stand, which cuts through corporate caution and attracts engineers who want a leader with a spine.",
      "Championing your engineers and culture publicly, turning your feed into a recruiting magnet in a brutal talent market.",
      "Turning a hard decision — the rewrite you refused, the debt you kept — into content that builds genuine trust.",
      "Staying consistently visible through incidents and board prep, because influence compounds and sporadic posting builds none.",
    ],
    results: [
      { metric: "Your time per week on content", before: "An hour a day you never found", after: "20 minutes of raw input" },
      { metric: "Posts per month", before: "1, cautious, says nothing", after: "12 with real conviction" },
      { metric: "Engineering hiring pipeline", before: "Job posts and recruiters", after: "Inbound from your feed" },
    ],
  },
  "cybersecurity-experts": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your sanitised findings and current threat reads into daily angles that cut through FUD. Incident response is reactive and relentless, so this is what keeps your practitioner credibility visible through an on-call stretch.",
        time_saved: "Saves ~2 hours a week between incidents",
        example_output:
          "\"That vulnerability everyone's panicking about probably doesn't affect you. Here's the 30-second check that tells you.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts calm, precise assessments rather than vendor fear-mongering. The security conversation is drowning in FUD, so a practitioner offering grounded analysis stands out immediately as a credible signal source.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"The breach wasn't sophisticated. It was a service account with a password from 2019 and no MFA, and that's true of almost every breach I've responded to.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your approach into an actionable carousel — real threat modelling, prioritising the vulnerabilities that matter, explaining risk to executives. It builds authority with practitioners while proving to business buyers that you make security tractable rather than terrifying.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide guide titled \"Prioritising Vulnerabilities That Actually Matter\" — why CVSS misleads, the context questions, the ranking, the outcome.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, no-nonsense slides from one reference. Security audiences distrust flash and marketing gloss, so a substantive look signals you're a serious practitioner rather than a vendor pushing fear.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clean, no-nonsense, technically-credible slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a sanitised finding into a teaching carousel that proves you've done the real work rather than recycling headlines.",
      "Cutting through FUD with a grounded assessment, delivering genuine signal in a fear-saturated space.",
      "Translating security risk into business language, which proves you can operate at the executive level.",
      "Batching a week so your visibility holds through incident-heavy stretches and on-call rotations.",
      "Publishing a defensive practice that practitioners actually use, building authority in a trust-driven field.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Visibility during on-call", before: "Zero", after: "Held — batched ahead" },
      { metric: "Who shapes the conversation", before: "Vendors selling fear", after: "Practitioners with real findings" },
    ],
  },
  "financial-advisors": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Delivers educational, non-promissory angles around your ideal client's real financial worry. Compliance uncertainty is what stops most advisors posting at all — this keeps the content on the educational side of the line so review is a quick check rather than a rewrite.",
        time_saved: "Saves ~2 hours a week between client meetings",
        example_output:
          "\"Everyone's panicking about the market. Here's what actually matters for a retirement that's 18 years away — and it isn't this week.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts calm, educational captions that address money anxiety without hype or fear-mongering. Your prospects have been burned by both, so being the advisor who lowers their heart rate is exactly what earns the trust that precedes handing over a financial life.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"He'd been in cash for six years waiting for the right moment. The cost of waiting was never the crash he avoided — it was the six years.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns one concept into a clear educational carousel — how tax-advantaged accounts work, why timing fails, what a real retirement number looks like. Educational content free of product pitches is both compliance-friendly and the thing that builds genuine trust.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide explainer titled \"What Your Retirement Number Actually Needs To Be\" — the rule of thumb that misleads, the real inputs, the range, the next step.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces calm, steady, professional slides from one reference — deliberately not flashy. For someone deciding who to trust with their retirement, a considered and calm feed is itself a meaningful trust signal.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Calm, fiduciary-feeling slides — no Lamborghinis — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a concept you explain in every client meeting into an educational carousel that makes it finally click for a stranger.",
      "Publishing calm perspective when the market panics, which is exactly when trust is built.",
      "Keeping content educational rather than promotional, so compliance review is a quick check and the trust compounds.",
      "Batching a week so you stay present through the very long window in which someone chooses an advisor.",
      "Competing with unregulated finance influencers by being the credible, calm voice they're not.",
    ],
    results: [
      { metric: "Time to draft one carousel", before: "3 hours", after: "20 minutes (+ compliance review)" },
      { metric: "Posts published per month", before: "0 — felt too risky", after: "8–12 educational, reviewed" },
      { metric: "Who shapes client expectations", before: "Unregulated influencers", after: "You, calmly and credibly" },
    ],
  },
  "wealth-managers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Surfaces angles around the specific complexity your clients face — liquidity events, concentrated stock, estate planning, multi-generational wealth. Affluent prospects dismiss generic money advice instantly, so this keeps you on the sophisticated side of the line.",
        time_saved: "Saves ~2 hours a week between client meetings",
        example_output:
          "\"Your biggest financial risk isn't the market. It's that 70% of your net worth is in one stock and your identity is tied to the company that issued it.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts educational, non-promissory captions pitched at sophisticated concerns. Speaking to complexity only your clients have immediately separates you from mass-market finance content and earns rare, valuable attention.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"The liquidity event felt like the finish line. Eighteen months later, the hardest question wasn't where to invest it — it was who he was now that he'd sold.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns a complex strategy into a clear educational carousel — concentrated positions, tax-efficient giving, planning around a liquidity event. Educational depth on genuinely complex topics is what makes a sophisticated prospect think you understand their situation.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide explainer titled \"Thinking About a Concentrated Position\" — the emotional trap, the risk math, the structures, the sequencing.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces refined, understated slides from one reference. Your audience operates in a world of quiet quality — anything loud reads as a mismatch for wealth, so elegance is the right signal.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Understated, premium, discreet slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a complex strategy into an educational carousel that proves you operate at your clients' level.",
      "Naming a sophisticated concern that mass-market finance content never addresses.",
      "Publishing about the human side of wealth — family, purpose, legacy — which shows you see clients as people rather than portfolios.",
      "Keeping content educational so compliance is a quick check rather than a blocker.",
      "Batching a week so your presence is steady across the years-long window in which affluent clients decide.",
    ],
    results: [
      { metric: "Time to draft one carousel", before: "3 hours", after: "20 minutes (+ compliance review)" },
      { metric: "Visibility to researching prospects", before: "Nothing when they look you up", after: "Sophisticated, credible content" },
      { metric: "Client source", before: "Referrals only", after: "Referrals + inbound" },
    ],
  },
  "accountants": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns the questions clients ask you every day into daily angles for your specialism. If one client asks it, hundreds of business owners are wondering the same thing — this is what turns private advice into public trust.",
        time_saved: "Saves ~2 hours a week, even in busy season",
        example_output:
          "\"The expense category most freelancers forget — and it's costing them roughly £1,800 a year each.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts calm, human, judgment-free captions that lead with the money at stake rather than dry compliance language. Accounting triggers anxiety and shame, so a tone that lowers stress is exactly what makes an owner want to work with you.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"She'd been avoiding her books for eight months. The bill wasn't the scary part — it was smaller than she feared. The avoidance had cost more than the tax.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns one rule into a genuinely clear explainer — structuring for tax, what records matter, reading your own P&L. Making accounting understandable is rare and valuable, and when your free explanation makes something click, they trust you with the whole picture.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide explainer titled \"Reading Your Own P&L\" — the three numbers that matter, the one everyone misreads, and what to do about it.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, warm, modern slides from one reference. The profession's reputation is dry and intimidating — an approachable look quietly tells anxious owners that working with you won't feel like being told off.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clean, warm, human slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a question you answer daily into a public post that reaches hundreds of owners wondering the same thing.",
      "Leading with the money at stake rather than compliance language, which is what makes a busy owner stop scrolling.",
      "Being the calm, judgment-free voice in a subject that triggers anxiety, which differentiates you from the stereotype.",
      "Batching a week so your feed keeps working through tax season instead of going dark when you're busiest.",
      "Owning a client specialism, which turns you from an interchangeable provider into the obvious choice.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Feed during busy season", before: "Goes dark — right when it matters", after: "Keeps running, batched ahead" },
      { metric: "How you compete", before: "Price and proximity", after: "Visible expertise and trust" },
    ],
  },
  "tax-consultants": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns the confusions you correct daily into angles for your tax specialty. People with a specific tax problem search desperately for a specialist — this is what makes you findable while misinformation costs them thousands.",
        time_saved: "Saves ~2 hours a week, even at deadline",
        example_output:
          "\"The tax rule that catches out 80% of property investors — and by the time you notice, it's usually too late to fix.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts hooks leading with the money at stake or a looming deadline, which creates urgency dry compliance language never will. Tax mistakes are expensive and people know it — a hook promising to prevent one grabs immediate attention.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"He'd been following advice from a forum for three years. The advice was right — for a different country. The correction cost £14,000.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns one intimidating rule into a clear explainer — how a relief works, what triggers a liability, how to structure it properly. When your free explanation prevents a costly error, you've earned enormous trust and a very likely client.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide explainer titled \"The Relief Most People Miss\" — who qualifies, the timing trap, the claim, the evidence you need.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clear, approachable slides from one reference. Tax already feels intimidating — a calm, legible look is itself a reason to engage with a subject people avoid out of fear.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clear, calm, authoritative slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a confusion you correct privately into a clarity carousel that helps thousands.",
      "Leading with money at stake or a deadline, which creates the urgency dry compliance framing never does.",
      "Cutting through the tax misinformation that costs people thousands, positioning you as credible signal.",
      "Batching a week so your feed keeps working through filing season instead of going dark.",
      "Owning a specific tax situation, so people searching for exactly your expertise can finally find you.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Feed at deadline season", before: "Dark — when attention peaks", after: "Running, batched ahead" },
      { metric: "Who people trust for tax info", before: "Forums and bad advice", after: "A findable specialist" },
    ],
  },
  "investment-advisors": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Delivers educational, prediction-free angles that counter market panic with perspective. Compliance uncertainty stops most advisors posting entirely — this keeps content on the educational side so your expertise finally reaches people.",
        time_saved: "Saves ~2 hours a week between client meetings",
        example_output:
          "\"The market dropped 8% this week. Here's why your plan probably shouldn't change — and the one situation where it should.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts calm, perspective-giving captions rather than amplifying alarm. Financial media manufactures constant panic, so being the steady voice when everyone else is shouting is precisely what builds the trust that precedes an investment relationship.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"He sold everything in March 2020 and felt brilliant for about four weeks. The recovery is why we write the plan before the panic, not during it.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns one principle into an educational carousel free of predictions — why diversification works, how fees compound, why timing fails. This gives investors the understanding financial media never provides, which is what builds lasting trust in you.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide explainer titled \"How Fees Compound Against You\" — the small number, the 30-year math, the comparison, the takeaway.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces calm, steady slides from one reference. Investing content is full of hype and screaming green charts — a disciplined, quiet look immediately signals you're a fiduciary rather than a speculator.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Calm, disciplined, non-hype slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning an investing principle into an educational carousel with no predictions or promises.",
      "Countering market panic with perspective, which is exactly when trust gets built.",
      "Addressing investor psychology rather than markets, since behavior drives returns far more than picks.",
      "Keeping content educational so compliance is a quick check rather than a blocker.",
      "Batching a week so your steady presence holds through the long, cautious decision to choose an advisor.",
    ],
    results: [
      { metric: "Time to draft one carousel", before: "3 hours", after: "20 minutes (+ compliance review)" },
      { metric: "Posts published per month", before: "0 — compliance felt risky", after: "8–12 educational, reviewed" },
      { metric: "Voice during market panic", before: "Silent while media shouts", after: "The calm, credible one" },
    ],
  },
  "personal-trainers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns the teachable moments from your sessions into daily angles aimed at the outcome your client actually wants. Your day is fragmented across early mornings and evening clients, so this is what makes consistent posting possible at all.",
        time_saved: "Saves ~2 hours a week across split shifts",
        example_output:
          "\"The 10-minute fix for the back pain your desk job is causing — and why stretching has been making it worse.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts outcome-led, shame-free captions that name your client's real-life problem rather than the exercise. 'No excuses' repels the exact people who need a trainer most — this is tuned to attract the person who's failed before and feels bad about it.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"He didn't need more motivation. He needed a workout that fit between the school run and his first meeting — so we built one that took 22 minutes.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns one problem you solve into a genuinely useful fix carousel — desk posture, training around a bad knee, a habit that survives a busy week. When your free advice reduces someone's pain, they believe your coaching will change things.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide fix titled \"The Desk Posture Fix That Isn't Stretching\" — why it hurts, why stretching fails, the actual fix, the 5-minute routine.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Creates warm, approachable slides from one reference so your feed doesn't read as intimidating gym aesthetics. That quietly tells a nervous beginner that training with you won't be the punishing experience they're dreading.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Warm, welcoming, non-intimidating slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a session moment into a teaching post, so your daily coaching becomes content without a separate writing block.",
      "Leading with the outcome rather than the exercise, which attracts buyers instead of free-content collectors.",
      "Handing over a real fix that reduces someone's pain, building trust fast.",
      "Leading with empathy rather than shame, which is what makes a previously-failed client finally reach out.",
      "Batching a week around your split shifts, so your feed stays consistent despite a fragmented schedule.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Posting with a split-shift day", before: "Nearly impossible", after: "A week batched in 50 min" },
      { metric: "How you compete", before: "Hourly rate and gym proximity", after: "Visible expertise" },
    ],
  },
  "nutritionists": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns the evidence you hold and the misconceptions you correct into daily angles. You're competing with supplement sellers who post constantly — sporadic presence means invisibility, so this is what lets nuance actually compete with hype.",
        time_saved: "Saves ~2 hours a week between clients",
        example_output:
          "\"You don't need to detox. Your liver has been doing it this whole time, for free, since you were born.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts warm, myth-busting captions that free the reader from a bad rule without shaming them for believing it. Your audience was misled, not stupid — condescension repels exactly the people you want to help.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"She'd cut out six food groups chasing an energy problem. It was iron. One blood test and eight weeks later she had her life back.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns nuanced science into a clear, usable carousel — what affects energy, how protein needs really work, why restriction backfires. Making genuine evidence accessible and actionable is rare, and it's what earns trust from people burned by miracle claims.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide explainer titled \"Why Restriction Backfires\" — the mechanism, the rebound, the evidence, and the sustainable alternative.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces calm, credible slides from one reference — visually distinct from dramatic transformation shots and supplement marketing. A professional look signals qualification in a space full of visual noise and false promises.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Calm, evidence-first slides — no before-and-afters — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning nutrition science into a simple, trustworthy carousel that makes your credentials finally count for something.",
      "Busting a myth warmly rather than condescendingly, so misled readers feel freed rather than judged.",
      "Championing food peace over food rules, which differentiates you from diet culture entirely.",
      "Batching a week so your evidence-based voice can actually compete with a constantly-posting influencer feed.",
      "Handing over a real, usable takeaway that helps someone feel better — which beats any miracle claim.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours (research included)", after: "15 minutes" },
      { metric: "Posting frequency vs influencers", before: "Weekly at best — invisible", after: "Daily presence, batched" },
      { metric: "Who the public trusts", before: "Supplement sellers", after: "A qualified, visible voice" },
    ],
  },
  "yoga-instructors": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your class insights into daily angles that welcome the intimidated rather than impress existing practitioners. Teaching across studios leaves fragmented energy — this is what makes consistent, genuinely useful posting possible.",
        time_saved: "Saves ~2 hours a week across a fragmented schedule",
        example_output:
          "\"You don't need to touch your toes to start yoga. That's like saying you need to be fit before you're allowed in the gym.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts welcoming, barrier-lowering captions rather than aspirational aesthetics. Most yoga content quietly tells stiff, stressed people it isn't for them — this is tuned the other way, toward the large, underserved audience who'd benefit most.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"He came to his first class convinced he'd be the worst person in the room. He was. Eight months later his back pain is gone and he still can't touch his toes.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your teaching into a practical carousel — modifying a pose for tight hips, a 5-minute practice for desk workers, breathing through stress. Real guidance that eases someone's pain is what makes them want to be in your class.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide practice titled \"5 Minutes For a Desk-Bound Back\" — what's actually tight, the modification, the sequence, the frequency.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Creates calm, inclusive slides from one reference. Yoga's visual culture is aspirational to the point of exclusion — a welcoming look tells a nervous beginner they'd be comfortable in your class.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Calm, warm, inclusive slides — no advanced-pose photography — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a class insight into a teaching carousel that helps a struggling beginner rather than impressing practitioners.",
      "Lowering the barrier in a hook, reaching the huge audience who believes yoga isn't for them.",
      "Sharing the philosophy beneath the postures, which attracts students seeking depth rather than a workout.",
      "Batching a week so your presence holds across a fragmented multi-studio teaching schedule.",
      "Making your feed feel genuinely inclusive, which is exactly what the stiff, nervous person needs to see.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Consistency across studio schedule", before: "Sporadic at best", after: "Weekly, batched in 50 min" },
      { metric: "Who your feed reaches", before: "Other practitioners", after: "The beginners who need you" },
    ],
  },
  "meditation-coaches": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your teaching into daily angles that meet stressed skeptics where they are, rather than preaching to the converted. Meditation content is easily dismissed as woo, so this keeps you on the practical, credible side that reaches overwhelmed professionals.",
        time_saved: "Saves ~2 hours a week between sessions",
        example_output:
          "\"You don't need to empty your mind. That's not what meditation is, and believing it is the reason you quit after three days.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts grounded, jargon-free captions that reframe meditation as a practical skill rather than a spiritual demand. Overwhelmed people are skeptical of anything that sounds mystical — this speaks to the outcome they want, which is a quieter mind.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"He thought he was bad at meditation because his mind wandered. Noticing the wandering is the practice. He'd been succeeding and calling it failure.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your method into a carousel that delivers a real, usable practice — a 2-minute reset, a technique for racing thoughts, meditation for people who can't sit still. When a free practice actually calms someone, they trust your deeper guidance.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide practice titled \"For a Mind That Won't Slow Down\" — why it races, the reframe, the 2-minute technique, when to use it.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces calm, uncluttered slides from one reference — embodying the stillness you teach. A serene, credible look reassures a skeptical professional that this is grounded rather than mystical.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Calm, minimal, grounded slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a teaching into a practical carousel that reaches stressed skeptics rather than existing practitioners.",
      "Reframing meditation as a skill rather than a spiritual demand, which speaks to overwhelmed professionals.",
      "Handing over a real practice that genuinely calms someone, building trust fast.",
      "Grounding your content rather than leaning mystical, which sets you apart from the woo.",
      "Batching a week so your calm presence is steady for the slow decision to try meditation.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Credibility with skeptics", before: "Dismissed as woo", after: "Grounded, practical, weekly" },
      { metric: "Weekly hours on content", before: "3+ hours", after: "50 minutes, batched" },
    ],
  },
  "mental-health-coaches": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your understanding into daily angles that put words to what people feel but can't name, within your clear coaching scope. Mental health carries stigma and precision matters, so this keeps content both resonant and responsibly framed.",
        time_saved: "Saves ~2 hours a week between sessions",
        example_output:
          "\"High-functioning anxiety doesn't look like anxiety. It looks like being early, over-prepared, and quietly exhausted by 3pm every single day.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts compassionate, de-stigmatising captions that normalise the struggle without overpromising. Your reader is often quietly suffering and wary of being judged — this tone makes them feel seen and safe, which precedes any decision to reach out.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"She thought she was lazy. She was depleted — running on a nervous system that had been in overdrive for two years. Those look identical from the inside.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns a real tool into a carousel someone can use today — grounding a spiral, a boundary script, recognising burnout early. A genuinely helpful tool proves substance and, when it eases someone's day, builds the trust that leads to working with you.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide tool titled \"When Your Thoughts Start Spiralling\" — the early sign, why willpower fails, the grounding technique, the practice.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces warm, safe-feeling slides from one reference. You're inviting people to consider something vulnerable, so a gentle, non-clinical look is itself a reason a struggling person feels safe engaging.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Warm, gentle, safe-feeling slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning your understanding into a post that names what someone feels but couldn't articulate.",
      "Publishing compassionate, de-stigmatising content that makes a quietly-suffering reader feel safe.",
      "Handing over a real coping tool that eases someone's day and proves your substance.",
      "Staying clearly within your coaching scope, which keeps content both helpful and responsible.",
      "Batching a week so your steady, safe presence holds through the slow decision to seek support.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Content beyond generic wellness", before: "Rare — hard to write well", after: "Real tools weekly, batched" },
      { metric: "Weekly hours on content", before: "3+ hours after sessions", after: "50 minutes, batched" },
    ],
  },
  "therapists": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns psychoeducation into daily angles within clear ethical bounds — never about specific clients, always general and non-diagnostic. Ethics and privacy are what make therapists hesitate to post; this keeps content responsibly framed so you can educate safely.",
        time_saved: "Saves ~2 hours a week between clients",
        example_output:
          "\"'Why do I keep dating the same person?' isn't a mystery. Familiar and safe feel identical to a nervous system, even when familiar was never safe.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts warm, psychoeducational captions that normalise experiences without diagnosing or promising outcomes. Your audience is often people considering therapy for the first time — this tone reduces the fear and stigma that keep them from reaching out.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"Feeling nothing isn't the absence of emotion. Sometimes it's a nervous system that decided, a long time ago, that feeling wasn't safe.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns a concept into an accessible carousel — how anxiety works, what a boundary actually is, why we repeat patterns. Making psychology understandable builds trust and quietly reduces the barrier to seeking help, which serves both your practice and the public.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide explainer titled \"What a Boundary Actually Is\" — the misconception, what it isn't, the real definition, an example, the practice.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces calm, professional, safe-feeling slides from one reference. A warm but credible look reassures someone nervous about therapy that you're a safe, trustworthy professional.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Calm, warm, professional slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a concept into accessible psychoeducation — never about a client, always general and non-diagnostic.",
      "Normalising a difficult experience, which reduces stigma for people considering therapy for the first time.",
      "Making psychology understandable, which builds trust and lowers the barrier to seeking help.",
      "Staying firmly within ethical bounds, so you can educate publicly with confidence.",
      "Batching a week so a full caseload doesn't mean your practice's visibility disappears.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Confidence posting ethically", before: "Hesitant — unsure of the line", after: "Clear, general, responsible" },
      { metric: "Weekly hours on content", before: "3+ hours after clients", after: "50 minutes, batched" },
    ],
  },
  "psychologists": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your expertise into daily angles that bring real psychology to a public drowning in pop-psych myths. Your training is exactly what the noisy wellness conversation lacks — this makes contributing possible without it costing clinical or research time.",
        time_saved: "Saves ~2 hours a week",
        example_output:
          "\"'Trauma' has been stretched to mean any bad experience. Here's what the research actually says — and why the distinction matters for how you heal.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts hooks that correct a pop-psychology myth with real evidence, which is both authoritative and highly shareable. Because so much psychology content online is oversimplified or wrong, precise correction from a credentialed voice stands out.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"The left-brain / right-brain personality thing isn't a simplification. It's just false — and here's what the actual research on cognitive style found.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns a concept into a rigorous, accessible carousel that doesn't dumb it down — how memory really works, what motivation research shows, why a common belief is wrong. Bridging real science and the public builds authority most academics never reach.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide explainer — the popular myth, the actual finding, the nuance, the caveat, and what it means in practice.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, credible, non-sensational slides from one reference. Your look should signal rigor rather than clickbait, distinguishing you from the pop-psychology accounts you're correcting.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clean, rigorous, credible slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning your expertise into a rigorous, accessible carousel that brings real psychology to the public.",
      "Correcting a pop-psychology myth with evidence, which is authoritative and highly shareable.",
      "Being honest about nuance and uncertainty, which builds trust and models good science.",
      "Bridging real research and the public, which builds authority most academics never reach.",
      "Batching a week so contributing to the conversation doesn't cost clinical or research time.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "3 hours", after: "20 minutes" },
      { metric: "Reach of your expertise", before: "Journals and the clinic", after: "Thousands, weekly" },
      { metric: "Who shapes public psychology", before: "Pop-psych accounts", after: "A credentialed voice too" },
    ],
  },
  "online-course-creators": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your course's teaching into daily angles that both help people and warm them toward buying. Content is how course creators fill launches, but making it consistently between teaching and support is the perennial bottleneck — this removes it.",
        time_saved: "Saves ~2.5 hours a week",
        example_output:
          "\"The reason you've bought 6 courses and finished none isn't discipline. It's that they were built to be bought, not completed.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts captions that give away a genuine piece of your expertise, which is the counterintuitive engine of course sales. When your free content actually teaches something, people trust the paid version will transform them.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"Here's the entire framework from module 1 of my course, free. If it helps, the other 6 modules go deeper — but you can get real results from just this.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns one lesson into a value-first carousel that demonstrates your teaching quality. A prospect who learns something real from your free carousel has effectively sampled your course — the most persuasive sales tool you have.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide lesson pulled straight from your curriculum — the problem, the framework, the steps, an example, and a real takeaway.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces polished, on-brand slides from one reference so your free content looks as professional as your course. Consistent, quality visuals build the credibility that justifies your price point.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Polished, course-quality slides in your brand palette — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a lesson from your course into a value-first carousel that lets prospects sample your teaching.",
      "Giving away genuine expertise, which is the counterintuitive engine of course sales.",
      "Keeping content consistent between teaching and support, ending the launch-then-silence cycle.",
      "Building an audience between launches, so your next launch doesn't start from a cold list.",
      "Making free content look as polished as the course, which justifies the price.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Audience between launches", before: "Goes cold", after: "Stays warm — batched weekly" },
      { metric: "Weekly hours on content", before: "4+ hours", after: "60 minutes, batched" },
    ],
  },
  "edtech-founders": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your views on learning and the reality of building in education into daily angles. EdTech founders sell to skeptical educators and institutions, so content that shows you understand real learning — not just software — is what builds credibility.",
        time_saved: "Saves ~2.5 hours a week",
        example_output:
          "\"Most edtech fails for the same reason: it optimises for engagement metrics that have nothing to do with whether anyone actually learned.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts captions that lead with a genuine insight about learning rather than a product pitch. Educators detect sales instantly, so speaking to the pedagogy — the thing they care about — is what earns their trust and eventually their adoption.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"We built a feature teachers begged for. Nobody used it. The problem it solved wasn't the problem they actually had at 8am on a Monday.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns a learning insight or a build lesson into a carousel that resonates with educators, institutions, and investors. Demonstrating deep understanding of how people learn is what differentiates a credible edtech founder from another app.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide breakdown titled \"Why Engagement Is The Wrong Metric\" — the trap, what it hides, the metric that matters, how we measure it now.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, credible slides from one reference. Your feed reaches educators and investors who value substance — a considered look reinforces that you take learning seriously.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clean, credible, learning-focused slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a learning insight into a carousel that resonates with skeptical educators and institutions.",
      "Leading with pedagogy rather than product, which is what earns educators' trust.",
      "Sharing the honest reality of building in education, which attracts mission-driven talent and patient investors.",
      "Batching a week so credibility-building survives a demanding build cycle.",
      "Demonstrating that you understand real learning, which differentiates you from another app.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Credibility with educators", before: "Just another app", after: "A founder who gets learning" },
      { metric: "Weekly hours on content", before: "0 — building eats it", after: "60 minutes, batched" },
    ],
  },
  "corporate-trainers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your training insights into daily angles that reach the L&D leaders and executives who book you. Your income depends on being known, and a visible authority is what turns you from a vendor competing on price into a sought-after name.",
        time_saved: "Saves ~2 hours a week between engagements",
        example_output:
          "\"Your leadership training didn't fail. It worked in the room and died in the hallway, because nothing about the actual job changed.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts hooks that reframe a common training or workplace problem, signalling genuine expertise. L&D buyers are wary of generic trainers, so a sharper diagnosis of why training doesn't stick is what marks you as worth hiring.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"90% of training is forgotten within a week. Not because it was bad — because you delivered it as an event instead of building it into the work.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your methodology into a carousel that shows how you make training actually stick — reinforcement, manager involvement, behavior change over information transfer. This proves substance to buyers tired of one-off workshops that change nothing.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide method titled \"Why Training Doesn't Stick (And The Fix)\" — the event trap, the forgetting curve, the reinforcement system, the outcome.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces polished, professional slides from one reference. Your feed is a sample of your delivery quality — a sharp look signals the professionalism a corporate buyer expects.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Polished, professional, corporate-credible slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a training insight into a carousel that reaches the L&D leaders who book engagements.",
      "Reframing why training doesn't stick, which signals expertise to buyers tired of one-off workshops.",
      "Sharing your methodology, which proves substance and attracts organisations wanting real change.",
      "Batching a week so your authority stays visible between engagements.",
      "Building a reputation that turns you from a price-competed vendor into a sought-after name.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "How you compete", before: "Price and RFPs", after: "Visible authority and inbound" },
      { metric: "Weekly hours on content", before: "0 — engagements eat it", after: "50 minutes, batched" },
    ],
  },
  "professors": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your research and field expertise into daily angles that reach far beyond the handful who read your papers. Public scholarship is increasingly valued but time is scarce — this makes contributing possible without stealing from research or teaching.",
        time_saved: "Saves ~2 hours a week",
        example_output:
          "\"Everyone's citing this study to argue the opposite of what it found. Here's what the paper actually says — I've read it more times than the authors probably wanted.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts hooks that make your expertise accessible and intriguing without dumbing it down. Academic writing is dense by training — this translates your rigor into something a curious non-specialist actually reads and shares.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"I've spent 15 years studying this. The thing everyone gets wrong isn't complicated — it's that the intuitive answer is exactly backwards.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your knowledge into an accessible explainer that preserves nuance — a concept from your field, a misunderstood finding, why a debate matters. Public-facing scholarship builds a profile that helps with grants, students, and impact.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide explainer — the popular misunderstanding, the actual scholarship, the nuance, and why it matters beyond academia.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, credible, non-sensational slides from one reference. Your look should signal scholarly rigor while still being engaging, distinct from clickbait explainer accounts.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clean, scholarly, engaging slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning your research into an accessible carousel that reaches far beyond your paper's readers.",
      "Correcting a widely-misused study with authority, which is both a public service and highly shareable.",
      "Making a genuinely hard idea legible without dumbing it down, which builds a public profile.",
      "Batching a week so public scholarship doesn't steal from research or teaching.",
      "Building a reputation that helps with grants, attracting students, and demonstrating impact.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "3 hours", after: "20 minutes" },
      { metric: "Reach of your expertise", before: "The dozen who read the paper", after: "Thousands, weekly" },
      { metric: "Public profile", before: "None beyond academia", after: "A recognised expert voice" },
    ],
  },
  "tutors": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns the concepts you explain and the mistakes you see repeatedly into daily angles for your subject. Parents and students search for someone who clearly gets their specific struggle — this is what makes you findable and fills your schedule beyond word of mouth.",
        time_saved: "Saves ~2 hours a week between students",
        example_output:
          "\"The reason your child freezes on word problems isn't the maths. It's that nobody taught them to translate English into equations first.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts reassuring, jargon-free captions that speak to an anxious parent or a discouraged student. Learning struggles carry stress and shame, so a calm, encouraging tone is exactly what makes a parent decide you're the tutor they trust.",
        time_saved: "Saves ~25 minutes per post",
        example_output:
          "\"He wasn't bad at maths. He'd missed one foundational week two years earlier and had been building on a gap ever since. We went back, and it clicked in a fortnight.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your teaching into a genuinely useful carousel — a way to explain a hard concept, a study technique, how to reduce exam anxiety. When your free explanation makes something click, a parent immediately wants you tutoring their child.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide explainer titled \"How To Actually Understand Fractions\" — why the rule confuses, the visual model, the practice, the check.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clear, friendly slides from one reference. A warm, professional look reassures parents that you're credible and approachable — the exact combination they're looking for.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clear, friendly, approachable slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a concept you explain often into a carousel that shows parents you can make it click.",
      "Reassuring an anxious parent or discouraged student, which is what earns the booking.",
      "Handing over a real study technique or explanation, so a parent immediately wants you for their child.",
      "Batching a week so your visibility grows beyond word of mouth and fills your schedule.",
      "Owning a subject and level, so people searching for exactly your help can find you.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "How students find you", before: "Word of mouth only", after: "Word of mouth + inbound" },
      { metric: "Weekly hours on content", before: "2+ hours between students", after: "50 minutes, batched" },
    ],
  },
  "video-editors": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your editing decisions and craft insights into daily angles. Editing is invisible, deadline-driven work, so your skill stays hidden until a client has already hired you — this is what finally makes it visible and attracts better projects.",
        time_saved: "Saves ~2 hours a week between deadlines",
        example_output:
          "\"The edit that makes a video feel expensive isn't the colour grade. It's the three frames you cut from every transition that nobody consciously notices.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts hooks that reveal the craft behind good editing, which fascinates both clients and fellow editors. Because editing is a hidden art, showing the invisible decisions signals mastery and stops the scroll of anyone who makes video.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"This video kept you watching for 8 minutes. Here are the 4 editing tricks doing the work — none of which you noticed while they were happening.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your technique into a carousel that teaches while proving your eye — pacing, retention editing, sound design, colour. A well-crafted carousel about editing demonstrates the exact taste and skill clients are hiring for.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide teardown titled \"Editing For Retention\" — the drop-off points, the pattern interrupt, the pacing rule, the result.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces polished, visually sharp slides from one reference. As a visual professional your feed is judged on craft — this makes it a portfolio piece rather than an afterthought.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Polished, visually sharp slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning an editing decision into a craft carousel that makes your invisible skill visible.",
      "Revealing the hidden tricks behind good editing, which fascinates clients and fellow editors.",
      "Teaching a technique that proves your eye, so a client sees the expert they'd rather hire.",
      "Batching a week so your marketing survives deadline-driven crunch weeks.",
      "Making your feed a portfolio piece, since a visual professional is judged on craft.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "How clients judge you", before: "A reel link and a rate", after: "Visible craft and taste" },
      { metric: "Marketing during deadlines", before: "Stops entirely", after: "Batched ahead, keeps running" },
    ],
  },
  "photographers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your shoots and craft decisions into daily angles that book clients rather than just impress photographers. Your work is on Instagram but the buyers — businesses, couples, brands — are also on LinkedIn, and this helps you reach them with the story behind the image.",
        time_saved: "Saves ~2 hours a week between shoots",
        example_output:
          "\"The reason your headshots look stiff isn't the photographer. It's the 90 seconds before the shutter that nobody spends anymore.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts captions that tell the story and thinking behind an image rather than just posting it. Clients don't hire a photo, they hire judgment and experience — showing the decisions is what makes them choose you over a cheaper shooter.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"They booked me for a product shoot and I spent the first hour rearranging their studio. The lighting was never the problem — the surface was.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your expertise into a carousel that teaches while showing your eye — how to prep for a shoot, what makes an image work, why lighting matters. It demonstrates the taste and professionalism that justify your rate.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide breakdown titled \"What Makes a Headshot Actually Work\" — the setup, the direction, the light, the moment, the edit.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces beautifully designed slides from one reference that frame your images without competing. As a visual professional your feed is judged mercilessly on presentation — this keeps it flawless.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Beautifully designed slides that showcase your work — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a shoot into a story carousel that books clients rather than just impressing other photographers.",
      "Telling the thinking behind an image, since clients hire judgment and experience, not just a photo.",
      "Teaching your craft, which demonstrates the taste that justifies your rate.",
      "Reaching business and brand buyers on LinkedIn, not just the Instagram photography crowd.",
      "Batching a week so your marketing survives shoot-and-edit crunch weeks.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Where you reach buyers", before: "Instagram only", after: "LinkedIn business buyers too" },
      { metric: "How clients choose you", before: "Portfolio and price", after: "Visible judgment and taste" },
    ],
  },
  "videographers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your production insights into daily angles that reach the businesses and brands who book video. High-value video clients live on LinkedIn, and this helps you reach them with the strategy behind the footage rather than just a showreel.",
        time_saved: "Saves ~2 hours a week between productions",
        example_output:
          "\"Your brand video got 200 views and zero leads. The production was gorgeous. The first 3 seconds asked the viewer to care before giving them a reason.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts captions that show the strategic thinking behind a shoot, not just the pretty result. Businesses buying video want ROI, so demonstrating that you think about outcomes — not just aesthetics — is what wins the premium work.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"They wanted a cinematic brand film. What they needed was a 30-second answer to 'why should I care', shot on a phone. We made the second one first.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your process into a carousel that teaches while proving your craft — pre-production, story structure, why video fails to convert. It positions you as a strategic partner rather than a pair of hands with a camera.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide breakdown titled \"Why Your Brand Video Didn't Convert\" — the hook problem, the story gap, the CTA, the fix, the result.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces polished, cinematic-feeling slides from one reference. Your feed's visual quality is a direct sample of your production value — this keeps it sharp.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Polished, cinematic-feeling slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a production insight into a carousel that reaches the businesses who book video.",
      "Showing the strategy behind a shoot, which wins premium clients focused on ROI.",
      "Teaching your process, which positions you as a strategic partner rather than a camera operator.",
      "Reaching high-value brand and business buyers on LinkedIn.",
      "Batching a week so your marketing survives production and edit crunch.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "How clients see you", before: "A camera operator", after: "A strategic partner" },
      { metric: "Marketing during productions", before: "Stops for weeks", after: "Batched ahead, keeps running" },
    ],
  },
  "podcast-producers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your production expertise into daily angles that reach the podcasters and brands who hire producers. Production is invisible work, so your skill stays hidden — this makes it visible and attracts better shows to work on.",
        time_saved: "Saves ~2 hours a week between episodes",
        example_output:
          "\"Your podcast's retention drops at minute 3 every episode. It's not the content — it's that you edited out the tension that made people lean in.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts hooks that reveal the craft behind a great show, which fascinates podcasters and signals your expertise. Because good production is invisible, showing the decisions is what proves you're worth hiring.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"This interview felt effortless. It took 40 minutes of raw tape, 90 minutes of editing, and cutting the host's three favourite tangents.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your knowledge into a teaching carousel — structuring an episode, editing for retention, sound that sounds expensive. It demonstrates the craft that separates a producer from someone who just records audio.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide breakdown titled \"Editing a Podcast For Retention\" — the drop-off points, the cold open, the pacing, the sound design, the result.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces polished, professional slides from one reference. A sharp look signals the production quality you bring, in a medium that's fundamentally about craft.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Polished, professional slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning production expertise into a carousel that reaches podcasters and brands who hire producers.",
      "Revealing the craft behind a great show, which proves your invisible skill.",
      "Teaching your process, which separates you from someone who just records audio.",
      "Batching a week so your marketing survives episode production cycles.",
      "Making your feed a demonstration of the production quality you deliver.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Visibility of your craft", before: "Invisible in the final cut", after: "Published weekly" },
      { metric: "Marketing during production", before: "Stops entirely", after: "Batched ahead" },
    ],
  },
  "podcasters": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns every episode into a week of angles, so your show finally gets the promotion it deserves. Podcasters pour hours into recording and almost none into distribution — this closes the gap that keeps great shows undiscovered.",
        time_saved: "Saves ~3 hours a week on promotion",
        example_output:
          "\"My guest said something in episode 40 that I haven't stopped thinking about. Here's the 90 seconds worth stealing an hour of your commute for.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns an episode's best moment into a hook that makes people want to listen. The hardest part of podcasting isn't recording — it's convincing someone to press play, and this writes the promotion that actually does it.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"I asked a billionaire what he'd tell his 25-year-old self. His answer wasn't about money, and it made me uncomfortable. Episode 52.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns one episode into a carousel of its best insights — value people get without listening, which paradoxically drives listens. A great takeaways carousel is both a standalone gift and a trailer for the full show.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide takeaways carousel from your latest episode — the 5 best insights, each as a slide, ending with a listen CTA.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces on-brand slides from one reference so your promo content is recognisably your show. Consistent visuals build the brand recognition that turns a listener into a subscriber.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "On-brand, recognisable show slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning every episode into a week of promotional angles, closing the record-but-don't-promote gap.",
      "Writing hooks from an episode's best moment that actually make people press play.",
      "Building a takeaways carousel that delivers value and doubles as a trailer.",
      "Keeping promotion consistent, so your show gets discovered instead of staying a hidden gem.",
      "Making promo content recognisably your brand, which turns listeners into subscribers.",
    ],
    results: [
      { metric: "Time to promote one episode", before: "3 hours (so you didn't)", after: "20 minutes for a week of posts" },
      { metric: "Promotion per episode", before: "One 'new episode' post", after: "A week of angles, batched" },
      { metric: "How much your show grows", before: "Word of mouth only", after: "Consistent discovery" },
    ],
  },
  "authors": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your book's ideas into daily angles that build the audience publishers now expect authors to bring. Writing the book was the easy part; building a platform is the modern author's real job, and this makes it sustainable alongside the writing.",
        time_saved: "Saves ~2.5 hours a week",
        example_output:
          "\"I spent two years writing a chapter arguing the opposite of what I now believe. Here's what changed my mind — it's not in the book.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns a concept from your book into a standalone post that gives value and builds anticipation. Sharing ideas doesn't cannibalise sales — it proves the book is worth reading and builds the audience that buys it on launch day.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"The most controversial idea in my book fits in one sentence: the advice everyone gives about this is not just wrong, it's backwards. Here's why.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns a chapter's core idea into a value-first carousel that showcases your thinking. A great ideas carousel is both a gift to readers and the most persuasive advertisement for the full book.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide distillation of one chapter — the big idea, the evidence, the objection, the reframe, and where the book goes deeper.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces polished, on-brand slides from one reference that carry your book's identity. Consistent visuals build the recognisable author platform that publishers and readers respond to.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Polished, on-brand author slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning your book's ideas into a week of angles that build the platform publishers now expect.",
      "Sharing a concept that gives value and builds anticipation rather than cannibalising sales.",
      "Building a takeaways carousel that showcases your thinking and advertises the book.",
      "Building an audience before launch, so the book doesn't debut to silence.",
      "Keeping a consistent author brand that publishers and readers recognise.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Author platform building", before: "Sporadic — writing came first", after: "Weekly, batched" },
      { metric: "Audience at launch", before: "Starts from scratch", after: "Warm, waiting readers" },
    ],
  },
  "speakers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your signature ideas into daily angles that get you booked. Event organisers search for speakers with a visible platform and a clear message, so consistent content is what turns you from an unknown into a name on the shortlist.",
        time_saved: "Saves ~2 hours a week between engagements",
        example_output:
          "\"The line that always lands hardest in my keynote isn't the inspiring one. It's the uncomfortable truth I almost cut from the talk.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns a piece of your talk into a post that demonstrates your message and stage presence in text. Organisers and audiences need to sample your thinking before they book or attend — this makes every post an audition.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"I open every keynote by telling the audience the thing they're hoping I won't say. The room goes quiet, and then it's ours.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns a core idea from your talk into a carousel that showcases your signature message. It builds the recognisable platform that makes an organiser confident you'll deliver — and gives attendees a reason to come.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide distillation of your signature talk — the hook, the reframe, the story, the takeaway, and a booking CTA.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces polished, on-brand slides from one reference that carry your speaker identity. A recognisable, professional platform reassures organisers you're the real thing.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Polished, on-brand speaker slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning your signature ideas into a week of angles that get you booked.",
      "Demonstrating your message and presence in text, so every post is an audition for organisers.",
      "Building a takeaways carousel that showcases your talk and gives attendees a reason to come.",
      "Building the visible platform organisers look for when shortlisting speakers.",
      "Batching a week so your presence stays consistent between engagements.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "How organisers find you", before: "Speaker bureaus and referrals", after: "A visible, findable platform" },
      { metric: "Weekly hours on content", before: "0 — travel eats it", after: "50 minutes, batched" },
    ],
  },
  "newsletter-writers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns each issue into a week of angles that grow your list, because a newsletter with no discovery engine plateaus. Your best growth channel is social content that gives a taste and drives subscribes — this makes producing it sustainable.",
        time_saved: "Saves ~2.5 hours a week on growth",
        example_output:
          "\"This week's issue argues something I'll probably get angry replies about. Here's the core of it — the full case is in your inbox if you subscribe.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns an issue's best idea into a hook that makes people subscribe. The hardest part of newsletters is discovery, so writing the social teaser that converts a scroller into a subscriber is the highest-leverage thing you can do.",
        time_saved: "Saves ~25 minutes per post",
        example_output:
          "\"I analysed 100 newsletters that hit 10k subscribers. They had one structural thing in common, and it wasn't quality. Full breakdown in Thursday's issue.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns one issue into a carousel of its best insights — a standalone gift that doubles as a subscribe funnel. A great takeaways carousel proves your writing is worth inbox space.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide distillation of your latest issue — the 5 key insights, each a slide, ending with a subscribe CTA.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces on-brand slides from one reference so your growth content is recognisably your newsletter. Consistent visuals build the brand that turns a one-time reader into a loyal subscriber.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "On-brand, recognisable newsletter slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning each issue into a week of angles that feed your list's growth engine.",
      "Writing the social teaser that converts a scroller into a subscriber.",
      "Building a takeaways carousel that gives value and doubles as a subscribe funnel.",
      "Keeping growth content consistent, so your list compounds instead of plateauing.",
      "Making growth content recognisably your brand, which builds subscriber loyalty.",
    ],
    results: [
      { metric: "Time to produce a week of growth content", before: "3 hours", after: "20 minutes" },
      { metric: "Discovery engine", before: "Word of mouth only", after: "Consistent social funnel" },
      { metric: "List growth", before: "Plateaued", after: "Compounding — batched weekly" },
    ],
  },
  "journalists": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your reporting and beat expertise into daily angles that build the personal brand modern journalism demands. Bylines increasingly follow the writer, not the outlet, so a direct audience is career insurance — and this makes building one sustainable alongside deadlines.",
        time_saved: "Saves ~2 hours a week around deadlines",
        example_output:
          "\"I've covered this beat for six years. The story everyone's chasing this week is a distraction — here's the one they're all missing.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns a story or your reporting insight into a post that showcases your voice and expertise. Building a direct relationship with readers means your audience follows you between outlets — this is how you write that relationship into being.",
        time_saved: "Saves ~25 minutes per post",
        example_output:
          "\"Everyone reported the number. Nobody asked why it was collected the way it was — which is the actual story, and why I spent three weeks on it.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns a complex story into an accessible carousel that reaches people who'd never click the article. It extends your reporting's reach and builds you as a trusted, followable voice on your beat.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide breakdown of a complex story — what happened, why it matters, what's being missed, and the link to the full piece.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, credible slides from one reference. A professional, non-sensational look signals journalistic rigor and distinguishes you from hot-take accounts.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clean, credible, non-sensational slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning your beat expertise into a carousel that builds a personal brand independent of any outlet.",
      "Showcasing your voice and reporting, so your audience follows you between jobs.",
      "Making a complex story accessible, extending its reach beyond the people who'd click the article.",
      "Building direct audience relationships, which is career insurance in a volatile industry.",
      "Batching a week so brand-building survives deadline pressure.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Audience ownership", before: "Belongs to the outlet", after: "Follows you directly" },
      { metric: "Brand-building around deadlines", before: "Never happens", after: "Weekly, batched" },
    ],
  },
  "animators": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your craft and process into daily angles that reach clients rather than only other animators. Animation is time-intensive and invisible until finished, so your skill stays hidden — this makes it visible to the brands and studios who hire.",
        time_saved: "Saves ~2 hours a week between projects",
        example_output:
          "\"The reason cheap animation looks cheap isn't the software. It's the easing — the 4 frames of acceleration that separate 'moved' from 'alive'.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts hooks that reveal the craft behind good animation, which fascinates clients and peers. Because the skill is invisible in a polished final product, showing the decisions is what signals mastery and stops the scroll.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"This 3-second logo animation took a day. Here's what the extra hours bought that a template never will — and why the client couldn't name it but felt it.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your technique into a carousel that teaches while proving your eye — timing, easing, storytelling in motion. A well-crafted carousel about animation demonstrates the exact skill and taste clients hire for.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide breakdown titled \"Why Cheap Animation Looks Cheap\" — the easing, the timing, the anticipation, the follow-through, the difference.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces beautifully designed slides from one reference. As a visual professional your feed is judged on craft — this makes it a portfolio piece that matches your standards.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Beautifully designed, visually sharp slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning your craft into a carousel that reaches clients rather than only other animators.",
      "Revealing the invisible decisions behind good animation, which signals mastery.",
      "Teaching a technique that proves your eye, so clients see the expert they'd rather hire.",
      "Batching a week so marketing survives time-intensive project cycles.",
      "Making your feed a portfolio piece worthy of a visual professional.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Who your feed reaches", before: "Other animators", after: "Brands and studios who hire" },
      { metric: "Marketing during projects", before: "Stops entirely", after: "Batched ahead, keeps running" },
    ],
  },
  "real-estate-investors": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your deals and market analysis into daily angles that attract private capital and off-market opportunities. Investors who build a visible track record get shown deals and raise money more easily — this is what makes that reputation compound.",
        time_saved: "Saves ~2 hours a week between deals",
        example_output:
          "\"The deal everyone passed on made me the most money last year. Here's the number they all missed because it wasn't on the listing.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns a deal or a lesson into a post that builds credibility with capital partners and sellers. Investing is relationship- and trust-driven, so demonstrating your analysis and judgment is what makes people want to fund you or bring you deals.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"I lost $30k on my third deal. Not on the purchase — on assuming the rehab quote was the rehab cost. Here's the buffer I've used ever since.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your process into a carousel that teaches while proving your expertise — how you underwrite, how you find off-market deals, how you structure financing. It builds the authority that attracts both private lenders and motivated sellers.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide breakdown titled \"How I Underwrite a Deal in 10 Minutes\" — the numbers I check first, the deal-killers, the buffer, the go/no-go.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, credible slides from one reference. Your feed reaches capital partners who read polish as competence — a professional look supports the trust that raising money requires.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clean, credible, numbers-friendly slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a deal into a carousel that builds the track record which attracts private capital.",
      "Sharing an underwriting lesson, which demonstrates the judgment that makes people fund you.",
      "Teaching your process, which builds authority with lenders and motivated sellers.",
      "Batching a week so your reputation compounds between deals.",
      "Being visibly credible, since investing is fundamentally relationship- and trust-driven.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "How deals and capital find you", before: "Cold outreach and networking", after: "Inbound from a track record" },
      { metric: "Weekly hours on content", before: "0 — deals eat everything", after: "50 minutes, batched" },
    ],
  },
  "real-estate-coaches": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your coaching insights into daily angles aimed at the agents and investors you train. You compete against a crowded field of real-estate gurus, so content demonstrating real substance is what separates you from the hype.",
        time_saved: "Saves ~2 hours a week between sessions",
        example_output:
          "\"Your agents aren't lazy. Your training taught them scripts and left out the one thing that actually converts: what to do when the script fails.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns a client agent's breakthrough into a proof-driven caption. The real-estate coaching space is full of unverified income claims, so leading with a specific, credible transformation is what earns trust from skeptical agents.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"She'd been an agent for four years doing 12 deals a year. We changed how she followed up, not how she prospected. This year she'll close 40.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your method into a framework carousel agents can see and trust. Giving away your system proves it's worth paying for and attracts the agents who realise they need guided implementation, not another motivational webinar.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide framework titled \"The Follow-Up System That Doubles Conversions\" — the leak, the cadence, the scripts, the CRM setup, the result.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces polished, credible slides from one reference — substantive rather than gimmicky. In a space full of flashy income screenshots, a considered look signals real methodology.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Polished, credible, non-gimmicky slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a client agent's breakthrough into a proof carousel that separates you from the guru hype.",
      "Publishing your method as a framework, which turns you into a recognised authority.",
      "Sharing substance rather than income screenshots, which earns trust from skeptical agents.",
      "Batching a week so you stay visible for the moment an agent decides to invest in coaching.",
      "Positioning yourself credibly in a space crowded with real-estate gurus.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "How you stand out", before: "Lost among gurus", after: "Visible substance and proof" },
      { metric: "Weekly hours on content", before: "3+ hours", after: "50 minutes, batched" },
    ],
  },
  "mortgage-brokers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns the questions borrowers ask you daily into angles that build trust before they need a mortgage. The mortgage is a rare, high-anxiety decision, so being the broker who has patiently educated someone for months is what wins the application.",
        time_saved: "Saves ~2 hours a week between clients",
        example_output:
          "\"The rate isn't the most expensive part of your mortgage. The thing nobody explains is how much the term length quietly costs you over 30 years.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts calm, jargon-free captions that reduce the anxiety around a huge financial decision. Borrowers are stressed and confused, so a broker who makes it understandable — not who pushes a product — is the one they trust with the application.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"First-time buyers: the cost that blindsides everyone at closing isn't in your rate quote. Here's the number to have ready so it doesn't derail your day.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns one confusing topic into a clear explainer — how rates really work, what affects approval, the true cost of points. Educational content free of pressure builds the trust that makes you the obvious call when they're ready.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide explainer titled \"What Actually Affects Your Approval\" — the myths, the real factors, what to fix first, the timeline.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, trustworthy slides from one reference. For a high-stakes financial decision, a calm and credible look is itself a reason an anxious borrower feels safe reaching out.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clean, calm, trustworthy slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a borrower's common question into an educational post that builds trust before they need you.",
      "Reducing mortgage anxiety with calm, clear content, which is what earns the application.",
      "Explaining a confusing topic without pressure, so you're the obvious call when they're ready.",
      "Batching a week so you stay present through the long window before someone buys.",
      "Being the credible educator rather than the pushy salesperson.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "How borrowers choose you", before: "Rate comparison sites", after: "Trust built over months" },
      { metric: "Weekly hours on content", before: "0 — client work eats it", after: "50 minutes, batched" },
    ],
  },
  "property-managers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns the daily realities of managing properties into angles that win landlords and owners as clients. Owners choose managers they trust to protect their asset, so content demonstrating competence and care is what fills your portfolio.",
        time_saved: "Saves ~2 hours a week between property issues",
        example_output:
          "\"The vacancy that cost an owner $8k wasn't bad luck. It was a maintenance request ignored for three weeks that turned a good tenant into a former one.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts captions that show your expertise in protecting an owner's investment and keeping tenants happy. Owners want reassurance their asset is in careful hands — demonstrating that judgment is what earns the management contract.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"A landlord asked why I spend money on small repairs fast. Because a $200 fix ignored becomes a $3,000 fix and a lost tenant. Speed is the cheapest thing I do.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your knowledge into a carousel that teaches owners — tenant screening, maintenance systems, minimising vacancy. It positions you as the professional who protects returns, which is exactly what an owner is buying.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide guide titled \"How To Minimise Vacancy\" — the real cost, the turnover triggers, the retention system, the outcome.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, professional slides from one reference. A polished look signals the competence and care an owner wants managing their investment.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clean, professional slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a property-management reality into a carousel that wins landlords and owners as clients.",
      "Demonstrating how you protect an owner's investment, which earns the management contract.",
      "Teaching owners about screening, maintenance, and vacancy, positioning you as the professional who protects returns.",
      "Batching a week so your visibility holds through the daily firefighting.",
      "Building trust with owners choosing who to hand their asset to.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "How owners find you", before: "Referrals and directories", after: "Visible competence and care" },
      { metric: "Weekly hours on content", before: "0 — firefighting eats it", after: "50 minutes, batched" },
    ],
  },
  "course-creators": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your course's expertise into daily angles that grow the audience your launches depend on. The list you build between launches determines how each one performs — this is what keeps it growing without eating your build time.",
        time_saved: "Saves ~2.5 hours a week",
        example_output:
          "\"You've saved 40 courses and finished 2. The problem isn't you. Most courses are designed to be sold, not completed — here's how to tell the difference.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts captions that give away real value from your curriculum, which is the counterintuitive engine of course sales. When your free content genuinely teaches, people trust the paid version will deliver — and buy on launch day.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"The whole framework from lesson 1 of my course, free, in this post. If it clicks, the course goes 10x deeper — but you'll get real value from just this.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns a lesson into a value-first carousel that lets prospects sample your teaching quality. A prospect who learns something real has effectively previewed your course — your most persuasive sales asset.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide lesson from your curriculum — the problem, the framework, the steps, an example, and a real takeaway.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces polished, on-brand slides from one reference so your free content looks as professional as your paid course. Consistent quality builds the credibility that justifies your price.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Polished, course-quality slides in your palette — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a lesson into a value-first carousel that lets prospects sample your teaching.",
      "Giving away genuine value, which is the counterintuitive engine of course sales.",
      "Growing your audience between launches, so each launch performs better than the last.",
      "Keeping content consistent between launches instead of going silent.",
      "Making free content look as polished as the course, which justifies the price.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Audience between launches", before: "Goes cold", after: "Grows — batched weekly" },
      { metric: "Weekly hours on content", before: "4+ hours", after: "60 minutes, batched" },
    ],
  },
  "community-builders": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your understanding of belonging and engagement into daily angles that attract members and prove your expertise. Growing a community requires constant visibility, and this is what keeps you attracting the right people without burning out.",
        time_saved: "Saves ~2 hours a week",
        example_output:
          "\"Your community is quiet because you made it a broadcast channel. People don't stay where they can only listen — they stay where they're needed.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts captions that reveal what actually creates belonging, which resonates with anyone trying to build a community. Sharing genuine insight positions you as an authority and draws the right members to your own space.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"The healthiest community I ever built had a rule: no lurking. Everyone introduced themselves and made one ask in week one. Belonging starts with contributing.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your method into a carousel that teaches community-building — onboarding rituals, sparking member-led activity, sustaining engagement. It demonstrates expertise and attracts both members and the clients who want your help.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide method titled \"The First 48 Hours\" — why new members ghost, the welcome ritual, the first contribution, the retention lift.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Creates warm, human slides from one reference that reflect the belonging you build. An inviting look draws the right people to your community.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Warm, human, inviting slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning your understanding of belonging into content that attracts members and proves expertise.",
      "Revealing what actually creates belonging, which resonates with anyone building a community.",
      "Teaching your method, which draws both members and clients who want your help.",
      "Batching a week so growing your community doesn't burn you out.",
      "Positioning yourself as an authority in an undervalued, misunderstood discipline.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Member and client attraction", before: "Slow, word of mouth", after: "Consistent inbound" },
      { metric: "Weekly hours on content", before: "0 — community work eats it", after: "50 minutes, batched" },
    ],
  },
  "newsletter-founders": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns each issue into a week of growth angles, because a media business lives or dies on subscriber acquisition. Your social funnel is the growth engine, and this makes running it sustainable alongside writing and monetising.",
        time_saved: "Saves ~3 hours a week on growth",
        example_output:
          "\"We hit 50k subscribers with zero ad spend. One channel drove 60% of it, and it wasn't the one everyone tells you to focus on.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns an issue's best insight into a subscribe-driving hook. As a founder, subscriber growth is your core business metric — writing the teaser that converts a scroller is the highest-leverage work you do.",
        time_saved: "Saves ~25 minutes per post",
        example_output:
          "\"I analysed why newsletters plateau at 10k subscribers. It's almost never quality — it's a growth loop they never built. Full teardown in Thursday's issue.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns an issue into a takeaways carousel that gives value and funnels subscribes. It proves your newsletter earns inbox space and doubles as a scalable acquisition asset.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide distillation of your latest issue — the 5 key insights, each a slide, ending with a subscribe CTA.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces on-brand slides from one reference that build recognisable media brand equity. Consistent visuals turn one-time readers into loyal subscribers and make your brand memorable.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "On-brand, recognisable media slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning each issue into a week of growth angles that feed your subscriber acquisition engine.",
      "Writing subscribe-driving hooks, since growth is your core business metric.",
      "Building takeaways carousels that give value and funnel subscribers.",
      "Building recognisable brand equity that turns readers into loyal subscribers.",
      "Keeping growth consistent, so your media business compounds instead of plateauing.",
    ],
    results: [
      { metric: "Time to produce a week of growth content", before: "3 hours", after: "20 minutes" },
      { metric: "Subscriber acquisition engine", before: "Inconsistent", after: "Systematic — batched weekly" },
      { metric: "Growth trajectory", before: "Plateaued", after: "Compounding" },
    ],
  },
  "content-creators": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Feeds you 10 fresh angles a day, solving the creator's core problem: the relentless demand for ideas. Burnout comes from the pressure to constantly produce, and never running out of directions is what makes a sustainable creator career possible.",
        time_saved: "Saves ~3 hours a week of ideation",
        example_output:
          "\"I've posted every day for two years. The reason I haven't burned out isn't discipline — it's that I stopped trying to be original and started being useful.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts scroll-stopping hooks and captions in your voice, so your reach doesn't depend on you being creatively fresh every single day. It turns a rough idea into a polished post fast, protecting both your output and your sanity.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"The post that changed my account wasn't my most creative. It was the most useful — a boring how-to I almost didn't publish because it felt too simple.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns an idea into a full carousel, one of the highest-performing formats, without hours of design. It lets you ship the saveable, shareable content that grows an audience, at the volume the algorithm rewards.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide carousel on your topic — the hook, the value, the steps, the example, and a follow CTA.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces on-brand, scroll-stopping slides from one reference so your feed is recognisably yours. A consistent visual identity is what turns a viewer into a follower and builds a real brand.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Scroll-stopping, on-brand slides — sized for LinkedIn, Instagram, and Twitter/X in one pass.",
      },
    ],
    use_cases: [
      "Never running out of ideas, which solves the creator's core burnout problem.",
      "Turning a rough idea into a polished post fast, protecting your output and sanity.",
      "Shipping carousels at the volume the algorithm rewards without hours of design.",
      "Repurposing one piece across LinkedIn, Instagram, and X in a single pass.",
      "Building a recognisable visual brand that turns viewers into followers.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Idea supply", before: "The constant blank-page dread", after: "10 fresh angles daily" },
      { metric: "Sustainable posting volume", before: "Burnout within months", after: "Consistent, batched" },
    ],
  },
  "influencers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Feeds you daily angles so your content stays fresh and your posting stays consistent — the two things sponsors and the algorithm both reward. Your income depends on reach, and reach depends on never going quiet.",
        time_saved: "Saves ~3 hours a week of ideation",
        example_output:
          "\"Brands aren't paying for your follower count anymore. They're paying for the thing that's harder to fake — and here's how to show you have it.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts captions that hold attention and drive engagement in your voice. Since engagement rate is what sponsors actually pay for now, captions that spark comments and saves directly protect your income.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"I turned down a $10k brand deal last week. Here's the exact reason — and why saying no to the wrong sponsors is how you keep the right audience.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns an idea into a high-saving carousel, the format that boosts the engagement metrics sponsors evaluate. It diversifies you beyond video and builds the saveable content that signals real influence.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide value carousel in your niche — the hook, the insight, the steps, the example, and a save-worthy takeaway.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces on-brand, scroll-stopping slides from one reference so your feed is unmistakably yours. A strong, consistent aesthetic is part of what makes a brand valuable — and worth sponsoring.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Scroll-stopping, on-brand slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Staying consistent and fresh, which is what sponsors and the algorithm both reward.",
      "Writing captions that drive the engagement rate sponsors actually pay for now.",
      "Shipping high-saving carousels that boost the metrics brands evaluate.",
      "Diversifying beyond video into saveable content that signals real influence.",
      "Maintaining a strong, consistent aesthetic that makes your brand worth sponsoring.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Posting consistency", before: "Slips, reach drops", after: "Steady — batched" },
      { metric: "Content that sponsors value", before: "Reach only", after: "Engagement-driving formats" },
    ],
  },
  "brand-ambassadors": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your authentic experience with a brand into daily angles that convert. Ambassadors who create genuine, consistent content earn better partnerships — this is what keeps your content fresh and your value to brands high.",
        time_saved: "Saves ~2 hours a week",
        example_output:
          "\"I've repped this brand for a year. The reason I still use it has nothing to do with the deal — and that's exactly why my audience believes me.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts authentic-sounding captions that promote without feeling like an ad. Audiences tune out obvious sponsorship, so content that feels genuine is what actually drives the conversions brands measure — and what wins you renewals.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"This isn't a #ad, even though I'm partnered with them. It's just the thing I reach for at 6am, and I'd tell you even if they weren't paying me.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your experience into a value-first carousel that features a brand within genuinely useful content. This out-converts a straight product post and demonstrates to brands that you drive results, not just impressions.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide value carousel where the product appears as the natural solution — the problem, the approach, where the brand fits, the result.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces polished, on-brand slides from one reference that satisfy brand guidelines while staying recognisably yours. Consistent quality is what makes brands want to keep working with you.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Polished, guideline-friendly, on-brand slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning authentic brand experience into content that actually converts.",
      "Promoting without feeling like an ad, which is what drives the conversions brands measure.",
      "Building value-first carousels that out-convert straight product posts.",
      "Demonstrating you drive results, not just impressions, which wins renewals.",
      "Keeping content polished and consistent, which makes brands want to keep working with you.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Content that converts vs impresses", before: "Product posts, low convert", after: "Value-first, higher convert" },
      { metric: "Weekly hours on content", before: "3+ hours", after: "50 minutes, batched" },
    ],
  },
  "cohort-based-course-founders": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your teaching into daily angles that fill cohorts, which is your entire business rhythm. Each cohort needs enrollment, and a warm audience is the difference between a full cohort and a scramble — this keeps that audience growing.",
        time_saved: "Saves ~2.5 hours a week",
        example_output:
          "\"Self-paced courses have a 3% completion rate. Cohorts hit 85%. The difference isn't the content — it's the thing you can't get from a video: other people.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts captions that give real value and build anticipation for the next cohort. Sharing your expertise proves the live experience is worth the premium price and fills the enrollment window.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"Here's the framework we spend week 1 on, free. In the cohort, you'd apply it live with feedback — but you can start with just this today.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns a lesson into a value-first carousel that samples your teaching and drives applications. A prospect who learns something real is far more likely to apply for the live, higher-touch cohort experience.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide lesson from your curriculum — the problem, the framework, the steps, an example, and a next-cohort CTA.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces polished, on-brand slides from one reference so your content matches the premium positioning of a cohort program. Consistent quality justifies the higher price point.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Polished, premium, on-brand slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning your teaching into content that fills each cohort's enrollment window.",
      "Giving real value that proves the live experience is worth the premium price.",
      "Building value-first carousels that sample your teaching and drive applications.",
      "Keeping a warm audience between cohorts, so enrollment isn't a scramble.",
      "Matching content quality to the premium positioning of a cohort program.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Cohort enrollment", before: "A scramble each time", after: "A warm, growing audience" },
      { metric: "Weekly hours on content", before: "4+ hours", after: "60 minutes, batched" },
    ],
  },
  "recruiters": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your hiring-market insight into daily angles that attract both candidates and clients. Recruiting runs on relationships, and a visible, credible recruiter gets inbound from great candidates and companies instead of cold-messaging everyone.",
        time_saved: "Saves ~2 hours a week between roles",
        example_output:
          "\"The candidates you're rejecting for 'culture fit' are usually the ones who'd have changed your culture for the better. Here's what that phrase really means.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts hooks that offer real value to candidates rather than just posting jobs. Candidates ignore job-spam but follow recruiters who genuinely help — that goodwill is what fills your pipeline with people who trust you.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"The mistake that gets great engineers rejected in the first 5 minutes of an interview — and it has nothing to do with their code.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your expertise into a carousel that helps candidates or hiring managers — interview prep, what actually gets people hired, how to write a job post that works. It builds the authority that makes you the recruiter people want to work with.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide guide titled \"What Actually Gets You Hired\" — the resume myth, the real signal, the interview move, the follow-up.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces polished, professional slides from one reference. A credible feed reassures both candidates and clients that you're a serious professional worth trusting with a career or a hire.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Polished, professional slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning hiring-market insight into content that attracts both candidates and clients.",
      "Offering candidates real value rather than job-spam, which builds the goodwill that fills your pipeline.",
      "Teaching interview or hiring skills, which makes you the recruiter people want to work with.",
      "Batching a week so your visibility holds through busy hiring cycles.",
      "Building a reputation that generates inbound instead of endless cold outreach.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "How candidates and clients arrive", before: "Cold outreach", after: "Inbound from a trusted name" },
      { metric: "Weekly hours on content", before: "0 — sourcing eats it", after: "50 minutes, batched" },
    ],
  },
  "hr-professionals": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your people expertise into daily angles that build authority and reach leaders. HR is often underestimated as strategic, so content demonstrating real insight into culture, retention, and performance is what earns you a seat at the table.",
        time_saved: "Saves ~2 hours a week",
        example_output:
          "\"Your best people aren't leaving for money. They're leaving because their manager hasn't had a real conversation with them in eight months.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts hooks that reframe a workplace problem with genuine insight, signalling strategic depth. This positions you above compliance-and-paperwork perceptions and marks you as a leader who understands what actually drives a business's people.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"We surveyed why people quit and got polite answers. The real reason showed up in the exit data: they left within 90 days of a reorg nobody explained.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your expertise into a carousel that teaches — retention, difficult conversations, building culture that isn't just posters. It positions you as a strategic people leader, which opens senior roles and consulting.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide guide titled \"Why Your Best People Leave\" — the real triggers, the warning signs, the intervention, the retention lift.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, professional slides from one reference. A polished, credible look reinforces that you're a strategic people leader rather than an administrator.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clean, professional, people-focused slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning people expertise into content that builds authority and reaches leaders.",
      "Reframing a workplace problem with insight, which signals strategic depth.",
      "Teaching retention, culture, and hard conversations, positioning you as a strategic people leader.",
      "Batching a week so your authority-building survives a demanding people function.",
      "Elevating HR above the compliance-and-paperwork perception.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Perceived as strategic vs admin", before: "Underestimated", after: "Visible strategic authority" },
      { metric: "Weekly hours on content", before: "0", after: "50 minutes, batched" },
    ],
  },
  "project-managers": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns the real challenges of delivering projects into daily angles. PM is a craft learned by doing, and sharing your lived lessons on stakeholders, scope, and risk is what builds the reputation that advances your career.",
        time_saved: "Saves ~2 hours a week",
        example_output:
          "\"The project didn't fail at the deadline. It failed in week two, when everyone nodded at a scope nobody actually agreed on.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts hooks around the real tensions of delivery — managing stakeholders, protecting scope, surfacing risk early. These specific, hard-won truths resonate with fellow PMs and signal that you've actually delivered, not just certified.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"'We're 90% done' is the most dangerous status update in project management. Here's what it almost always actually means.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns a lesson into a framework carousel grounded in a real project — how you run a kickoff that prevents chaos, how you surface risk, how you manage a difficult stakeholder. It positions you as a practitioner-thinker who gets promoted.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide framework titled \"The Kickoff That Prevents Chaos\" — the alignment gap, the questions, the artifact, the outcome.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, consistent slides from one reference so your frameworks are legible. Clear communication of complex delivery is core to the PM role — a well-presented feed demonstrates it.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clean, framework-friendly slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a real project decision into a teaching post, so your delivery experience builds your reputation.",
      "Naming a delivery tension every PM feels, which signals you've actually shipped.",
      "Publishing a framework grounded in a real project, which reads as practitioner judgment.",
      "Batching a week so reputation-building survives delivery crunch.",
      "Positioning yourself as a practitioner-thinker who gets promoted.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Delivery experience made visible", before: "Stays in status decks", after: "Published weekly" },
      { metric: "Weekly hours on personal brand", before: "0 — delivery eats it", after: "50 minutes, batched" },
    ],
  },
  "business-analysts": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your analysis and problem-framing into daily angles. BA is an undervalued, misunderstood role, so content demonstrating how you turn ambiguity into clarity is what builds recognition and opens better opportunities.",
        time_saved: "Saves ~2 hours a week",
        example_output:
          "\"The requirement said 'make it faster'. Three weeks of work later, we learned they meant 'fewer clicks', not 'lower latency'. Here's the question that would have caught it.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts hooks that reframe a business problem, signalling the analytical skill at the heart of your role. Showing how you find the real requirement behind the stated one marks you as more than a note-taker.",
        time_saved: "Saves ~30 minutes per post",
        example_output:
          "\"Stakeholders never tell you the real requirement. They tell you their solution. Your job is to quietly work backwards to the problem they actually have.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your method into a carousel that teaches — eliciting real requirements, mapping a process, communicating with both technical and business sides. It demonstrates the bridging skill that makes a great BA valuable and promotable.",
        time_saved: "Saves ~1.5 hours per carousel",
        example_output:
          "A 7-slide method titled \"Finding The Real Requirement\" — the stated ask, the questions, the underlying need, the reframed spec.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, clear slides from one reference so your process maps and frameworks are legible. Clear communication is central to the BA role — a well-presented feed demonstrates it.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clean, diagram-friendly slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning your analysis into content that makes an undervalued role visible and valued.",
      "Reframing a business problem, which signals the analytical skill at the heart of your work.",
      "Teaching how you find the real requirement, which marks you as more than a note-taker.",
      "Batching a week so your authority-building survives project demands.",
      "Building recognition in a field where almost no one builds a public profile.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2 hours", after: "15 minutes" },
      { metric: "Perceived value of the role", before: "Underestimated", after: "Visible analytical authority" },
      { metric: "Weekly hours on content", before: "0", after: "50 minutes, batched" },
    ],
  },
  "biotech-founders": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your science and mission into daily angles that attract patient capital and mission-driven talent. Biotech's long, capital-heavy timelines make sustained visibility hard, so this is what keeps momentum and belief alive between milestones.",
        time_saved: "Saves ~2.5 hours a week",
        example_output:
          "\"Everyone asks when we'll have a product. Wrong question for biotech. Here's the milestone that actually de-risks everything, and why it takes seven years.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns dense science into a clear, compelling caption that a non-specialist investor or recruit can grasp. Making complex biology understandable and exciting is what turns your mission into something fundable and joinable.",
        time_saved: "Saves ~40 minutes per post",
        example_output:
          "\"Our therapy works by teaching the immune system to do something it forgot how to do. In plain English, here's what that means for a patient — and why it's hard.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your mission and progress into a carousel that maintains momentum across long timelines. It builds the community of believers — investors, talent, patients — who sustain a company through the years science demands.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide story titled \"The Problem We Exist To Solve\" — the unmet need, the science, the approach, the milestone, the vision.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, credible, science-forward slides from one reference. A rigorous but clear look signals both scientific seriousness and communication skill to investors and recruits.",
        time_saved: "Saves ~1 hour per post",
        example_output:
          "Clean, credible, science-forward slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning dense science into a clear carousel that makes your mission fundable and joinable.",
      "Maintaining momentum across long, capital-heavy timelines between milestones.",
      "Building a community of believers — investors, talent, patients — who sustain the company.",
      "Explaining why biotech takes a decade, which sets realistic expectations and attracts patient capital.",
      "Batching a week so storytelling survives a demanding science-first schedule.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "3 hours", after: "20 minutes" },
      { metric: "Momentum across long timelines", before: "Silence between milestones", after: "Sustained visibility" },
      { metric: "Weekly hours on content", before: "0 — the science eats it", after: "60 minutes, batched" },
    ],
  },
  "medtech-founders": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns the reality of building regulated medical technology into daily angles that reach clinicians, investors, and partners. MedTech's long approval cycles make visibility hard to sustain, so this keeps credibility building between regulatory milestones.",
        time_saved: "Saves ~2.5 hours a week",
        example_output:
          "\"The hardest part of medtech isn't the device. It's that the person who uses it, the person who buys it, and the person who pays for it are three different people.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns clinical and regulatory complexity into plain-English captions clinicians and investors trust. Making the intricate understandable — while respecting the seriousness of healthcare — is what builds credibility in a cautious field.",
        time_saved: "Saves ~40 minutes per post",
        example_output:
          "\"We could have shipped 18 months earlier by skipping a study. We didn't, because 'faster' means something different when the user is holding a patient's outcome.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your mission and clinical evidence into a carousel that builds trust with a cautious audience. Demonstrating rigor and genuine clinical understanding is what wins the confidence of clinicians, regulators, and health-system buyers.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide story titled \"The Clinical Problem We're Solving\" — the current standard, the gap, our approach, the evidence, the path.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, clinical-credible slides from one reference. A rigorous, professional look signals the seriousness and safety-consciousness healthcare demands.",
        time_saved: "Saves ~1 hour per post",
        example_output:
          "Clean, clinical-credible slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning clinical complexity into plain-English content clinicians and investors trust.",
      "Maintaining credibility between long regulatory milestones.",
      "Building trust with a cautious audience of clinicians, regulators, and health-system buyers.",
      "Demonstrating rigor and genuine clinical understanding, which wins confidence.",
      "Batching a week so visibility survives a demanding regulatory schedule.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "3 hours", after: "20 minutes" },
      { metric: "Credibility with clinicians", before: "Just another device pitch", after: "A founder who gets healthcare" },
      { metric: "Weekly hours on content", before: "0 — approvals eat it", after: "60 minutes, batched" },
    ],
  },
  "legaltech-founders": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your views on the legal industry and the reality of building for it into daily angles. LegalTech sells to a conservative, skeptical profession, so content proving you understand lawyers' real workflows is what earns adoption.",
        time_saved: "Saves ~2.5 hours a week",
        example_output:
          "\"Lawyers don't resist new tools because they're behind. They resist because one bad output can mean malpractice — and your demo didn't address that once.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts captions that lead with a genuine understanding of legal workflows rather than a tech pitch. Lawyers are skeptical of software that doesn't respect the stakes of their work — speaking to that reality earns their trust.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"We built a feature to automate contract review. Adoption was zero. Lawyers don't want automation they can't audit — they want a faster way to still be responsible.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns an industry insight or build lesson into a carousel that resonates with lawyers and investors. Demonstrating you understand both the technology and the profession's genuine constraints is what differentiates a credible legaltech founder.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide breakdown titled \"Why Lawyers Reject Your Tool\" — the trust gap, the liability fear, the auditability need, the fix.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, credible, professional slides from one reference. A serious, considered look reinforces that you respect the profession you're building for.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clean, professional, credible slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning an industry insight into a carousel that resonates with skeptical lawyers.",
      "Leading with genuine understanding of legal workflows rather than a tech pitch.",
      "Sharing the reality of building for a conservative profession, which attracts the right talent and investors.",
      "Batching a week so credibility-building survives a demanding build cycle.",
      "Demonstrating you understand both the technology and the profession's constraints.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Credibility with lawyers", before: "Just another tech pitch", after: "A founder who gets the profession" },
      { metric: "Weekly hours on content", before: "0 — building eats it", after: "60 minutes, batched" },
    ],
  },
  "proptech-founders": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your views on real estate and the reality of building proptech into daily angles. The property industry is relationship-driven and slow to adopt, so content proving you understand how the business actually works is what opens doors.",
        time_saved: "Saves ~2.5 hours a week",
        example_output:
          "\"Proptech keeps failing because founders build for the tenant and sell to the landlord — two people whose interests are often directly opposed.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts captions that demonstrate genuine understanding of property workflows rather than a generic tech pitch. The industry is skeptical of outsiders, so speaking its language and respecting its realities is what earns adoption.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"An agent told me why they'd never use our software: it added a step to a workflow that runs on speed. We'd optimised for data we wanted, not the deal they needed to close.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns an industry insight or build lesson into a carousel that resonates with property professionals and investors. Showing you understand both the tech and the industry's real dynamics is what differentiates a credible proptech founder.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide breakdown titled \"Why Proptech Adoption Is So Hard\" — the incentive mismatch, the workflow reality, the trust gap, the approach.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, professional slides from one reference. A credible look reinforces that you're a serious founder who understands the industry you're building for.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clean, professional, credible slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning an industry insight into a carousel that resonates with property professionals.",
      "Demonstrating genuine understanding of property workflows rather than a generic tech pitch.",
      "Sharing the reality of building in a relationship-driven, slow-to-adopt industry.",
      "Batching a week so credibility-building survives a demanding build cycle.",
      "Proving you understand both the technology and the industry's real dynamics.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Credibility with the industry", before: "An outsider with software", after: "A founder who gets property" },
      { metric: "Weekly hours on content", before: "0 — building eats it", after: "60 minutes, batched" },
    ],
  },
  "hrtech-founders": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your views on the future of work and the reality of building HRTech into daily angles. You sell to HR leaders and executives, so content proving you understand real people problems — not just software features — is what earns credibility.",
        time_saved: "Saves ~2.5 hours a week",
        example_output:
          "\"HR software promises to 'boost engagement'. Engagement surveys don't boost engagement any more than a thermometer lowers a fever. Here's what actually does.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Drafts captions that lead with a genuine insight about people and work rather than a product pitch. HR buyers have been burned by software that overpromises, so speaking to the real human problem is what earns their trust.",
        time_saved: "Saves ~35 minutes per post",
        example_output:
          "\"We built a beautiful analytics dashboard for HR. Nobody looked at it twice. The data confirmed what they already knew — it just didn't tell them what to do about it.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns a people insight or build lesson into a carousel that resonates with HR leaders and investors. Demonstrating you understand the human reality behind the software is what differentiates a credible HRTech founder.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide breakdown titled \"Why Engagement Tools Don't Work\" — the measurement trap, the missing action, the manager gap, the fix.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, professional, people-focused slides from one reference. A credible, human look reinforces that you understand both the technology and the people it serves.",
        time_saved: "Saves ~45 minutes per post",
        example_output:
          "Clean, professional, people-focused slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning a people insight into a carousel that resonates with HR leaders and executives.",
      "Leading with a real human problem rather than a product pitch, which earns HR buyers' trust.",
      "Sharing the reality of building HRTech, which attracts mission-aligned talent and investors.",
      "Batching a week so credibility-building survives a demanding build cycle.",
      "Demonstrating you understand the human reality behind the software.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "2.5 hours", after: "15 minutes" },
      { metric: "Credibility with HR buyers", before: "Another overpromising tool", after: "A founder who gets people" },
      { metric: "Weekly hours on content", before: "0 — building eats it", after: "60 minutes, batched" },
    ],
  },
  "cleantech-founders": {
    tool_benefits: [
      {
        tool_name: "AI Idea Generator",
        benefit:
          "Turns your mission and the science into daily angles that attract patient investors and mission-driven talent. Cleantech's capital-heavy, decade-long timelines make sustained visibility hard, so this keeps momentum and belief alive between milestones.",
        time_saved: "Saves ~2.5 hours a week",
        example_output:
          "\"This climate problem is solvable and the window is now. Here's the unglamorous engineering milestone that matters more than any headline this year.\"",
      },
      {
        tool_name: "AI Caption Writer",
        benefit:
          "Turns dense climate science into a clear, optimistic caption a non-specialist can grasp and get behind. Making a complex solution feel real and fundable is what turns your mission into capital and talent.",
        time_saved: "Saves ~40 minutes per post",
        example_output:
          "\"Our technology captures carbon at a fraction of today's cost. In plain terms, here's the one breakthrough that made the economics finally work — and what's still hard.\"",
      },
      {
        tool_name: "AI Carousel Creator",
        benefit:
          "Turns your mission and progress into a carousel that maintains momentum across long timelines. It builds the community of believers — investors, talent, advocates — who sustain a hard-tech company through the years it demands.",
        time_saved: "Saves ~2 hours per carousel",
        example_output:
          "A 7-slide story titled \"Why Hard Climate Tech Takes a Decade\" — the reality, the reason, the milestone, the payoff, the vision.",
      },
      {
        tool_name: "AI Image Generator",
        benefit:
          "Produces clean, credible, optimistic slides from one reference. A rigorous but hopeful look signals both scientific seriousness and the mission that attracts believers.",
        time_saved: "Saves ~1 hour per post",
        example_output:
          "Clean, credible, optimistic slides — sized for LinkedIn, Instagram, and Twitter/X.",
      },
    ],
    use_cases: [
      "Turning dense climate science into a clear, optimistic carousel that makes your solution feel fundable.",
      "Maintaining momentum across long, capital-heavy timelines between milestones.",
      "Building a community of believers — investors, talent, advocates — who sustain the company.",
      "Explaining why hard climate tech takes a decade, which attracts patient capital.",
      "Batching a week so storytelling survives a demanding science-first schedule.",
    ],
    results: [
      { metric: "Time to produce one carousel", before: "3 hours", after: "20 minutes" },
      { metric: "Momentum across long timelines", before: "Silence between milestones", after: "Sustained visibility" },
      { metric: "Weekly hours on content", before: "0 — the science eats it", after: "60 minutes, batched" },
    ],
  },
}
