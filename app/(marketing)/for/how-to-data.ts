import type { HowToStep } from "./data"

/**
 * Per-niche content that powers the /how-to/[slug] pages. Kept in its own module
 * so the large body of how-to content stays separate from the base niche records
 * in ./data.ts, where it is merged into the exported `niches` array by slug.
 *
 * Every slug in data.ts must have a matching entry here — the merge throws at
 * build time if one is missing.
 */
export interface HowToContent {
  how_to_steps: HowToStep[]
  before_carouselabs: string
  after_carouselabs: string
  time_to_first_post: string
  quick_wins: string[]
}

export const howToContent: Record<string, HowToContent> = {
  "saas-founders": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Mine your own week for stories worth telling",
        description:
          "Before you write anything, spend 15 minutes scrolling back through your Slack, your support inbox, and your last three customer calls. The best SaaS content is never invented — it's excavated. A churn conversation, a pricing debate, a feature you almost shipped and killed: each of these is a post. Keep a running note titled 'Content Raw Material' and drop one line into it every time something real happens. You are not looking for polished ideas yet, just moments with a number or a decision attached.",
        time_required: "15 min, once a week",
        carouselabs_tip:
          "CarouseLabs scans real SaaS news and trends every morning and hands you 10 idea angles, so on the days your own week feels quiet, you still have something specific to post about.",
      },
      {
        step_number: 2,
        title: "Pick the one metric that actually moved",
        description:
          "Founders default to vague claims ('growth is up') because specifics feel risky. They're the opposite. The post that performs is the one that names the exact number: MRR went from $8K to $10K, churn dropped from 6% to 3.6%, activation climbed 12 points. Choose a single metric from this week or this quarter and, next to it, write the one change you believe caused it. That pairing — number plus cause — is the spine of your carousel.",
        time_required: "10 min",
        carouselabs_tip:
          "Paste your rough metric and the change into CarouseLabs and it drafts a caption that keeps the number front and center instead of burying it in marketing language.",
      },
      {
        step_number: 3,
        title: "Write the hook before the rest of the post",
        description:
          "On LinkedIn, only the first two lines are visible before the 'see more' fold, so the hook does 90% of the work. For SaaS founders the strongest hooks are counterintuitive truths ('Our most-requested feature was the one we killed') or specific stakes ('This pricing mistake cost us six months'). Write five hook options for your chosen story and read each one out loud. If it sounds like a press release, cut it. If it makes you slightly nervous to publish, it's probably right.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates multiple hook variations for the same story so you can compare a curiosity hook against a contrarian one without staring at a blank page.",
      },
      {
        step_number: 4,
        title: "Structure it as a 7-slide narrative, not a list",
        description:
          "A carousel that teaches converts better than one that lists. Use the arc buyers follow in their own heads: Slide 1 the hook, Slide 2 the problem with a real number, Slide 3 the wrong assumption everyone makes, Slide 4 the insight, Slide 5 the specific change you made, Slide 6 the result, Slide 7 a soft CTA that invites a comment ('Want the checklist?'). This structure works because it mirrors how a technical decision actually unfolds.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full 7–8 slide carousel from your story in one pass, so you edit a draft that already follows this arc instead of designing slides from scratch in Canva.",
      },
      {
        step_number: 5,
        title: "Translate the technical into the plain-English version",
        description:
          "Your buyer is often non-technical — a VP of Ops, a founder in a different vertical, an investor. Every time you use a term like 'activation' or 'net revenue retention,' add the one-sentence human translation right after it. This single habit is what makes founders memorable: you become the person who makes the complicated simple. Read your draft as if you were the smartest non-engineer you know and flag anything they'd have to Google.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs is tuned to explain technical SaaS concepts in plain English by default, so the first draft already reads for a non-technical buyer instead of your engineering team.",
      },
      {
        step_number: 6,
        title: "Match the visuals to your brand so posts look like you",
        description:
          "Consistent visual identity is what turns scattered posts into a recognizable feed. Buyers should know a slide is yours before they read the name. Lock in two brand colors, one font, and a simple layout, then apply them to every carousel. You don't need a designer — you need the same template every week. Inconsistent design quietly signals an inconsistent product, which is the last thing a SaaS founder wants a buyer to feel.",
        time_required: "15 min first time, seconds after",
        carouselabs_tip:
          "Upload one reference image and CarouseLabs matches your brand colors and style automatically on every future carousel, so your feed looks designed without hiring a designer.",
      },
      {
        step_number: 7,
        title: "Post on a schedule and reply for the first hour",
        description:
          "Consistency beats magnitude on LinkedIn — three posts a week for a month will outperform one 'perfect' post every quarter, because the algorithm rewards reliable creators and buyers need repeated exposure before they trust you. Pick two or three fixed slots (Tuesday and Thursday mornings work well for B2B) and treat them as un-cancelable. Then block the first 60 minutes after posting to reply to every comment — early engagement is what pushes your post into wider feeds.",
        time_required: "5 min to post, 30 min to engage",
        carouselabs_tip:
          "Because CarouseLabs lets you batch a week of carousels in one sitting, hitting your schedule stops depending on whether you 'have time to write' on any given day.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, posting meant a founder sacrificing a build session to stare at a blank LinkedIn box. You'd have a great churn story in your head, then spend an hour agonizing over the first line, another hour wrestling slides into Canva, and a third second-guessing whether the numbers made you look bad. Most weeks the post never shipped — the product always won the time. When you did post, it came out in stiff corporate voice because you were rushing, stripping out the exact specifics that make founder content credible. The result was a graveyard of half-written drafts, three-week silences that reset your reach, and the nagging sense that competitors with worse products were winning attention simply because they showed up.",
    after_carouselabs:
      "With CarouseLabs, the churn story in your head becomes a published carousel before your coffee's cold. You open the day's 10 trending SaaS angles, pick the one that matches something real from your week, and drop in your actual metric and the change behind it. CarouseLabs drafts a plain-English caption that keeps the number front and center, builds the full 7-slide narrative, and matches your brand colors from the reference image you set once. You spend your time editing for truth and voice — not fighting Canva or the blank page. A week's worth of content gets batched in a single sitting, so posting no longer competes with shipping. You show up consistently, sound human, and the inbound demos start arriving from buyers who feel like they already know you.",
    time_to_first_post:
      "About 15 minutes from signup — most founders publish their first carousel before their onboarding coffee is finished.",
    quick_wins: [
      "Your first plain-English carousel explaining a technical part of your product — the kind of post non-technical buyers actually finish and share.",
      "A batched week of 3 posts drafted in one sitting, ending the three-week silences that keep resetting your reach.",
      "Your first inbound reply from a real buyer or operator who says 'I've been following your posts' — the moment content stops feeling like a chore.",
    ],
  },
  "startup-founders": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Decide what your build-in-public story is actually about",
        description:
          "Before your first post, name the single thread people will follow: the problem you're solving, the market you're betting on, the outcome you're chasing. Build-in-public fails when it's a random stream of updates with no spine. Write one sentence — 'I'm documenting the journey to X' — and pin it. Every future post is a chapter in that arc, which is exactly what makes investors and future hires keep watching instead of scrolling past another founder update.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs helps you turn that one-line mission into a recurring narrative, suggesting angles that advance your story instead of scattering unrelated posts.",
      },
      {
        step_number: 2,
        title: "Capture the week's real moments before they evaporate",
        description:
          "Founders forget their best material by Friday. The lost deal, the hard hire, the 2am bug, the customer call that changed your roadmap — these are the raw honesty that build-in-public runs on. Keep a simple weekly log and jot the moment plus how it felt. You're not writing yet, just refusing to let the truth of the week disappear. This log becomes an endless supply of vulnerable, specific posts that generic 'hustle' content can never match.",
        time_required: "5 min a day",
        carouselabs_tip:
          "Drop your rough weekly notes into CarouseLabs and it surfaces which moments have the strongest post potential, so nothing worth telling gets buried.",
      },
      {
        step_number: 3,
        title: "Lead with the mistake, not the win",
        description:
          "The instinct is to only post milestones, but on LinkedIn the vulnerable posts travel furthest — because everyone else is faking certainty. Take one thing that went wrong this week and open with it plainly: 'I spent six months building the wrong thing.' The failure earns trust; the lesson earns the follow. Founders who share losses honestly build the kind of audience that shows up when they eventually launch, raise, or hire.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs drafts vulnerable founder posts that still sound like you rather than a self-help template, keeping the specific, awkward detail that makes them believable.",
      },
      {
        step_number: 4,
        title: "Turn progress into a narrative carousel",
        description:
          "A milestone told as a list is forgettable; told as a story, it's compelling. Structure your carousel as an arc: where you were, the obstacle, the decision, what you tried, what happened, what's next. End on the open question of your journey so people feel invested in the sequel. This is the format investors love to follow, because it lets them watch your judgment develop in public — the thing they're actually evaluating.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the documenting-the-journey carousel investors love to follow, arranging your update into a story arc instead of a status report.",
      },
      {
        step_number: 5,
        title: "Show the traction without bragging",
        description:
          "Numbers build credibility, but raw flexing repels. The trick is to frame every metric inside a lesson: not 'we hit 1,000 users' but 'we hit 1,000 users and here's the channel that surprised us.' This lets you share real traction — the thing that quietly gets you into investor and hire conversations — while still delivering value. Your feed becomes proof of momentum for the people who make slow decisions about you.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs reframes your metrics into lesson-led hooks, so your traction reads as a story worth learning from rather than a humblebrag.",
      },
      {
        step_number: 6,
        title: "Batch a week so momentum survives the busy weeks",
        description:
          "Build-in-public momentum famously dies around week three, right when product work spikes. The fix is structural: block one session and produce a week of posts at once, while you're in a reflective headspace rather than squeezing writing between sprints. Consistency is what compounds a build-in-public audience — a founder who posts through the chaos looks far more fundable than one who goes silent every time things get hard.",
        time_required: "75 min for a week",
        carouselabs_tip:
          "CarouseLabs suggests angles from your real metrics, sprints, and customer calls, so batching a week doesn't mean inventing seven ideas from scratch.",
      },
      {
        step_number: 7,
        title: "Engage like a founder, not a broadcaster",
        description:
          "Build-in-public is a two-way relationship. After you post, spend time in the comments and in other founders' posts — answer every reply, ask real questions back, and support peers building alongside you. This is how loose followers become the champions who reshare your launch and the investors who slide into your DMs. The founders who win LinkedIn treat it as a community they're part of, not a stage they perform on.",
        time_required: "20 min after each post",
        carouselabs_tip:
          "Because CarouseLabs handles the drafting, you reclaim the time to actually be present in the comments — where build-in-public relationships are really built.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, building in public was a resolution founders broke by week three. You'd start strong — a launch post, a milestone, a lesson — and then a hard sprint would hit, the product would eat every hour, and the posting would stop. By the time you resurfaced, the momentum was gone and starting again felt embarrassing. The raw wins and losses that would have made great content stayed trapped in your head, never reaching the investors and future hires quietly evaluating you. And when you did force a post out, the blank page turned a vivid week into a flat, generic update, because you were too drained to find the story inside it.",
    after_carouselabs:
      "With CarouseLabs, build-in-public finally becomes sustainable. Your weekly log of real moments feeds an idea engine that suggests which ones to tell and how. A hard week becomes a vulnerable, specific post that sounds like you, not a template. A milestone becomes a narrative carousel investors love to follow. Because you batch a week in one reflective sitting, the posting survives your busiest sprints instead of dying in them. The journey stays visible, the traction stays framed as lessons, and slowly you build the audience of believers — the people who reshare your launch, apply to your roles, and open investor conversations with 'I've been following your journey.'",
    time_to_first_post:
      "About 20 minutes including onboarding — most founders publish their first build-in-public carousel the same day they sign up.",
    quick_wins: [
      "Your first vulnerable 'here's what went wrong' post that earns more trust than any milestone announcement.",
      "A batched week of journey posts that survives your next busy sprint instead of going silent.",
      "Your first investor or senior-hire reply that opens with 'I've been following your journey' — proof the audience is compounding.",
    ],
  },
  "solopreneurs": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Accept that you are the brand — and pick your lane",
        description:
          "As a solopreneur there's no company logo to hide behind; people follow you, buy from you, and refer you. Start by choosing the one intersection you own — 'I help [audience] achieve [outcome]' — and make it unmistakable. Trying to be interesting about everything makes you memorable for nothing. A sharp lane is what turns a scattered feed into a business asset, because it tells the right person, in one line, exactly why they should stick around and eventually pay you.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content anchored to your chosen lane, so even on busy days your posts reinforce one clear positioning instead of drifting.",
      },
      {
        step_number: 2,
        title: "Turn the work you're already doing into content",
        description:
          "You don't have a marketing team or spare hours, so content has to come from the work itself. Every client project, tricky problem, or decision you make this week is raw material. Keep a note open and capture one lesson per day as it happens — the fix that saved a project, the boundary you set, the tool that changed your workflow. This 'work-as-content' habit means you never have to invent ideas in a separate, time-you-don't-have block.",
        time_required: "5 min a day",
        carouselabs_tip:
          "CarouseLabs turns a single line about your day into a full post, so the lesson you jotted between client calls becomes publishable without a writing session.",
      },
      {
        step_number: 3,
        title: "Write hooks that speak to one specific person",
        description:
          "Solopreneur content dies when it tries to address everyone. The strongest hooks name a precise struggle your ideal client recognizes instantly: 'If you're a freelancer scared to raise your rates, read this.' Specificity feels like you're reading their mind, and that's what stops the scroll. Before writing, picture one real person you'd love to work with and write the first line as if you're speaking only to them. Everyone else who fits will feel seen too.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hook options aimed at your specific ideal client, so your first line feels personal instead of broadcast to no one in particular.",
      },
      {
        step_number: 4,
        title: "Build a value-first carousel from one lesson",
        description:
          "The carousel that grows a solo audience gives something away for free. Take one lesson and structure it: the hook, the mistake most people make, why it happens, your approach, the step-by-step, and a close that invites a comment. Generosity is your growth engine — when you consistently hand people something they can use today, they follow, share, and remember you when they're finally ready to buy the deeper version of your help.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full teaching carousel from your single lesson, so you deliver polished, genuinely useful value without an afternoon in Canva.",
      },
      {
        step_number: 5,
        title: "Show the human behind the business",
        description:
          "People buy from solopreneurs because of trust, and trust comes from personality. Mix your teaching posts with the occasional honest look behind the curtain: the slow month, the client boundary you learned the hard way, why you went solo in the first place. These posts humanize the expertise and make you relatable in a way a polished brand never can — which is your single biggest advantage over the faceless companies you compete with.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs keeps a balanced mix of teaching and personal-story angles in your idea feed, so your feed stays human without you planning a content ratio.",
      },
      {
        step_number: 6,
        title: "Batch a week so content doesn't compete with client work",
        description:
          "The solopreneur trap is that content always loses to billable work, so it slips the moment you get busy — and then leads dry up a month later. Break the cycle by batching: one focused session, a week of posts scheduled, done. When content runs on autopilot in the background, your pipeline stays warm even during a heads-down client sprint, which is the whole point of building an audience as a business of one.",
        time_required: "60 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you draft and batch a full week in one sitting, so a busy client week never means a silent feed and a dry pipeline next month.",
      },
      {
        step_number: 7,
        title: "Make every post look consistently yours",
        description:
          "Without a brand team, visual consistency is what makes a one-person business look established. Choose your colors, a simple template, and your headshot, and use them on every carousel so people recognize your posts at a glance. This quiet consistency signals reliability — the exact quality a prospect worries about when hiring a solopreneur instead of an agency. A cohesive feed does trust-building work for you while you sleep.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference image and CarouseLabs applies your brand look to every carousel automatically, giving a solo business an on-brand, established feel.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, being a solopreneur meant content was the plate that always dropped. You wore every hat — sales, delivery, admin, support — and marketing yourself came dead last. You knew your audience was your business, that a warm following meant inbound leads and higher rates, but between client deadlines there was simply no hour to write, design, and post. So you'd go quiet for weeks, watch the leads dry up, then scramble to cold-pitch again. The lessons from your daily work — the exact expertise people would gladly follow you for — stayed locked in your head, and you competed on price against faceless companies instead of on the trust only a visible human can build.",
    after_carouselabs:
      "With CarouseLabs, your one-person business finally markets itself. The lesson you jot between client calls becomes a polished teaching carousel. Your positioning stays sharp because every post is anchored to your lane. In one focused session you batch a week of content and schedule it, so your feed keeps running — and your pipeline keeps warming — straight through a heads-down client sprint. The human, personal posts that only a solopreneur can make build the trust that lets you raise your rates and win work without cold-pitching. You stop choosing between doing the work and marketing the work, because the work has become the content.",
    time_to_first_post:
      "About 20 minutes including onboarding — most solopreneurs turn a lesson from that day's work into their first carousel the same afternoon.",
    quick_wins: [
      "Your first value-first teaching carousel that grows your audience while giving your ideal client something they can use today.",
      "A batched week of content scheduled in one sitting, so leads keep coming in during your busiest client week.",
      "Your first inbound enquiry from someone who found you through a post — a lead you didn't have to cold-pitch for.",
    ],
  },
  "agency-owners": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Turn client results into your marketing engine",
        description:
          "Your agency's best content is the outcomes you already produce for clients. Before writing, list your three strongest recent results and, for each, get permission to talk about the approach (even anonymized). A specific result — 'we cut a client's cost-per-lead 40% with one change' — is worth more than any 'we offer full-service marketing' post. Prospects hire agencies on proof, and your case studies are proof they can't get from your competitors' generic service pages.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs turns a rough result and the approach behind it into a client-story carousel, so your wins become marketing without a case-study writing project.",
      },
      {
        step_number: 2,
        title: "Position on a sharp point of view, not services",
        description:
          "Agencies blur together because they all list the same services. What separates you is a strong opinion about how the work should be done. Pick the hill you'll die on — 'most brands are posting too much and saying too little' — and build content around defending it. A clear point of view attracts the clients who agree with you (the ones who are a joy to work with) and repels the ones who'll fight you on everything, which is exactly the filtering a busy agency owner needs.",
        time_required: "15 min",
        carouselabs_tip:
          "CarouseLabs helps you develop and vary content around your core point of view, so your feed argues for a philosophy instead of listing deliverables.",
      },
      {
        step_number: 3,
        title: "Write hooks that call out your ideal client's pain",
        description:
          "The clients you want are quietly frustrated with something — an underperforming channel, a previous agency that ghosted them, results that never materialized. Your hooks should name that frustration precisely: 'If your last agency sent reports but no results, this is why.' Speaking directly to the pain of a specific buyer makes the right prospect feel understood before they ever book a call, which is when agency sales actually get easy.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that speak to your ideal client's specific frustrations, so your posts pre-qualify prospects before they reach your inbox.",
      },
      {
        step_number: 4,
        title: "Build a teaching carousel that shows your thinking",
        description:
          "Prospects want to see how you think before they trust you with a budget. Take one part of your process and teach it openly: the audit you run, the framework you use to prioritize, the mistake you fix on every new account. Structure it as hook, common mistake, your method, the step-by-step, and result. Giving away your thinking doesn't lose you clients — it wins the ones who realize they'd rather hire the expert than DIY it badly.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full process-teaching carousel from your notes, so demonstrating your expertise doesn't require a spare afternoon your delivery team needs.",
      },
      {
        step_number: 5,
        title: "Make the owner the face, not the logo",
        description:
          "People trust and follow founders, not agency brand accounts. Post from your personal profile and let your perspective, opinions, and even face lead the content. Prospects want to know who's steering the ship, and talent wants to work for a leader they admire. An agency owner who shows up personally builds an inbound engine that a faceless company page never will — and it doubles as your recruiting magnet.",
        time_required: "ongoing mindset shift",
        carouselabs_tip:
          "CarouseLabs writes in your personal founder voice, so the content that builds your agency's reputation sounds like you rather than a corporate account.",
      },
      {
        step_number: 6,
        title: "Systematize content so delivery doesn't kill it",
        description:
          "The classic agency trap: you're so busy delivering for clients that you neglect marketing your own agency, and then referrals slow. Treat your content like a client account — batch a week in one session, schedule it, and protect that time. When your own pipeline runs on a system instead of spare moments, you stop the feast-or-famine cycle that forces you to take on bad-fit clients just to fill the gap.",
        time_required: "75 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week of agency content at once, so marketing your own shop finally runs like the systems you build for clients.",
      },
      {
        step_number: 7,
        title: "Keep a recognizable, premium visual identity",
        description:
          "Your feed is a live sample of your agency's work — if it looks scrappy, prospects assume your deliverables will too. Lock in a polished, consistent template with your colors and style, and apply it to every carousel. A cohesive, high-quality visual identity signals the exact competence clients are paying a premium for, and it makes your posts instantly recognizable in a crowded feed of interchangeable agencies.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one branded reference and CarouseLabs matches your agency's colors and style on every carousel, so your feed looks like the premium work you sell.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, agency owners lived the cobbler's-children problem: you produced brilliant content for clients while your own feed went silent for months. Delivery always came first, so marketing the agency happened only in the panic between projects — which meant a feast-or-famine pipeline and taking on bad-fit clients just to cover the gap. Your best proof, the client results you generated every week, never became content because writing a case study was one more job nobody had time for. And when you did post, it was generic 'services we offer' content from a faceless brand page, indistinguishable from every other agency and building trust with no one.",
    after_carouselabs:
      "With CarouseLabs, your agency finally markets itself as well as it markets its clients. A recent client win becomes a proof-driven carousel in minutes. Your sharp point of view runs through a feed that attracts dream clients and filters out the nightmares. Because you batch a week of content in one session and schedule it, your own pipeline runs on a system instead of spare moments — ending the feast-or-famine cycle. You post from your personal profile in your real voice, so prospects and future hires connect with the owner behind the work. The feed looks as premium as your deliverables, and inbound leads start arriving pre-sold on your thinking.",
    time_to_first_post:
      "About 20 minutes including onboarding — most agency owners turn a recent client win into their first carousel the same day.",
    quick_wins: [
      "Your first client-result carousel that acts as living proof for prospects instead of a case study nobody had time to write.",
      "A batched week of content scheduled in one session, ending the feast-or-famine cycle in your own pipeline.",
      "Your first inbound lead who books a call already sold on your point of view — the easiest sales conversation you'll have all month.",
    ],
  },
  "freelancers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Decide the one problem you want to be known for solving",
        description:
          "Freelancers who market themselves as generalists compete on price; those known for one thing command premium rates. Before posting, define the specific problem you solve for a specific client — 'I help SaaS companies fix onboarding emails,' not 'I'm a copywriter.' This clarity is what turns your profile into a magnet for exactly the clients who value that skill, and it's the foundation that lets you eventually charge more and cold-pitch less.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your posts anchored to your specialism, so your feed consistently signals the one thing you want inbound clients to hire you for.",
      },
      {
        step_number: 2,
        title: "Turn your project work into proof-of-skill posts",
        description:
          "Every project you deliver is potential content that demonstrates your ability better than any 'available for work' post. With client permission, capture the before-and-after, the problem you solved, the approach you took. Keep a swipe file of these as you go. Showing your actual work in action is the freelancer's most persuasive marketing — it lets prospects pre-judge your quality and reach out already convinced, instead of you chasing them.",
        time_required: "10 min per project",
        carouselabs_tip:
          "CarouseLabs turns a short description of a project into a polished proof-of-skill carousel, so your portfolio grows every time you finish a job.",
      },
      {
        step_number: 3,
        title: "Write hooks aimed at the client who can afford you",
        description:
          "The freelancers who escape the race-to-the-bottom write for premium buyers, not bargain hunters. Your hooks should signal expertise and speak to the stakes a serious client cares about: 'The onboarding mistake costing you 20% of new signups.' This attracts clients who value results over the cheapest rate — the ones worth working with. Cheap-hunting clients scroll past hooks that assume competence, which is exactly the filtering you want.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks pitched at high-value clients and the outcomes they care about, so your content attracts budgets, not bargain hunters.",
      },
      {
        step_number: 4,
        title: "Teach your craft in a value-first carousel",
        description:
          "The fastest way for a freelancer to build authority is to teach the very skill they sell. Take one technique and break it down: the hook, the mistake most people make, why it matters, your method, and a worked example. Freelancers worry that teaching gives away the goods, but it does the opposite — it proves you're the expert and makes DIY-ers realize they'd rather hire you than fumble it. Authority is what lets you raise rates.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full teaching carousel from one technique, so establishing authority doesn't eat the hours you need for billable work.",
      },
      {
        step_number: 5,
        title: "Share the freelance-life posts that build connection",
        description:
          "Beyond proving skill, you need people to like you — clients hire freelancers they'd enjoy working with. Occasionally share the honest side of the freelance journey: setting a boundary, firing a bad client, the lesson that changed how you work. These relatable posts build the human connection that turns a follower into a referral. It's the personality behind the portfolio that makes someone choose you over an equally-skilled stranger.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs mixes freelance-journey angles into your idea feed, so your feed shows the person behind the portfolio without you planning it.",
      },
      {
        step_number: 6,
        title: "Batch content so marketing survives busy project weeks",
        description:
          "The freelancer's boom-bust cycle comes from stopping all marketing the moment a big project lands — then scrambling for work when it ends. Break it by batching a week of posts in one session and scheduling them. When your visibility runs in the background, prospects keep finding you even while you're heads-down, so your next project is lined up before the current one wraps. That's how freelancers finally smooth out the income roller coaster.",
        time_required: "60 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a full week at once, so a big project no longer means a marketing blackout and a scramble for work next month.",
      },
      {
        step_number: 7,
        title: "Look like a professional, not a hobbyist",
        description:
          "Prospects judge quality by your feed, so a scrappy, inconsistent look undercuts the premium rates you're chasing. Lock in a clean, consistent visual style — your colors, a simple template, your headshot — and use it everywhere. A polished, recognizable feed signals that you take your craft seriously, which reassures the exact high-value client who's deciding whether you're worth their budget. Consistency reads as reliability, and reliability is what freelance clients pay for.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference image and CarouseLabs keeps every carousel visually consistent, so your feed looks like a professional, not a side project.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, freelancing meant riding an income roller coaster driven by inconsistent marketing. When a project landed, you went heads-down and stopped posting entirely; when it ended, you scrambled to cold-pitch and lowball just to fill the gap. You knew a visible personal brand would bring inbound work and let you raise rates, but between billable hours there was never time to write, design, and post. Your finished projects — the strongest proof of your skill — never became content, so you competed on price against a global pool of strangers instead of on the authority that lets a freelancer charge what they're worth.",
    after_carouselabs:
      "With CarouseLabs, your freelance marketing finally runs without stealing billable hours. A finished project becomes a proof-of-skill carousel that grows your portfolio. A single technique becomes a teaching post that builds the authority to raise your rates. Because you batch a week of content in one session and schedule it, your visibility keeps working during heads-down project weeks — so your next client is lined up before the current job ends. The income roller coaster smooths out, cold-pitching fades, and prospects start reaching out already convinced by the expert they've been watching in their feed.",
    time_to_first_post:
      "About 20 minutes including onboarding — most freelancers turn a recent project into their first proof-of-skill carousel the same day.",
    quick_wins: [
      "Your first proof-of-skill carousel from a real project — portfolio content that markets you without a cold pitch.",
      "A batched week of posts scheduled in one sitting, so marketing keeps running through your busiest project week.",
      "Your first inbound message from a client who found you through a post — the beginning of the end of the income roller coaster.",
    ],
  },
  "ecommerce-founders": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Decide whether you're building a brand or a founder story",
        description:
          "Ecommerce founders get two content engines: the brand's story and their own. On LinkedIn, the founder story wins — B2B audiences, potential retail partners, and investors follow people, not product pages. Decide to put your face and journey forward: why you started, what you're learning, the messy reality of building a physical-product business. This personal angle is what makes your ecommerce content stand out in a feed that assumes DTC lives only on Instagram.",
        time_required: "15 min, once",
        carouselabs_tip:
          "CarouseLabs helps you frame content around your founder journey, so your ecommerce story reads as a person building a brand rather than a product ad.",
      },
      {
        step_number: 2,
        title: "Turn the operational reality into content gold",
        description:
          "The parts of ecommerce nobody sees — sourcing a supplier, a shipping disaster, a packaging redesign, a margin you got wrong — are exactly what other founders and partners find fascinating. Keep a log of the week's operational moments. This behind-the-scenes reality is your unfair content advantage, because polished brand accounts can't share it and pure influencers don't have it. The mess is the story that builds you a following of people rooting for the brand.",
        time_required: "5 min a day",
        carouselabs_tip:
          "CarouseLabs turns a rough note about a supplier issue or packaging change into a behind-the-brand carousel, so the operational grind becomes shareable.",
      },
      {
        step_number: 3,
        title: "Write hooks around numbers and hard decisions",
        description:
          "Ecommerce runs on numbers, and specific numbers stop the scroll: 'We had a 3% return rate until we changed one product photo.' Lead with the metric that moved or the counterintuitive decision you made (killing a bestseller, raising prices, dropping a marketplace). These hooks work because they promise a real, transferable lesson about running a product business — the kind other founders save and share, which is how your reach compounds.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs turns your rough metric and decision into number-led hooks, so your ecommerce lessons open with the specific detail that stops the scroll.",
      },
      {
        step_number: 4,
        title: "Build a lessons-learned carousel from one decision",
        description:
          "The carousel that performs walks through a real decision: the situation, what you assumed, what you tried, the result, and what you'd do differently. Take one choice from building your store — a marketing channel, a fulfillment change, a pricing test — and document it honestly. This teaches the audience while proving you actually operate the business, which is what earns credibility with the partners, wholesale buyers, and investors watching your feed.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full lessons-learned carousel from your decision, arranging it into a story arc instead of a flat recap.",
      },
      {
        step_number: 5,
        title: "Show the product without sounding like an ad",
        description:
          "You do want your product seen, but a LinkedIn feed of product shots gets ignored. The move is to feature the product inside a story — the customer problem it solves, the design choice behind it, the review that surprised you. When the product appears as the payoff to a genuine story rather than the subject of an ad, people actually engage, and they remember the brand when they're ready to buy or partner.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs weaves your product naturally into story-led posts, so it gets seen without your feed reading like a catalogue.",
      },
      {
        step_number: 6,
        title: "Batch content so it survives launch and fulfillment chaos",
        description:
          "Ecommerce runs on brutal cycles — launches, restocks, holiday crunch — and content is the first casualty when operations spike. Batch a week of posts in one session and schedule them so your feed stays alive through the chaos. Consistency is what keeps the audience (and the partner and investor interest) warm between your big product moments, instead of resetting every time a shipment problem eats your week.",
        time_required: "60 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so a fulfillment crisis or launch crunch never means a silent feed.",
      },
      {
        step_number: 7,
        title: "Keep a brand-consistent look across every post",
        description:
          "As a product founder, visual quality is your credibility — a scrappy feed undercuts the premium brand you're building. Lock in your brand colors and a clean template so every carousel reinforces the brand identity. Consistency here does double duty: it strengthens brand recognition and it signals to wholesale buyers and investors that you understand brand-building, which is exactly the competence they're evaluating when they look at an ecommerce founder.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload your brand reference and CarouseLabs matches your colors and style on every carousel, so your LinkedIn feed reinforces the brand you've built.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, ecommerce founders assumed LinkedIn wasn't for them — content lived on Instagram, and the operational grind left zero time to write anyway. So the fascinating reality of building a product brand — the supplier drama, the margin lessons, the packaging redesigns — stayed invisible to the exact audience of retail partners, wholesale buyers, and investors who hang out on LinkedIn. When you did try to post, it came out as a flat product shot that got ignored, because turning a warehouse fire or a pricing test into a compelling story took a skill and a spare hour you didn't have. Every launch reset your visibility to zero.",
    after_carouselabs:
      "With CarouseLabs, the messy reality of building your brand becomes your biggest content advantage. A supplier issue becomes a behind-the-brand carousel. A pricing test becomes a numbers-led lessons post that other founders save. Your product shows up woven into real stories instead of as ignored ads. Because you batch a week and schedule it, your feed survives launch crunches and fulfillment chaos instead of going dark. Your founder journey reaches the retail partners, wholesale buyers, and investors who live on LinkedIn — and the brand you've built finally looks as considered on your feed as it does on your shelf.",
    time_to_first_post:
      "About 20 minutes including onboarding — most ecommerce founders turn a recent operational lesson into their first carousel the same day.",
    quick_wins: [
      "Your first behind-the-brand carousel that turns the operational grind into content partners and investors actually want to follow.",
      "A batched week of posts scheduled in one sitting, so your feed survives your next launch or restock crunch.",
      "Your first inbound message from a wholesale buyer or partner who discovered the brand through your founder story.",
    ],
  },
  "product-managers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Decide what you want your PM reputation to be",
        description:
          "Unlike a founder, you're not selling a product — you're building a professional reputation that leads to better roles, speaking slots, and influence. Decide the PM identity you want to own: the discovery expert, the prioritization thinker, the stakeholder-management pro. Anchoring your content to one facet of product management makes you the name people think of for that thing, which is what turns a LinkedIn presence into career opportunities rather than a random collection of hot takes.",
        time_required: "15 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content anchored to your chosen PM specialism, so your feed builds a focused reputation instead of scattered opinions.",
      },
      {
        step_number: 2,
        title: "Turn your everyday PM decisions into teaching material",
        description:
          "Every prioritization call, killed feature, and messy stakeholder negotiation you handle this week is content other PMs want. Keep a log of the real product decisions you make and the reasoning behind them. These lived examples are far more valuable than recycled framework posts, because early-career PMs and hiring managers alike want to see how a real practitioner actually thinks — not another summary of a book they've already read.",
        time_required: "5 min a day",
        carouselabs_tip:
          "CarouseLabs turns a short note about a real product decision into a teaching post, so your daily PM work becomes career-building content.",
      },
      {
        step_number: 3,
        title: "Write hooks around the tensions every PM feels",
        description:
          "PM content resonates when it names a tension the reader is living: 'Stakeholders wanted 10 features. We shipped 2. Here's how I chose.' The strongest hooks surface the hard trade-offs — scope vs deadline, data vs intuition, saying no to your CEO. These land because every PM recognizes the struggle instantly, and recognition is what earns the follow. Avoid generic 'what is an MVP' hooks; lead with the specific, uncomfortable reality.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks around the real tensions of product work, so your posts open with a struggle other PMs feel rather than a textbook definition.",
      },
      {
        step_number: 4,
        title: "Build a framework carousel grounded in a real story",
        description:
          "PMs love a good framework, but the ones that travel are attached to a real example. Take a decision you made, extract the repeatable framework behind it, and structure the carousel as: the situation, the naive approach, your framework, how you applied it, and the outcome. Grounding the framework in a story you actually lived makes it credible and memorable — and positions you as a practitioner-thinker, exactly the profile that gets promoted and headhunted.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full framework carousel from your real story, so your reusable model comes with the credibility of a lived example.",
      },
      {
        step_number: 5,
        title: "Share the failures other PMs are afraid to admit",
        description:
          "The feature that flopped, the launch that missed, the user research you ignored and regretted — these vulnerable posts build more authority than any win, because they prove you have the judgment that only comes from being wrong and learning. Product management is a craft of imperfect decisions under uncertainty; showing you can reflect honestly on a miss is the exact maturity hiring managers and teams look for in senior PMs.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape a product failure into a reflective lesson that reads as senior judgment rather than an admission of weakness.",
      },
      {
        step_number: 6,
        title: "Post consistently without it eating your sprint",
        description:
          "PMs are perpetually context-switching, so content is easy to drop. Batch a week of posts in one session so your presence stays consistent through crunch weeks and launches. A PM who shows up reliably in the feed builds compounding reputation — the kind that means recruiters DM you and conference organizers invite you — while the one who posts sporadically stays invisible. Consistency, not intensity, is what turns LinkedIn into a career asset.",
        time_required: "60 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week of PM content at once, so a heavy sprint or launch week doesn't knock your reputation-building off track.",
      },
      {
        step_number: 7,
        title: "Present ideas cleanly with a consistent visual style",
        description:
          "PMs communicate complex ideas for a living, and your carousels should show that skill. A clean, consistent visual template makes your frameworks easy to follow and your feed instantly recognizable. This isn't vanity — clear communication of complex thinking is literally the PM job, so a polished, legible feed doubles as a live demonstration of the exact competence you're trying to be known for.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clean and consistent, so your frameworks read as clearly as the thinking behind them.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, building a PM reputation on LinkedIn was a nice idea you never had time to execute. Between discovery, sprints, stakeholder meetings, and launches, writing a thoughtful post always lost to the next fire. So the real product decisions you made every week — the exact material that would mark you as a sharp practitioner — stayed locked in Jira and Slack. When you did post, you fell back on recycled framework summaries that sounded like everyone else's, building no distinct reputation at all. Meanwhile the promotions, speaking invites, and recruiter DMs went to PMs who'd figured out how to be visible, even when their actual work was no better than yours.",
    after_carouselabs:
      "With CarouseLabs, your everyday product decisions become the content that builds your career. A prioritization call becomes a teaching post; a framework you actually use becomes a credible carousel grounded in a real story; a flopped feature becomes a reflection that reads as senior judgment. Because you batch a week in one session, your presence stays consistent through crunch and launch weeks, and consistency is what compounds into reputation. Your feed becomes a live demonstration of how you think — clear, practitioner-grounded, distinct — which is exactly what earns the promotions, speaking slots, and recruiter DMs you used to watch go to louder, not better, PMs.",
    time_to_first_post:
      "About 20 minutes including onboarding — most PMs turn a real decision from their week into their first teaching carousel the same day.",
    quick_wins: [
      "Your first framework carousel grounded in a real decision — the kind of post that marks you as a practitioner, not a book-summarizer.",
      "A batched week of PM content scheduled in one sitting, so your reputation-building survives your next launch crunch.",
      "Your first recruiter or peer DM referencing a post — proof your feed is becoming a genuine career asset.",
    ],
  },
  "ceos-executives": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define the leadership message only you can deliver",
        description:
          "As a CEO or executive, your content isn't about your company's features — it's about your point of view on the industry, leadership, and where things are heading. Decide the message you're uniquely positioned to carry: the shift you see coming, the leadership philosophy you live by, the contrarian bet you're making. This executive voice is what attracts talent, investors, and partners — people follow leaders with conviction, not officials reciting the company line.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs helps you develop content around your executive point of view, so your feed carries a leader's conviction rather than a press release.",
      },
      {
        step_number: 2,
        title: "Mine your real leadership moments for stories",
        description:
          "Your hardest decisions are your best content: the layoff you agonized over, the pivot you championed, the hire that transformed the team, the mistake you owned publicly. Keep a private note of these leadership moments as they happen. Executives who share the real weight of the chair — not just the wins — build a following of people who trust their judgment, which is the currency that recruits senior talent and reassures investors.",
        time_required: "5 min a day",
        carouselabs_tip:
          "CarouseLabs turns a short note about a leadership decision into a story-led post, so the weight of the chair becomes content that builds trust.",
      },
      {
        step_number: 3,
        title: "Write hooks that lead with conviction or vulnerability",
        description:
          "Executive hooks work when they either take a clear stand ('We stopped doing annual reviews. Here's why') or show unexpected humanity ('I made the wrong call on our biggest hire. Here's what it taught me'). Both cut through the polished, say-nothing content most executives post. The stand attracts people who share your view; the vulnerability humanizes the title. Either way, you sound like a real leader worth following, not a cautious figurehead.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that lead with a clear stand or genuine vulnerability, so your posts sound like a leader with a spine, not a corporate account.",
      },
      {
        step_number: 4,
        title: "Build a carousel around a leadership lesson",
        description:
          "Structure your carousel around one hard-won lesson: the situation, the decision you faced, what you chose and why, the outcome, and the principle you'd pass on. Executives who teach from real experience — rather than abstract leadership platitudes — become the voices that shape how their industry thinks. This is the content that gets you board seats, keynote invitations, and the kind of inbound talent who says they joined because of something you wrote.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full leadership-lesson carousel from your experience, so your hard-won principle comes wrapped in the real story that makes it credible.",
      },
      {
        step_number: 5,
        title: "Champion your people and culture publicly",
        description:
          "Some of the most powerful executive content isn't about you — it's about your team's wins, your culture's values in action, a customer your people delighted. Sharing credit and spotlighting your culture makes you a leader people want to work for, and it turns your feed into a recruiting engine. In a market where senior talent is scarce, an executive who publicly champions their people has an edge no job posting can match.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you turn a team win or culture moment into a post that celebrates your people, so your feed doubles as a talent magnet.",
      },
      {
        step_number: 6,
        title: "Protect the time with a delegate-friendly system",
        description:
          "The number one executive objection is time, and it's real — your calendar is brutal. The solution isn't finding an hour a day; it's a system where you spend 20 focused minutes providing the raw thinking and the tool does the heavy lifting, batched for the week. Executives who treat content as a leveraged activity — high input, delegated production — stay visible without it competing with running the company. Consistency here compounds into influence that outlasts any single quarter.",
        time_required: "20 min for a week's raw input",
        carouselabs_tip:
          "CarouseLabs turns your brief raw thinking into a full week of polished posts, so staying visible costs you 20 minutes, not an hour a day.",
      },
      {
        step_number: 7,
        title: "Maintain an executive-caliber visual presence",
        description:
          "At your level, a sloppy feed is a credibility risk — partners, investors, and press are watching. A clean, consistent, professional visual identity across your carousels signals the same rigor you bring to the business. It's not about looking flashy; it's about looking considered, because a considered feed reinforces the impression of a considered leader. Lock in the template once and every future post carries that executive polish automatically.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel executive-clean and on-brand, so your feed matches the standard you set for the business.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, executive presence on LinkedIn was something you knew mattered but couldn't fit into a brutal calendar. The rare times you posted, it came out as cautious, polished corporate-speak that said nothing and moved no one — because either the comms team wrote it or you rushed it between meetings. The real leadership moments that would have built genuine trust — the hard decisions, the owned mistakes, the culture you were proud of — stayed private. Meanwhile talent, investors, and partners formed their impression of you from a bland, ghostwritten feed, and less capable leaders with a stronger voice were pulling the opportunities, hires, and attention that should have been yours.",
    after_carouselabs:
      "With CarouseLabs, executive content stops competing with running the company. You spend 20 focused minutes handing over your real thinking — a hard decision, a stand you're taking, a team win worth celebrating — and get back a week of polished, on-brand posts that sound like you with conviction. Your feed carries a leader's point of view instead of a press release, humanizes the title with real vulnerability, and champions your people so it doubles as a talent magnet. You stay consistently visible without finding an hour a day, and the influence compounds — into inbound talent, investor confidence, and the board seats and keynote invitations that follow a leader people actually trust.",
    time_to_first_post:
      "About 20 minutes including onboarding — most executives hand over one leadership moment and publish a polished first carousel the same day.",
    quick_wins: [
      "Your first leadership-lesson carousel that reads as genuine conviction instead of ghostwritten corporate-speak.",
      "A full week of executive posts produced from 20 minutes of your raw thinking — visibility without the calendar cost.",
      "Your first inbound message from senior talent who says they want to work with you because of something you wrote.",
    ],
  },
  "serial-entrepreneurs": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Use your track record as your unfair content advantage",
        description:
          "You've built and exited (or failed) before, and that history is a content goldmine most creators can't touch. Decide to mine it: the patterns you see across ventures, the mistakes you refuse to repeat, the frameworks you've earned. Positioning yourself as someone who's done it multiple times gives every post instant authority. Your job isn't to prove you're an expert — your ventures did that — it's to package the lessons in a way the next generation of founders can't stop reading.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs helps you turn your multi-venture experience into recurring content themes, so your track record becomes a consistent feed instead of an occasional anecdote.",
      },
      {
        step_number: 2,
        title: "Extract the cross-venture patterns worth teaching",
        description:
          "The unique value you offer is pattern recognition across businesses — what worked in venture one and failed in venture three, and why. Keep a running list of these patterns as they occur to you. This is content no first-time founder can produce, because it requires having lived multiple full cycles. Each pattern is a post that positions you as a mentor-level voice, attracting the founders, operators, and investors who want to learn from someone who's seen the whole arc more than once.",
        time_required: "10 min, weekly",
        carouselabs_tip:
          "CarouseLabs turns a one-line pattern you've noticed into a full teaching carousel, so your hard-won pattern recognition becomes shareable insight.",
      },
      {
        step_number: 3,
        title: "Write hooks that leverage your battle scars",
        description:
          "Your strongest hooks reference the specific ventures and stakes only you have: 'I've started 4 companies. This is the mistake I made in all of them.' The number and the honesty do the work — people trust a scarred veteran over a theory-only guru. Lead with the counterintuitive lesson your failures taught you, because those hooks promise wisdom that can only be earned, which is exactly what an aspiring founder wants to save and share.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that draw on your experience across ventures, so your posts open with earned authority instead of generic advice.",
      },
      {
        step_number: 4,
        title: "Build a lessons-across-ventures carousel",
        description:
          "Structure a carousel that only a serial entrepreneur could write: the same problem across different companies, how your response evolved, and the principle you finally landed on. Walk through venture one's naive mistake, venture two's overcorrection, and the balanced approach you now swear by. This arc is riveting because it shows real learning over time, and it cements you as the strategic voice founders return to when they're facing the decision you've already faced three times.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full multi-venture lessons carousel from your notes, structuring the evolution of your thinking into a story people follow.",
      },
      {
        step_number: 5,
        title: "Share the failures louder than the exits",
        description:
          "Serial entrepreneurs are tempted to lead with exits, but the failures are what build trust and reach — because everyone posts wins and almost no one dissects a loss with real honesty. Take a venture that didn't work and break down exactly what went wrong and what you'd do differently. This vulnerability, backed by your track record, is magnetic: it makes you the rare successful founder who's actually useful about the hard parts, not just the highlight reel.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape a failed venture into an honest, useful lesson, so your losses become your most credible and shareable content.",
      },
      {
        step_number: 6,
        title: "Stay consistent across whatever you're building now",
        description:
          "You're likely juggling your current venture and its chaos, so content slips. But your audience is an asset that compounds across all your future ventures — the following you build now is distribution for your next launch, next raise, next hire. Batch a week of posts in one session to keep that asset growing regardless of what your current company demands. Serial entrepreneurs who maintain an audience never start from zero on distribution again.",
        time_required: "60 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so building your durable personal audience doesn't get sacrificed to your current venture's chaos.",
      },
      {
        step_number: 7,
        title: "Keep a signature look that spans your ventures",
        description:
          "Because you'll build many things, your personal brand — not any single company brand — is the throughline. Lock in a consistent personal visual identity for your carousels so your content is recognizable no matter which venture you're currently running. This is the visual anchor that lets your audience follow you across companies, so each new venture inherits the trust and recognition you've been compounding, rather than launching into silence.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one personal reference and CarouseLabs keeps your carousels consistently yours across every venture you build.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, serial entrepreneurs sat on the most valuable content library imaginable and never published it. You'd lived multiple full company cycles — the patterns, the failures, the hard-won frameworks — but each new venture consumed you completely, so the lessons stayed in your head. When a launch or raise came, you'd realize with frustration that you had no audience, no distribution, and had to start from cold outreach every single time. The occasional post you managed sounded like generic startup advice, wasting the one thing that set you apart: a track record no first-timer could match. Your experience was your edge, and it was invisible.",
    after_carouselabs:
      "With CarouseLabs, your multi-venture experience finally becomes the durable audience that follows you across every company. A cross-venture pattern becomes a teaching carousel; a failed venture becomes your most credible post; a hard-won framework becomes the content aspiring founders save and share. Because you batch a week in one session, your audience keeps compounding no matter what your current venture demands — so your next launch, raise, or hire starts with warm distribution instead of cold outreach. Your battle scars stop being invisible and start being the authority that makes you the strategic voice founders return to, venture after venture.",
    time_to_first_post:
      "About 20 minutes including onboarding — most serial entrepreneurs turn one cross-venture lesson into a first carousel the same day.",
    quick_wins: [
      "Your first lessons-across-ventures carousel — the kind of authority content no first-time founder can produce.",
      "A batched week of posts that keeps your durable audience growing regardless of your current venture's chaos.",
      "Your first sign that you're building distribution you'll own forever, not just for the company you're running today.",
    ],
  },
  "vcs-investors": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Decide what deal flow and reputation you want to attract",
        description:
          "For a VC, content is proprietary deal flow and brand. Before posting, decide who you want to attract: the specific kind of founder, the stage, the sector. Your content should signal exactly the entrepreneurs you want in your inbox. A partner known for sharp thinking on a particular market becomes the first call for founders in that space — which, in a business where the best deals are competitive, is the entire game. Clarity of focus is what turns a feed into a deal-sourcing engine.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content anchored to your thesis and target founders, so your feed consistently attracts the deal flow you actually want.",
      },
      {
        step_number: 2,
        title: "Turn your thesis and market views into content",
        description:
          "Founders want to pitch investors who clearly understand their space. Every market you're studying, every trend you're tracking, every thesis you're forming is content that proves you get it. Keep a note of the market observations you make each week. Sharing your genuine perspective on where a sector is heading is what makes a founder think 'this is the investor who understands what I'm building' before they've even met you — the warmest possible start to a deal.",
        time_required: "10 min, weekly",
        carouselabs_tip:
          "CarouseLabs turns a rough market observation into a polished thesis post, so the thinking you do anyway becomes founder-facing content.",
      },
      {
        step_number: 3,
        title: "Write hooks that offer founders real value",
        description:
          "The VCs who build a following give value to founders rather than lecturing them. Your hooks should promise something useful: 'The pitch deck slide that makes me pass in 10 seconds.' Founders devour tactical, honest investor insight because they can rarely get it directly. Leading with genuine value — pattern recognition from hundreds of pitches, honest fundraising advice — builds goodwill and reach, and positions you as an investor who's actually helpful, not just a gatekeeper.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates value-first hooks aimed at founders, so your posts give useful insight rather than sounding like a gatekeeper.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches founders something concrete",
        description:
          "Structure a carousel around one thing you wish every founder knew: how you actually evaluate a deal, what makes a metric credible, why you passed on a company that later blew up. Walk through your real reasoning step by step. Demystifying the investor's perspective is enormously valuable to founders and enormously good for your brand — it makes you the investor whose content founders share in their group chats, which is precisely where your next great deal is talking.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full founder-education carousel from your notes, turning your evaluation process into a resource founders save and pass around.",
      },
      {
        step_number: 5,
        title: "Champion your portfolio and the founders you back",
        description:
          "Some of your best content celebrates the founders you've invested in — their wins, their journeys, why you backed them. This does double duty: it supports your portfolio's visibility and hiring, and it signals to prospective founders that you're the kind of investor who shows up publicly for their team. Founders talk to each other about which investors add value; a VC who publicly champions their portfolio wins that word-of-mouth, which is the most valuable deal-flow channel there is.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you turn a portfolio win into a post that celebrates your founder, so your feed proves you're a value-add investor.",
      },
      {
        step_number: 6,
        title: "Stay consistent despite a packed pitch calendar",
        description:
          "Your days are full of pitches, board meetings, and diligence, so content easily slips — but a VC's brand compounds with consistency. Batch a week of posts in one session so your presence stays steady even during a heavy deal period. In a competitive market, the investor who's consistently visible and helpful gets the inbound; the one who posts sporadically stays a name founders forget. Reliability of presence is what turns your reputation into a moat.",
        time_required: "60 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your investor brand keeps compounding even through your busiest diligence weeks.",
      },
      {
        step_number: 7,
        title: "Present your thinking with a clean, credible look",
        description:
          "Your feed represents the judgment founders are trusting with their company and LPs are trusting with their capital. A clean, consistent, professional visual identity signals rigor and seriousness. It's not about flash — it's that a considered feed reinforces the impression of a considered investor. Lock in a template once so every thesis post and founder-education carousel carries the same credible polish automatically, matching the caliber of the decisions you make.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clean and credible, so your feed reflects the rigor founders and LPs expect.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, a VC's most valuable asset — perspective on markets and founders — mostly stayed private. Between pitches, board meetings, and diligence, writing thoughtful content lost every time, so the thesis work you did anyway never reached the founders forming their impression of you. When you did post, it read as gatekeeper-speak rather than genuine value, building no goodwill. Meanwhile the best deals went to the partners who'd built a public reputation for understanding a space, and founders chose their investors partly on visibility you didn't have. Your judgment was your product, and it was invisible to exactly the entrepreneurs you most wanted to reach.",
    after_carouselabs:
      "With CarouseLabs, your investor brand becomes a deal-flow engine. A market observation becomes a thesis post that makes founders think you understand their space before you've met. A pattern from hundreds of pitches becomes a value-first carousel founders share in their group chats. A portfolio win becomes proof you're a value-add investor. Because you batch a week in one session, your presence stays consistent through the busiest diligence periods, and consistency is what turns reputation into a moat. You become the first call for the founders you want — the entire game in a business where the best deals are competitive.",
    time_to_first_post:
      "About 20 minutes including onboarding — most investors turn a current market view into their first thesis carousel the same day.",
    quick_wins: [
      "Your first value-first carousel that gives founders real insight and positions you as helpful, not a gatekeeper.",
      "A batched week of thesis content that keeps your investor brand compounding through a heavy deal period.",
      "Your first warm inbound from a founder who says your content made them want you on their cap table.",
    ],
  },
  "angel-investors": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define your angle so founders know why to pitch you",
        description:
          "As an angel you're competing with funds and other angels for the best deals, and your edge is personal: your operating background, your network, your specific expertise. Decide the angle that makes you a must-have on a cap table — 'the angel who's scaled go-to-market' or 'the operator who knows fintech regulation.' Content built around that angle tells founders exactly why your check is worth more than someone else's, which is how angels win competitive rounds without the biggest wallet.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your specific angel angle, so founders instantly see the unique value your check brings.",
      },
      {
        step_number: 2,
        title: "Share the operator lessons behind your investing",
        description:
          "Most angels invest because they've built or operated something, and those experiences are your richest content. Keep a note of the operating lessons that inform how you evaluate startups — the go-to-market mistake you made, the hire that changed everything. Sharing these positions you as a value-add angel who brings more than money, and it attracts founders who specifically want a backer that's been in their shoes. Your operating past is the differentiator; content is how you make it visible.",
        time_required: "10 min, weekly",
        carouselabs_tip:
          "CarouseLabs turns an operating lesson into a post that connects your experience to how you help founders, proving you're more than a checkbook.",
      },
      {
        step_number: 3,
        title: "Write hooks that mix investor and operator credibility",
        description:
          "Your unique hook combines two perspectives founders rarely get in one person: 'I've raised angel money and written angel checks. Here's what the pitch deck should actually say.' Leading with your dual credibility — you've sat on both sides of the table — makes your advice uncommonly trustworthy. These hooks promise the kind of grounded, been-there insight that founders can't get from a pure investor or a pure operator, which is what earns the follow and the inbound.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that leverage your dual operator-and-investor perspective, so your posts offer insight founders can't find elsewhere.",
      },
      {
        step_number: 4,
        title: "Build a carousel demystifying angel investing",
        description:
          "Many founders don't understand how angels think, and many aspiring angels want to learn — both are your audience. Build a carousel that teaches one thing clearly: how you size a check, what makes you say yes, how you actually help post-investment. Walk through your real approach. This educational content builds your reputation on both sides — attracting founders who want you in their round and fellow angels who want to co-invest, growing the network that improves your own deal flow.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full angel-investing carousel from your notes, turning your approach into content that grows both your deal flow and your network.",
      },
      {
        step_number: 5,
        title: "Celebrate the founders and deals you believe in",
        description:
          "Publicly backing your founders — sharing why you invested, celebrating their milestones — is powerful angel content. It shows prospective founders that you're a supportive, visible backer rather than a passive check, and it strengthens your relationship with current portfolio companies. Founders compare notes on which angels actually show up; being the one who champions their people publicly earns the referrals that bring you into the best rounds you'd never otherwise see.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you turn a portfolio milestone into a supportive post, so your feed proves you're the kind of angel founders recommend to each other.",
      },
      {
        step_number: 6,
        title: "Keep posting even though angel investing is your side game",
        description:
          "For many angels, investing sits alongside a day job or a company you're running, so content is easy to deprioritize. But consistent visibility is what turns you from an unknown angel into one founders seek out. Batch a week of posts in one session so your presence holds despite everything else on your plate. The angels who stay visible see more deals, get invited into more rounds, and build the reputation that makes founders want their specific check.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so angel investing staying part-time doesn't mean your angel brand goes quiet.",
      },
      {
        step_number: 7,
        title: "Keep a personal, credible visual identity",
        description:
          "Your angel brand is personal — it's you, not a fund — so a consistent, professional visual identity ties your content together and makes it recognizable. A clean look signals that you take your investing seriously, reassuring founders that you're a considered backer rather than a hobbyist writing occasional checks. Set the template once and every operator-lesson post and angel-education carousel carries the same credible polish, reinforcing the reputation your angle depends on.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps your carousels consistently polished, so your personal angel brand looks as serious as your checks.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, being an angel investor meant competing for the best deals with nothing but a check that looked like everyone else's. Your real edge — the operating experience that made your money smart money — stayed invisible, because angel investing sat alongside a day job and content never made the cut. Founders had no way to know why your check was worth more than a fund's, so you saw fewer deals and got left out of competitive rounds. The operator lessons and dual-perspective insight that would have made you a magnet for founders sat unused, and your angel reputation never grew beyond the people you already knew.",
    after_carouselabs:
      "With CarouseLabs, your angel edge finally becomes visible. An operating lesson becomes a post proving you bring more than money; your dual operator-and-investor perspective becomes hooks founders can't get anywhere else; your approach becomes a carousel that grows both your deal flow and your co-investor network. Because you batch a week in one session, your angel brand stays alive even though investing is your side game. You become the angel founders specifically want on their cap table and recommend to each other — winning competitive rounds on the strength of your reputation rather than the size of your check.",
    time_to_first_post:
      "About 20 minutes including onboarding — most angels turn one operating lesson into their first carousel the same day.",
    quick_wins: [
      "Your first operator-lesson carousel that proves your check comes with value founders actually want.",
      "A batched week of content that keeps your angel brand visible despite your day job.",
      "Your first founder referral or warm intro sparked by content — a deal you'd never have seen otherwise.",
    ],
  },
  "fintech-founders": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Turn trust and compliance into your content angle",
        description:
          "Fintech lives or dies on trust, and content is where you build it before a prospect ever signs up. Decide to lead with the things that make fintech credible: security, transparency, how you handle the regulatory maze. In a category where users are rightly cautious about their money, a founder who explains openly how the product keeps them safe earns a trust advantage no feature list can. Your content angle isn't 'we're innovative' — it's 'here's why you can trust us.'",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs helps you frame content around trust, security, and transparency, so your fintech feed builds the credibility the category demands.",
      },
      {
        step_number: 2,
        title: "Translate regulatory and financial complexity into plain English",
        description:
          "Fintech is full of complexity — compliance, financial mechanics, security architecture — that most people find intimidating. Your superpower is making it understandable. Keep a note of the concepts you find yourself explaining to customers, investors, and journalists. Each one is a post that positions you as the fintech founder who demystifies money, which builds trust with users and marks you as a credible expert to the partners and regulators watching. Clarity in a confusing category is a genuine competitive edge.",
        time_required: "10 min, weekly",
        carouselabs_tip:
          "CarouseLabs turns a complex financial or regulatory concept into a plain-English carousel, so demystifying fintech doesn't take a writing session.",
      },
      {
        step_number: 3,
        title: "Write hooks around money problems people actually feel",
        description:
          "Fintech hooks land when they name a real financial pain: 'Why your business is losing money on every cross-border payment.' Leading with a concrete money problem your product solves grabs the exact person who feels it. Avoid abstract 'the future of finance' hooks — they attract other fintech people, not customers. Speaking directly to a felt financial frustration attracts users and, because the pain is universal, tends to spread well beyond your immediate audience.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks around the specific money problems your product solves, so your posts grab customers rather than fellow founders.",
      },
      {
        step_number: 4,
        title: "Build a trust-building carousel around how you protect users",
        description:
          "Structure a carousel that openly explains something users worry about: how their money is protected, how you handle their data, what happens if something goes wrong. Walk through it transparently and specifically. In fintech, this kind of radical transparency is disarming and rare — most companies hide behind jargon. A founder who explains the safeguards plainly converts cautious prospects into confident customers, and it builds the reputation that makes regulators and banking partners comfortable working with you.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full trust-and-safety carousel from your notes, turning your safeguards into transparent content that converts cautious users.",
      },
      {
        step_number: 5,
        title: "Share the founder journey through a regulated industry",
        description:
          "Building in a regulated space is uniquely hard, and the honest story of navigating it — the licensing marathon, the compliance surprises, the bank partnerships that took forever — is compelling content few can offer. Sharing these lessons builds a following of fellow founders, attracts operators who want to work in fintech, and signals resilience to investors who know how brutal the space is. Your regulatory battle scars aren't just obstacles; they're proof you can build where others can't.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs turns a regulatory or compliance war story into a post, so the hard parts of building fintech become content that builds your reputation.",
      },
      {
        step_number: 6,
        title: "Stay consistent while building a demanding product",
        description:
          "Fintech products are heavy — security, compliance, and reliability leave little slack — so content easily gets deprioritized. But trust compounds with consistent presence, and in fintech trust is the whole ballgame. Batch a week of posts in one session so your credibility-building never stops, even during a hard build cycle. The founder who consistently shows up explaining and reassuring builds a trust moat that a sporadic poster, however good the product, never matches.",
        time_required: "60 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so trust-building content keeps running even through a demanding fintech build cycle.",
      },
      {
        step_number: 7,
        title: "Present with the polish trust requires",
        description:
          "In fintech, a sloppy feed is a trust liability — people extrapolate from your content to how carefully you'll handle their money. A clean, consistent, professional visual identity reinforces the impression of a serious, secure operation. Lock in your template once so every plain-English explainer and trust carousel carries the same considered polish. In a category where perception of reliability directly affects conversion, a credible-looking feed is doing real work for you.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel polished and on-brand, so your feed signals the reliability fintech customers need to feel.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, fintech founders knew trust was everything and had no time to build it publicly. The product demanded everything — security, compliance, reliability — so content lost every week. The complex concepts you explained one-on-one to customers and investors never became the plain-English posts that could have built trust at scale. When you did post, it came out in jargon that reassured no one, or as 'future of finance' abstraction that attracted other founders instead of customers. Meanwhile users stayed cautious, partners stayed unconvinced, and the trust advantage that could have set you apart in a skeptical category went unbuilt.",
    after_carouselabs:
      "With CarouseLabs, trust-building finally runs alongside building the product. A complex compliance concept becomes a plain-English carousel that demystifies money. A real money problem becomes a hook that grabs customers, not fellow founders. Your safeguards become transparent content that converts cautious prospects into confident users. Because you batch a week in one session, your credibility-building never stops, even during a hard build cycle — and in fintech, consistent trust-building is a genuine moat. Your regulatory battle scars become proof you can build where others can't, and your feed carries the polish that makes customers, partners, and regulators comfortable with your name.",
    time_to_first_post:
      "About 20 minutes including onboarding — most fintech founders turn one plain-English explainer into their first carousel the same day.",
    quick_wins: [
      "Your first plain-English carousel that demystifies a financial concept and builds trust with cautious users.",
      "A batched week of trust-building content that survives your next heavy build cycle.",
      "Your first customer or partner who mentions your content made them feel safe choosing you — trust you can measure.",
    ],
  },
  "personal-finance-coaches": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Pick the money struggle you help people escape",
        description:
          "Personal finance is huge, and coaches who try to cover everything help no one. Decide the specific transformation you deliver — getting out of debt, building a first emergency fund, investing for beginners, money mindset. Anchoring to one struggle makes your content magnetic to the people living it, because they feel you understand their exact situation. In a space crowded with generic 'save more' advice, specificity is what turns a scroller into someone who books your program.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your chosen money transformation, so your feed speaks directly to the client you actually help.",
      },
      {
        step_number: 2,
        title: "Turn client breakthroughs into teaching stories",
        description:
          "Your clients' money wins — the debt paid off, the first $10K saved, the fear that finally lifted — are your most persuasive content, with permission and appropriate anonymity. Keep a note of these breakthroughs and, crucially, the mindset or habit shift behind each. Leading with the behavior change rather than just the number proves your coaching produces a repeatable process, which is exactly what a stressed, money-anxious prospect needs to believe before they'll trust you with their finances.",
        time_required: "10 min per client story",
        carouselabs_tip:
          "CarouseLabs turns a client's money breakthrough into a story-driven carousel, so your results become content without exposing anyone's private details.",
      },
      {
        step_number: 3,
        title: "Write hooks that meet money shame with empathy",
        description:
          "Money is emotional and shame-loaded, so hooks that shame the reader ('stop wasting money on coffee') repel your ideal client. The hooks that convert lead with empathy and permission: 'You're not bad with money. You were never taught this.' Reframing financial struggle as a lack of education rather than a character flaw is disarming and magnetic — it makes the anxious reader feel safe, which is the prerequisite to them ever letting a coach into their finances.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs drafts empathetic, shame-free hooks that reframe money struggles as solvable, so your content attracts anxious clients instead of scaring them off.",
      },
      {
        step_number: 4,
        title: "Build a step-by-step carousel that delivers a real win",
        description:
          "The finance carousel that grows an audience hands the reader an actual, doable step: how to build a starter emergency fund, how to attack debt in the right order, how to automate saving. Structure it clearly: the problem, why it feels impossible, your simple system, the steps, and the first small action. Giving away a genuine quick win builds trust fast, because when your free advice actually helps someone's money, they believe your paid coaching will change their life.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full step-by-step money carousel from your method, so your free advice is genuinely actionable and trust-building.",
      },
      {
        step_number: 5,
        title: "Address the money mindset, not just the math",
        description:
          "Personal finance is 20% math and 80% behavior, and the coaches who stand out talk about the emotional side: the fear, the avoidance, the family money stories people carry. Sharing content about money psychology differentiates you from the calculator-and-spreadsheet crowd and speaks to why people actually stay stuck. This is the content that makes a prospect think 'this coach gets that my money problem isn't really about money' — which is when they realize they need you, not another budgeting app.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs mixes money-mindset angles into your idea feed, so your content addresses the emotional side that keeps clients stuck, not just the math.",
      },
      {
        step_number: 6,
        title: "Post consistently to stay trusted during money decisions",
        description:
          "People make money decisions slowly and only with someone they've come to trust over time, so consistent presence is essential — the client who hires you in six months is watching you now. Batch a week of posts in one session so your feed keeps showing up in their moments of financial stress and resolve. Consistency is what keeps you top of mind for a decision people circle for months, turning a long-time follower into a paying client when they're finally ready.",
        time_required: "60 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so you stay present through the long window in which people slowly decide to fix their finances.",
      },
      {
        step_number: 7,
        title: "Look trustworthy and calm, not hype-y",
        description:
          "Finance attracts hype and scams, so your visual identity should signal the opposite: calm, clear, trustworthy. A clean, consistent look — no flashy Lamborghini energy — reassures the anxious reader that you're a steady guide, not a get-rich-quick pitch. In a space where people have been burned by financial gurus, a considered, professional feed is a trust signal that quietly sets you apart from the noise and makes cautious prospects comfortable.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps your carousels calm and consistent, so your feed reads as a trustworthy guide, not a finance-bro pitch.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, personal finance coaches struggled to be heard over a deafening feed of get-rich-quick gurus and shaming 'skip the latte' advice. You knew your empathetic, behavior-focused approach was what people actually needed, but between client sessions there was no time to create content, and turning nuanced money psychology into simple posts felt hard. So your best client breakthroughs stayed private, your calm and credible voice stayed quiet, and the anxious people who needed exactly your kind of help kept scrolling past the hype instead. You competed for attention with flashy scammers while doing the honest, transformative work — and losing the visibility battle.",
    after_carouselabs:
      "With CarouseLabs, your empathetic approach finally cuts through the finance noise. A client's debt-payoff breakthrough becomes a story-driven carousel; a money concept becomes an empathetic, shame-free hook that makes anxious readers feel safe; your method becomes a step-by-step carousel that hands people a real win. Because you batch a week in one session, you stay present through the long window in which people slowly decide to trust someone with their finances. Your calm, credible feed sets you apart from the hype-y gurus, and the money-mindset content proves you understand that their problem isn't really about math — which is exactly when they realize they need you.",
    time_to_first_post:
      "About 20 minutes including onboarding — most finance coaches turn one client breakthrough into a first carousel the same afternoon.",
    quick_wins: [
      "Your first empathetic, shame-free carousel that makes an anxious reader feel understood instead of judged.",
      "A batched week of content that keeps you visible through the long window people take to decide on a money coach.",
      "Your first discovery call from someone who says your content was the first finance advice that didn't make them feel ashamed.",
    ],
  },
  "business-coaches": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define the exact business owner you transform",
        description:
          "'Business coach' means nothing to a prospect; 'I help service businesses break through the six-figure ceiling' means everything. Decide the specific owner and the specific plateau you help them break. This precision is what separates you from the flood of generic business coaches, because a stuck owner needs to feel you understand their exact situation. The sharper your niche, the more your content reads like it was written for one person — which is what makes that person book a call.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your specific ideal client and their plateau, so your feed speaks to one owner instead of everyone.",
      },
      {
        step_number: 2,
        title: "Turn client transformations into proof-driven stories",
        description:
          "Your credibility rests on results, so your clients' business breakthroughs — the revenue jump, the freed-up time, the systemized team — are your most powerful content, with permission. Keep a note of these wins and the specific shift that caused each one. Leading with the mechanism, not just the outcome, proves you have a repeatable method rather than lucky clients. Proof is the currency of business coaching, because owners are (rightly) skeptical of coaches who can't show they've actually moved a business.",
        time_required: "10 min per client story",
        carouselabs_tip:
          "CarouseLabs turns a client's business win into a proof-driven carousel, so your results become marketing that answers the skeptic's first question.",
      },
      {
        step_number: 3,
        title: "Write hooks around the owner's real frustrations",
        description:
          "Business owners are frustrated by specific things: working 60-hour weeks with no growth, a team that needs constant hand-holding, revenue that plateaued. Your hooks should name these precisely: 'You don't have a marketing problem. You have a positioning problem.' Calling out the real, often misdiagnosed frustration makes the owner feel seen and slightly provoked — the exact state that makes someone stop scrolling and think 'this coach might actually understand my business.'",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks around your ideal client's real business frustrations, so your posts feel like they're reading a stuck owner's mind.",
      },
      {
        step_number: 4,
        title: "Build a framework carousel that shows your method",
        description:
          "Business owners buy coaches with a clear methodology, so package your thinking into a framework and teach it. Structure the carousel: the problem owners face, why the obvious fix fails, your framework, how to apply it, and the result it produces. Giving away the framework doesn't lose clients — it proves you have a system worth paying for and attracts the owners who realize they need guided implementation, not just the concept. A named method is what turns a generalist coach into an authority.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full framework carousel from your method, so your coaching approach becomes a named system prospects can see and trust.",
      },
      {
        step_number: 5,
        title: "Challenge the conventional wisdom owners believe",
        description:
          "The business coaches who stand out have a point of view that gently disagrees with what owners assume — 'hustle harder' is wrong, 'more leads' isn't your problem, hiring won't fix a broken system. Sharing these contrarian-but-true takes positions you as a strategic thinker rather than a cheerleader, and it sparks the debate in comments that LinkedIn's algorithm loves. A coach with a real philosophy attracts owners who are tired of generic advice and ready for someone who'll challenge them.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape a contrarian-but-true business take into a post, so your feed positions you as a strategic voice, not a motivational one.",
      },
      {
        step_number: 6,
        title: "Stay consistent so you're there at the decision moment",
        description:
          "Owners decide to hire a coach at a moment of frustration or ambition that you can't predict, so you need to be consistently visible for that moment to land on you. Batch a week of posts in one session to maintain presence even when your own coaching calendar is full. Consistency is what keeps you top of mind, so when an owner finally hits the wall and decides to get help, you're the coach they've been watching — and the obvious call.",
        time_required: "60 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your visibility holds even during your busiest coaching weeks and you're there at the decision moment.",
      },
      {
        step_number: 7,
        title: "Project the authority your fees require",
        description:
          "Business coaching commands premium fees, and your feed has to look like it. A polished, consistent visual identity signals the professionalism and authority that justify your rates — a scrappy feed quietly undercuts your pricing. Lock in your template once so every proof carousel and framework post carries the same premium, credible look. When an owner is deciding whether you're worth a serious investment, a considered feed is a silent argument in your favor.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel premium and consistent, so your feed matches the fees your coaching commands.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, business coaches drowned in a sea of identical 'business coach' profiles all posting the same motivational quotes. You had a real methodology and genuine client results, but between coaching calls there was no time to turn them into content, so your proof stayed private and your feed looked as generic as everyone else's. The stuck owners who needed exactly your approach couldn't tell you apart from the cheerleaders, and when they finally decided to hire a coach, you weren't top of mind because you'd gone quiet during your busy weeks. Your expertise was real; your visibility was accidental, and it cost you the clients you were most equipped to help.",
    after_carouselabs:
      "With CarouseLabs, your coaching authority finally shows. A client's revenue breakthrough becomes a proof-driven carousel that answers the skeptic's first question. Your method becomes a named framework prospects can see and trust. A contrarian-but-true take positions you as a strategic thinker, not a cheerleader. Because you batch a week in one session, you stay visible even when your calendar is full — so you're the coach an owner has been watching when they finally hit the wall and decide to get help. Your premium feed matches your premium fees, and the generic-coach crowd stops being your competition because you clearly do something they don't.",
    time_to_first_post:
      "About 20 minutes including onboarding — most business coaches turn one client transformation into a first carousel the same day.",
    quick_wins: [
      "Your first proof-driven carousel that separates you from the generic 'business coach' crowd.",
      "A named framework post that turns your method into something prospects can see, trust, and want.",
      "Your first discovery call from an owner who says your content made them feel you understood their exact situation.",
    ],
  },
  "life-coaches": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Get specific about the life change you guide",
        description:
          "'Life coach' triggers skepticism precisely because it's vague. Decide the concrete transformation you help with — navigating a career change, rebuilding confidence after a setback, breaking a stuck pattern. Specificity does two things: it defuses the 'what does a life coach even do' doubt, and it makes the right person feel you're speaking to their exact situation. A focused promise is what turns an intangible service into something a prospect can actually picture themselves buying.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on the specific life change you guide, so your feed answers the 'what do you actually do' question by showing it.",
      },
      {
        step_number: 2,
        title: "Turn client breakthroughs into relatable stories",
        description:
          "Life coaching results are internal — confidence, clarity, a decision finally made — which makes storytelling your most important skill. With permission and care, share the arc of a client's breakthrough: where they were stuck, the shift that unlocked them, where they are now. These stories make the intangible tangible, letting a prospect see themselves in the transformation. Because life coaching is bought on emotional resonance, a well-told client story does more than any list of your credentials.",
        time_required: "10 min per client story",
        carouselabs_tip:
          "CarouseLabs turns a client's inner breakthrough into a relatable story carousel, so your intangible results become something prospects can feel.",
      },
      {
        step_number: 3,
        title: "Write hooks that name the feeling people can't articulate",
        description:
          "Your ideal client often feels stuck without the words for it. The hooks that land put language to that feeling: 'You're not lazy. You're overwhelmed and calling it laziness.' Naming the unnamed feeling creates an instant jolt of recognition — 'how did they know?' — which is the strongest possible reason to stop scrolling and follow. This precision about inner experience is what distinguishes a real coach from generic positivity, and it's magnetic to someone quietly struggling.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that put words to what your clients feel but can't articulate, so your posts create that 'how did they know' moment.",
      },
      {
        step_number: 4,
        title: "Build a carousel that gives a real mindset tool",
        description:
          "Life coaching content earns trust when it hands over an actual, usable tool rather than a platitude. Take one exercise or reframe you use with clients and teach it: the situation it helps, why we default to the wrong response, the tool, how to apply it, and what shifts. Giving away a genuine mental tool proves your coaching has substance and produces a small real change — and when your free advice actually helps someone feel different, they trust that your paid work can change their life.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full mindset-tool carousel from your exercise, so your free content delivers a real shift, not a motivational poster.",
      },
      {
        step_number: 5,
        title: "Be human and vulnerable, not relentlessly positive",
        description:
          "The life coaches people trust are the ones who show their own humanity — the struggle they overcame, the ongoing work, the imperfect reality behind the coaching. Relentless positivity reads as fake and repels the very people in pain who need you. Sharing your own honest journey makes you relatable and credible, and it models the self-compassion you teach. In a space full of toxic positivity, authentic vulnerability is the differentiator that builds real connection.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape your own honest experience into a vulnerable post, so your feed builds trust through humanity rather than hollow positivity.",
      },
      {
        step_number: 6,
        title: "Stay present for the slow, emotional decision to get help",
        description:
          "People decide to hire a life coach slowly, often circling for months until a moment of readiness or pain tips them over. You need to be consistently there for that moment. Batch a week of posts in one session so your feed keeps showing up as they move toward the decision. Consistency builds the familiarity and trust that a deeply personal purchase requires — so when they're finally ready to invest in themselves, you're the coach they already feel they know.",
        time_required: "60 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so you stay present through the long, emotional window in which someone decides to hire a coach.",
      },
      {
        step_number: 7,
        title: "Create a warm, calming visual presence",
        description:
          "Your visual identity should feel like the safe, calming space your coaching provides. A consistent, warm, uncluttered look reassures an emotionally-cautious prospect that you're a grounded, trustworthy guide. In a field where prospects are wary of both scammers and toxic positivity, a considered, calm feed is itself a trust signal. Set the template once so every client-story and mindset-tool carousel carries the same reassuring warmth, reinforcing the emotional safety people are really shopping for.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps your carousels warm and consistent, so your feed feels like the safe space your coaching offers.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, life coaches fought an uphill battle against skepticism with almost no time to win it. You knew your work changed lives, but 'life coach' triggered doubt, and turning internal, emotional transformations into compelling content was genuinely hard. Between client sessions there was no space to write, so your best breakthroughs stayed private and your feed defaulted to the generic inspirational quotes that make people trust life coaches less, not more. The quietly struggling people who needed exactly your guidance couldn't tell you apart from the toxic-positivity crowd, and your authentic, substantive coaching stayed invisible behind a wall of vague optimism.",
    after_carouselabs:
      "With CarouseLabs, the depth of your coaching finally comes through. A client's inner breakthrough becomes a relatable story that makes the intangible tangible. A feeling your client can't name becomes a hook that creates instant recognition. A real exercise becomes a mindset-tool carousel that delivers an actual shift. Because you batch a week in one session, you stay present through the long, emotional window in which someone decides to invest in themselves. Your vulnerability and substance set you apart from the toxic-positivity crowd, and your warm, consistent feed becomes the safe space that makes a cautious prospect finally feel ready to reach out.",
    time_to_first_post:
      "About 20 minutes including onboarding — most life coaches turn one client breakthrough into a first carousel the same afternoon.",
    quick_wins: [
      "Your first client-story carousel that makes your intangible results feel real and achievable to a prospect.",
      "A mindset-tool post that delivers a genuine shift and proves your coaching has substance.",
      "Your first inbound message from someone who says a post named exactly what they'd been feeling.",
    ],
  },
  "executive-coaches": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Position around the leadership problem you solve",
        description:
          "Executive coaching is a premium, credibility-heavy purchase, so vague positioning kills it. Decide the specific leadership challenge you solve — new executives finding their footing, leaders who micromanage, founders scaling into CEOs. This precision signals that you understand the nuanced world of senior leadership, which is exactly what a discerning executive buyer needs before they'll trust you with their growth. A sharp focus is what elevates you from 'another coach' to a specialist worth an executive's rate.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on the specific leadership challenge you solve, so your feed reads as a specialist, not a generalist.",
      },
      {
        step_number: 2,
        title: "Share insight from the executive challenges you see",
        description:
          "You sit inside the confidential struggles of senior leaders — the isolation, the imposter feelings, the hard people decisions — and that vantage point is content no one else has. Anonymized and with care, share the patterns you see in the executive experience. This positions you as someone who truly understands the top of the org chart, which is deeply reassuring to an executive considering coaching. Your privileged view of what leaders actually wrestle with is your most differentiated content asset.",
        time_required: "10 min, weekly",
        carouselabs_tip:
          "CarouseLabs turns an anonymized pattern you see in executives into an insight post, so your privileged vantage point becomes credibility-building content.",
      },
      {
        step_number: 3,
        title: "Write hooks that speak to the loneliness of leadership",
        description:
          "Executive hooks land when they name the private realities of senior roles: 'The higher you rise, the less honest feedback you get. Here's the danger.' Speaking to the isolation, the pressure, and the things executives can't say out loud creates instant resonance with a leader who feels those things and assumes no one understands. This precision about the executive experience is what makes a senior buyer think 'this coach gets what it's actually like up here' — the start of trust.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that speak to the private realities of leadership, so your posts resonate with the executive who feels unseen.",
      },
      {
        step_number: 4,
        title: "Build a carousel around a leadership shift you facilitate",
        description:
          "Structure a carousel around one transformation you guide: from micromanager to delegator, from operator to strategist, from reactive to intentional. Walk through the old pattern, why smart leaders fall into it, the shift, and what changes when it lands. Teaching a genuine leadership evolution proves the depth of your work and gives executives a taste of the reframing you provide. This is the content that makes a senior leader recognize their own pattern and think 'I need this' — the essence of executive-coaching demand.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full leadership-shift carousel from your framework, so the transformation you facilitate becomes something executives can recognize in themselves.",
      },
      {
        step_number: 5,
        title: "Demonstrate thought leadership on how leadership is changing",
        description:
          "Executives respect coaches who are ahead of the curve, so share your perspective on where leadership itself is heading — remote leadership, leading across generations, the shift from authority to influence. Offering a considered point of view on the evolution of leadership positions you as a peer-level thinker rather than a service provider. This elevates your brand into the realm executives take seriously, and it attracts the forward-thinking leaders who make the best coaching clients.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape a point of view on the future of leadership into a post, so your feed reads as thought leadership, not just coaching promotion.",
      },
      {
        step_number: 6,
        title: "Stay consistently visible to a small, high-value audience",
        description:
          "Your buyers are few and discerning, and they decide slowly — often the executive who engages you has followed you quietly for a long time. Consistency matters more than volume here. Batch a week of posts in one session to maintain a steady, credible presence, so when a senior leader reaches the moment of seeking a coach, your name is the trusted one already in their mind. For a premium, relationship-driven service, sustained visibility is the whole strategy.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your credible presence stays steady for the small, high-value audience that decides slowly.",
      },
      {
        step_number: 7,
        title: "Match your visual polish to executive expectations",
        description:
          "Your audience operates in a world of high standards, and your feed has to meet them. A refined, consistent, understated visual identity signals the executive-caliber professionalism your buyers expect — anything scrappy undercuts your credibility with people who notice these things. Lock in a considered template once so every insight post and leadership-shift carousel carries the same polish. At this level, a feed that looks the part is a quiet but real factor in whether a senior leader takes you seriously.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel refined and consistent, so your feed meets the standards your executive audience expects.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, executive coaches struggled to build the visible credibility their premium buyers demand while spending their days in confidential sessions. The privileged insight you gained into the executive experience — the isolation, the patterns, the leadership shifts — stayed locked in your practice, never becoming the content that could prove your depth to prospective clients. Writing thoughtfully took time you didn't have, so you posted rarely and generically, building none of the peer-level authority senior leaders respect. The discerning executives who would have valued your specialized work had no way to discover that depth, and you competed for high-value clients from a position of near-invisibility.",
    after_carouselabs:
      "With CarouseLabs, the depth of your executive coaching becomes visible to the leaders who need it. An anonymized pattern becomes an insight post that proves you understand the top of the org chart. A leadership shift you facilitate becomes a carousel executives recognize in themselves. Your view on where leadership is heading becomes thought leadership that positions you as a peer, not a vendor. Because you batch a week in one session, your credible presence stays steady for the small, discerning audience that decides slowly — so when a senior leader seeks a coach, you're the trusted name already in their mind. Your refined feed meets their standards, and your specialized authority finally shows.",
    time_to_first_post:
      "About 20 minutes including onboarding — most executive coaches turn one leadership insight into a first carousel the same day.",
    quick_wins: [
      "Your first insight carousel that proves you understand the private realities of senior leadership.",
      "A leadership-shift post that makes an executive recognize their own pattern and think 'I need this.'",
      "Your first enquiry from a senior leader who says your content showed you truly understand the top of the org chart.",
    ],
  },
  "sales-coaches": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Anchor your content to a specific sales outcome",
        description:
          "Sales is measurable, so lead with the number you move: close rates, deal size, ramp time, cold-outreach reply rates. Decide the specific sales result you're known for and build content around it. Salespeople and sales leaders are ruthlessly outcome-focused — they don't want theory, they want the technique that lifts the metric. Anchoring to a concrete outcome makes your content instantly relevant to the reps and managers who'll eventually hire you to hit those exact numbers.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content anchored to a specific sales outcome, so your feed speaks to reps and leaders in the metrics they care about.",
      },
      {
        step_number: 2,
        title: "Turn real deals into teardown content",
        description:
          "The most valuable sales content dissects real deals — the objection that killed a deal, the reframe that saved one, the discovery question that changed everything. Keep a note of the sales situations you coach through each week. Reps devour tactical breakdowns of actual selling because it's directly applicable to their next call. These teardowns prove you know the craft at the rep level, not just the motivational level, which is what earns respect from a skeptical, been-pitched-to audience.",
        time_required: "10 min per teardown",
        carouselabs_tip:
          "CarouseLabs turns a real deal situation into a tactical teardown carousel, so your coaching becomes the applicable content reps actually save.",
      },
      {
        step_number: 3,
        title: "Write hooks that promise a tactical edge",
        description:
          "Salespeople stop scrolling for a competitive edge: 'The one discovery question that doubles my reps' close rate.' Your hooks should promise a specific, usable technique, not general motivation. Leading with a tactical, number-backed edge speaks to the rep's constant hunger to sell better and hit quota. Avoid 'believe in yourself' hooks — this audience is allergic to fluff and hungry for the concrete move that works on their next call. Specific and tactical wins every time.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates tactical, edge-promising hooks, so your posts grab a results-obsessed sales audience instead of getting scrolled past as fluff.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a repeatable technique",
        description:
          "Structure a carousel around one sales technique reps can use immediately: how to handle the price objection, how to run discovery, how to follow up without being annoying. Walk through the situation, the common mistake, your technique, the exact words, and the result. Giving away a genuinely usable method builds credibility fast, because when a rep tries your free technique and it works on a real call, they become a believer who wants your full coaching or brings you to their team.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full technique carousel from your method, so your coaching turns into a step-by-step reps can apply on their next call.",
      },
      {
        step_number: 5,
        title: "Challenge the outdated sales tactics reps were taught",
        description:
          "The sales world is full of aging playbooks — aggressive closing, manipulative scarcity, spray-and-pray outreach — and coaches who call them out stand out. Share your point of view on what modern selling actually requires and why the old tactics backfire. This positions you as a forward-thinking coach for reps tired of scripts that no longer work, and it sparks the debate that drives reach. A coach with a clear, modern philosophy attracts the teams looking to level up, not just hit harder.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape a modern-selling take into a post, so your feed positions you as a current coach, not a relic of old-school tactics.",
      },
      {
        step_number: 6,
        title: "Stay consistent to reach reps and buyers on their timeline",
        description:
          "Sales leaders bring in coaches at specific moments — a missed quarter, a new team, a scaling push — that you can't predict. Consistent visibility means you're top of mind when that moment hits. Batch a week of posts in one session to keep showing up for the reps sharing your content and the leaders quietly evaluating you. In a business built on timing, being the coach who's consistently present is what lands you on the shortlist when a team decides it needs help.",
        time_required: "60 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so you stay top of mind for the unpredictable moment a sales leader decides to bring in a coach.",
      },
      {
        step_number: 7,
        title: "Look sharp and credible, not gimmicky",
        description:
          "Sales attracts hype and gimmicks, so a clean, credible visual identity sets a serious coach apart. A consistent, professional look signals that you deliver real methodology, not motivational theatrics — which is what discerning sales leaders want when they're investing in their team. Lock in your template once so every teardown and technique carousel carries the same sharp, trustworthy polish. In a noisy space, looking substantive rather than gimmicky is a quiet advantage with the buyers who matter.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel sharp and consistent, so your feed reads as a credible methodology, not a hype act.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, sales coaches faced a results-obsessed audience with almost no time to prove their value publicly. You coached real techniques that moved real numbers, but between client sessions there was no time to turn them into content, so your tactical expertise stayed private and your feed defaulted to the motivational fluff this audience is allergic to. Reps scrolled past, leaders couldn't tell you apart from the hype merchants, and the teams that needed your modern approach kept hiring louder, less substantive coaches. Your craft was real and your results were measurable, but your visibility didn't reflect either.",
    after_carouselabs:
      "With CarouseLabs, your sales expertise finally reaches the reps and leaders who value it. A real deal becomes a tactical teardown reps save; a technique becomes a carousel they apply on their next call; a modern-selling take positions you above the old-school hype. Because you batch a week in one session, you stay top of mind for the unpredictable moment a leader decides their team needs help. Your sharp, credible feed sets you apart from the gimmick crowd, and reps sharing your applicable content become the word-of-mouth that brings you into teams — a pipeline built on proving the craft, not shouting the loudest.",
    time_to_first_post:
      "About 20 minutes including onboarding — most sales coaches turn one deal teardown into a first carousel the same day.",
    quick_wins: [
      "Your first tactical teardown carousel that a rep actually saves and uses on their next call.",
      "A batched week of technique content that keeps you top of mind for the next sales leader deciding to hire a coach.",
      "Your first inbound from a leader who says your content proved you coach real methodology, not motivation.",
    ],
  },
  "linkedin-coaches": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Make your own LinkedIn the proof of your coaching",
        description:
          "As a LinkedIn coach, your profile is your portfolio — prospects will judge your ability by how well your own content performs. Decide to treat your feed as the living case study it needs to be, demonstrating the exact strategies you teach. There's no faking it here: a LinkedIn coach with a flat feed has no credibility. Committing to practice what you preach, visibly and consistently, is the non-negotiable foundation that makes everything else you claim believable.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs helps you consistently produce the high-quality content that makes your own feed the proof of concept your coaching depends on.",
      },
      {
        step_number: 2,
        title: "Turn your clients' growth into results content",
        description:
          "Your clients' LinkedIn wins — the follower jumps, the inbound leads, the viral post — are your most persuasive content, with permission. Keep a note of these results and the specific tactic behind each. Showing real client growth proves your methods work on people other than you, which answers the skeptic's question of whether you can replicate results. In a space full of self-proclaimed gurus, demonstrated client outcomes are the credibility that separates a real coach from a confident poster.",
        time_required: "10 min per client win",
        carouselabs_tip:
          "CarouseLabs turns a client's LinkedIn win into a results carousel, so your coaching proof becomes content that answers the skeptic's question.",
      },
      {
        step_number: 3,
        title: "Write hooks that reveal what actually works on LinkedIn",
        description:
          "Your audience wants to crack LinkedIn, so hooks that promise insider mechanics land hard: 'The post format that gets 10x more reach (and why the algorithm loves it).' Leading with specific, tested LinkedIn tactics speaks directly to creators and professionals hungry to grow. Because your whole subject is the platform you're posting on, meta-content about what works is both perfectly on-topic and endlessly in demand — you're teaching the game while playing it well.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks around what actually works on LinkedIn, so your posts deliver the platform insight your audience is hungry for.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches one growth tactic in full",
        description:
          "Structure a carousel around a single, actionable LinkedIn tactic: how to write a scroll-stopping hook, how to structure a carousel, how to comment your way to reach. Walk through the principle, the common mistake, your method, the steps, and the result. Giving away a genuinely usable growth tactic builds trust fast — when a follower tries it and their next post performs better, they become a believer who wants your full program. Your free value directly demonstrates your paid value.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full growth-tactic carousel from your method — and demonstrates, in its own quality, the strategy you're teaching.",
      },
      {
        step_number: 5,
        title: "Cut through the LinkedIn-guru noise with real substance",
        description:
          "The LinkedIn-coaching space is crowded with recycled advice and engagement-bait gurus, so your differentiation is substance and honesty. Share nuanced, tested takes that challenge the lazy conventional wisdom — why 'post daily' can backfire, why engagement pods don't build real business. Positioning yourself as the honest voice above the hustle-guru noise attracts the serious professionals who are tired of tricks and want strategy that actually builds their brand and pipeline.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape a substantive, contrarian LinkedIn take into a post, so your feed rises above the recycled-guru noise.",
      },
      {
        step_number: 6,
        title: "Model the consistency you preach",
        description:
          "You teach consistency, so you must embody it — an inconsistent LinkedIn coach is a contradiction that quietly destroys credibility. Batch a week of posts in one session so your own feed never goes quiet, no matter how busy coaching gets. Your reliable presence is itself a demonstration of your core message, and it keeps you top of mind for the prospects deciding to invest in their LinkedIn. For you specifically, showing up consistently isn't just good practice — it's proof of concept.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so you model the consistency you preach even during your busiest coaching weeks.",
      },
      {
        step_number: 7,
        title: "Set the visual standard you teach clients to hit",
        description:
          "Your carousels should exemplify the quality you tell clients to aim for — you can't coach great content while posting mediocre-looking slides. A polished, consistent visual identity makes your feed a standard prospects aspire to, and it demonstrates the design discipline you teach. Lock in your template once so every results carousel and growth-tactic post looks the part. When prospects want their feed to look like yours, your visual quality becomes a silent, ongoing sales pitch for your coaching.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel polished and consistent, so your feed models the visual standard you coach toward.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, LinkedIn coaches faced a brutal credibility trap: you had to maintain a standout feed to prove your expertise, but coaching clients left you no time to produce it. So your own content went quiet or looked mediocre — a fatal contradiction for someone selling LinkedIn growth. Your clients' wins stayed undocumented, your substantive takes stayed unwritten, and prospects couldn't tell you apart from the recycled-advice gurus flooding the space. You were teaching consistency while being inconsistent, teaching quality while posting rushed slides, and the gap between your message and your feed quietly cost you the clients who were watching to see if you actually walk the talk.",
    after_carouselabs:
      "With CarouseLabs, your feed becomes the proof of concept your coaching needs. A client's LinkedIn win becomes a results carousel that answers the skeptic. A growth tactic becomes a carousel that teaches the strategy while demonstrating it. Your substantive takes rise above the guru noise. Because you batch a week in one session, you model the consistency you preach even during your busiest weeks — closing the credibility gap that used to cost you clients. Your polished feed becomes the standard prospects aspire to, turning your own content into a silent, ongoing sales pitch for the coaching you offer.",
    time_to_first_post:
      "About 15 minutes from signup — appropriately fast for a coach whose whole subject is LinkedIn content.",
    quick_wins: [
      "Your first client-results carousel that proves your methods work on people other than you.",
      "A growth-tactic post that teaches your strategy while demonstrating it in its own quality.",
      "A consistent feed that finally matches your message, closing the credibility gap with watching prospects.",
    ],
  },
  "career-coaches": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Choose the career transition you specialize in",
        description:
          "Career coaching splinters into distinct journeys — landing a first job, breaking into a new field, negotiating a raise, escaping a toxic role, moving into leadership. Pick the specific transition you guide and build content around it. Job seekers and career-changers are anxious and want a specialist who understands their exact situation, not a generalist. This focus makes your content resonate deeply with the people at that crossroads, which is precisely when they're most likely to invest in help.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your specialty transition, so your feed speaks directly to people at the exact crossroads you serve.",
      },
      {
        step_number: 2,
        title: "Turn client wins into hope-giving stories",
        description:
          "Your clients' career breakthroughs — the offer landed, the pivot achieved, the confidence rebuilt after a layoff — are content that gives anxious job seekers hope, with permission. Keep a note of these wins and the specific move that unlocked each. Because career struggle is scary and isolating, a real story of someone in the same situation succeeding is enormously reassuring. It proves your process works and lets a worried prospect picture their own success, which is the emotional trigger to reach out.",
        time_required: "10 min per client story",
        carouselabs_tip:
          "CarouseLabs turns a client's career breakthrough into a hopeful story carousel, so your results reassure anxious job seekers that change is possible.",
      },
      {
        step_number: 3,
        title: "Write hooks around the fears and mistakes job seekers have",
        description:
          "Career hooks land when they address a real anxiety or misconception: 'Your resume isn't the problem. Your positioning is.' Naming the specific fear or the costly mistake job seekers make creates instant recognition in someone who's stuck and frustrated. This audience is actively searching for answers during a stressful time, so hooks that speak precisely to their situation — the ghosting, the imposter feelings, the interview that went nowhere — cut straight through the generic career advice they've already ignored.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks around the real fears and mistakes of job seekers, so your posts speak to their anxiety instead of offering generic tips.",
      },
      {
        step_number: 4,
        title: "Build a carousel that gives a concrete, usable step",
        description:
          "Career content earns trust by handing over a real, actionable step: how to rewrite a resume bullet, how to answer the 'tell me about yourself' question, how to negotiate an offer. Structure it clearly — the problem, why the common approach fails, your method, the exact steps, and the result. Giving away a genuinely useful tactic builds trust fast, because when your free advice helps someone land an interview or feel more confident, they believe your paid coaching can change their career.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full actionable-step carousel from your method, so your free advice delivers a real win that builds trust toward coaching.",
      },
      {
        step_number: 5,
        title: "Address the emotional side of career change",
        description:
          "Career transitions are deeply emotional — tied to identity, fear, self-worth — and coaches who acknowledge that stand apart from the tactics-only crowd. Share content about the mindset of a career change: handling rejection, imposter syndrome, the courage to leave a stable role. This speaks to why people actually stay stuck and positions you as a coach who gets the whole human experience, not just resume formatting. It's the emotional resonance that turns a follower into someone who trusts you with their future.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs mixes career-mindset angles into your idea feed, so your content addresses the emotional reality that keeps people stuck, not just the tactics.",
      },
      {
        step_number: 6,
        title: "Stay present through the job seeker's whole journey",
        description:
          "People often follow a career coach for months — through a frustrating search or a slow-building decision to change — before they invest. You need to be consistently there for that whole journey. Batch a week of posts in one session so your feed keeps showing up during their ups and downs. Consistency builds the trust and familiarity that make you the obvious call when they finally decide to get help, especially for a decision as personal and high-stakes as their career.",
        time_required: "60 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so you stay present through the long, emotional journey before someone hires a career coach.",
      },
      {
        step_number: 7,
        title: "Project warmth and competence in your visuals",
        description:
          "Your visual identity should feel both credible and encouraging — you're helping people through a vulnerable, scary time. A clean, consistent, warm look signals that you're a competent, trustworthy guide, reassuring an anxious job seeker that they're in good hands. Lock in your template once so every hopeful story and actionable-step carousel carries the same steady, reassuring polish. In a stressful search, a feed that feels both professional and human is itself a reason to trust you.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel warm and consistent, so your feed reassures anxious job seekers they're in capable hands.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, career coaches wanted to reach anxious job seekers but had no time to create the content that would find them. Between client sessions, the breakthroughs that could give people hope stayed private, and turning the emotional, high-stakes reality of career change into resonant posts felt hard. So your feed defaulted to generic resume tips that sounded like everyone else's, invisible to the frustrated people actively searching for a coach who understood their exact fear. Your empathetic, results-driven coaching was exactly what they needed, but they couldn't find it beneath the pile of recycled career advice.",
    after_carouselabs:
      "With CarouseLabs, your coaching finally reaches the people searching for it. A client's job-search breakthrough becomes a hopeful story that reassures the anxious. A job seeker's specific fear becomes a hook that stops their scroll. Your method becomes an actionable-step carousel that delivers a real win. Because you batch a week in one session, you stay present through the whole emotional journey before someone decides to invest in their career. The mindset content sets you apart from the tactics-only crowd, and your warm, consistent feed becomes the trusted, encouraging presence that makes a worried job seeker finally reach out.",
    time_to_first_post:
      "About 20 minutes including onboarding — most career coaches turn one client win into a first hopeful carousel the same afternoon.",
    quick_wins: [
      "Your first hopeful client-story carousel that shows anxious job seekers that change is possible.",
      "An actionable-step post that delivers a real win and builds trust toward your coaching.",
      "Your first inbound from someone who says your content finally understood the fear they'd been sitting with.",
    ],
  },
  "leadership-coaches": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define the leader you help and the shift you create",
        description:
          "Leadership coaching spans many journeys — new managers finding their feet, senior leaders scaling teams, leaders navigating change. Choose the specific leader and the specific growth you enable, and anchor your content there. Leaders investing in coaching want someone who understands their particular level and challenge, not generic 'be a better leader' advice. This focus makes your content land with the exact people at that stage, which is when the need for coaching feels most real to them.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on the specific leader you help, so your feed speaks to their stage instead of leadership in general.",
      },
      {
        step_number: 2,
        title: "Share the leadership patterns you see across clients",
        description:
          "You witness the recurring struggles of leaders — the reluctance to delegate, the fear of hard conversations, the transition from doing to leading — and those patterns are content only a coach has. Keep a note of what you see repeatedly. Sharing these anonymized patterns proves you deeply understand the leadership experience and helps leaders recognize themselves in your words. That recognition — 'that's exactly me' — is the moment a leader realizes they could use a coach, and that it's you.",
        time_required: "10 min, weekly",
        carouselabs_tip:
          "CarouseLabs turns a leadership pattern you see repeatedly into an insight post, so your client observations become recognition-sparking content.",
      },
      {
        step_number: 3,
        title: "Write hooks that name a leader's private struggle",
        description:
          "Leadership hooks land when they surface something leaders feel but rarely say: 'Your team isn't underperforming. You're avoiding the hard conversation.' Naming the uncomfortable truth or the private doubt creates instant resonance and a little productive discomfort. Leaders are self-reflective by nature, so a hook that holds up an honest mirror stops them mid-scroll. This precision about the internal experience of leading is what makes a leader trust that you understand the role from the inside.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that name a leader's private struggle, so your posts create the honest-mirror moment that stops a reflective leader scrolling.",
      },
      {
        step_number: 4,
        title: "Build a carousel around a leadership skill you develop",
        description:
          "Structure a carousel around one concrete leadership capability: giving hard feedback, delegating without micromanaging, leading through uncertainty. Walk through the common failure mode, why good leaders struggle with it, your approach, and how to practice it. Teaching a real, developable skill proves your coaching produces tangible growth, not vague inspiration. Leaders respect practical substance, so a carousel that helps them actually lead better today builds the credibility that makes them want the deeper work you offer.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full leadership-skill carousel from your framework, so your coaching becomes practical development a leader can apply now.",
      },
      {
        step_number: 5,
        title: "Share your philosophy of what good leadership is",
        description:
          "Leaders choose coaches whose philosophy they respect, so make yours visible. Share your considered point of view on what leadership should be — servant leadership, radical candor, leading with vulnerability, whatever you genuinely stand for. A clear leadership philosophy attracts the leaders who resonate with it and positions you as a thinker with conviction rather than a technique-dispenser. This is the content that makes a leader think 'this is how I want to lead' — and want you to guide them there.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape your leadership philosophy into compelling posts, so your feed attracts leaders who share your conviction.",
      },
      {
        step_number: 6,
        title: "Stay consistently visible to leaders deciding slowly",
        description:
          "Leaders decide to engage a coach at pivotal moments — a promotion, a struggling team, a crisis of confidence — that arrive unpredictably. Consistent presence ensures you're top of mind when that moment lands. Batch a week of posts in one session to maintain steady visibility even when your coaching load is heavy. For a considered, relationship-driven purchase, being the coach a leader has quietly followed and come to trust is what turns their pivotal moment into a call to you.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your presence stays steady for the pivotal, unpredictable moment a leader decides to get coaching.",
      },
      {
        step_number: 7,
        title: "Present with grounded, credible visuals",
        description:
          "Your visual identity should convey the grounded credibility leaders respect — considered, clear, and professional rather than flashy. A consistent, polished look reinforces that you're a serious guide worth a leader's time and investment. Lock in your template once so every insight post and leadership-skill carousel carries the same steady authority. Leaders are perceptive about signals of substance, so a feed that looks considered quietly supports the impression that your coaching is too.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel grounded and consistent, so your feed conveys the credibility leaders respect.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, leadership coaches struggled to make their depth visible while spending their days in confidential coaching. The recurring patterns you saw across leaders, the philosophy you'd developed, the skills you helped people build — all of it stayed inside your practice, never becoming the content that could prove your understanding to prospective clients. Writing thoughtfully took time your coaching schedule didn't allow, so you posted rarely and generically, building none of the recognition that makes a leader think 'that's exactly me.' The leaders who would have valued your work had no way to discover it, and you competed for clients from near-invisibility.",
    after_carouselabs:
      "With CarouseLabs, the depth of your leadership coaching becomes visible. A pattern you see across clients becomes an insight post that makes leaders recognize themselves. A private struggle becomes a hook that holds up an honest mirror. A leadership skill becomes a carousel leaders can apply today. Because you batch a week in one session, your presence stays steady for the pivotal, unpredictable moment a leader decides to get help — so you're the coach they've come to trust. Your philosophy attracts leaders who share your conviction, and your grounded, credible feed makes your substance impossible to miss.",
    time_to_first_post:
      "About 20 minutes including onboarding — most leadership coaches turn one client pattern into a first insight carousel the same day.",
    quick_wins: [
      "Your first insight carousel that makes a leader recognize themselves and think 'that's exactly me.'",
      "A leadership-skill post that proves your coaching produces practical growth, not vague inspiration.",
      "Your first enquiry from a leader who says your content showed you understand the role from the inside.",
    ],
  },
  "mindset-coaches": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define the specific mental shift you help create",
        description:
          "'Mindset' is abstract, so ground it in a concrete transformation — from self-doubt to confidence, from scarcity to abundance thinking, from fear-driven to intentional. Choose the shift you specialize in and build content around it. This precision makes an intangible offering feel real and relevant to someone living the exact struggle. In a space where vagueness breeds skepticism, being specific about the mental change you create is what makes a prospect believe you can actually help them think differently.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on the specific mental shift you create, so your abstract-sounding work becomes concrete and relatable.",
      },
      {
        step_number: 2,
        title: "Turn client shifts into believable transformation stories",
        description:
          "Mindset results are internal, so storytelling is how you make them visible. With permission, share a client's arc: the limiting belief that held them back, the reframe that shifted it, and the change in their life that followed. These stories prove that mindset work produces real outcomes, not just good feelings, and they let a skeptical prospect see themselves in the transformation. A concrete before-and-after of someone's thinking is far more persuasive than any claim about the power of mindset.",
        time_required: "10 min per client story",
        carouselabs_tip:
          "CarouseLabs turns a client's mental shift into a believable story carousel, so your internal results become visible and persuasive.",
      },
      {
        step_number: 3,
        title: "Write hooks that expose a limiting belief",
        description:
          "Mindset hooks land when they name a limiting belief the reader doesn't realize they hold: 'You don't lack discipline. You have a belief that you're the kind of person who quits.' Surfacing an invisible mental pattern creates a jolt of recognition and curiosity. Because your work is about beliefs people can't see in themselves, a hook that reveals one is inherently intriguing — it makes the reader want to understand what other invisible beliefs might be running their life, and that you might show them.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that expose hidden limiting beliefs, so your posts create the curiosity-sparking recognition your work depends on.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a real reframe",
        description:
          "Give the reader an actual mental tool. Structure a carousel around one reframe or exercise you use: the situation it addresses, the default thought pattern, the reframe, how to practice it, and what changes. Handing over a genuine, usable mindset tool proves your work has substance beyond motivation — and when a reader tries your reframe and their thinking actually shifts, even slightly, they trust that your deeper coaching can transform how they operate. Real tools beat inspirational quotes every time.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full reframe carousel from your exercise, so your free content delivers a real mental tool, not a motivational poster.",
      },
      {
        step_number: 5,
        title: "Ground your work in psychology, not just positivity",
        description:
          "The mindset space is saturated with empty 'good vibes' content, so grounding your work in real psychology sets you apart. Reference the actual mechanisms — how beliefs form, why the brain resists change, what genuinely rewires a pattern. This substance positions you as a credible guide rather than a positivity peddler, and it reassures thoughtful prospects who are skeptical of fluff. Being the mindset coach who understands the why behind the shift is what earns the trust of people tired of surface-level inspiration.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you ground a mindset concept in real psychology, so your feed reads as substantive expertise, not empty positivity.",
      },
      {
        step_number: 6,
        title: "Stay present for the slow decision to do inner work",
        description:
          "Deciding to work on your mindset is deeply personal and slow — people follow a coach for a long time before they're ready. Consistency keeps you present for that whole journey. Batch a week of posts in one session so your feed keeps showing up during their moments of frustration and readiness. Sustained, trustworthy presence is what turns a long-time follower into a client when they finally decide to invest in changing how they think — a decision no one makes on a whim.",
        time_required: "60 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so you stay present through the slow, personal journey toward deciding to do inner work.",
      },
      {
        step_number: 7,
        title: "Create a calm, credible visual presence",
        description:
          "Your visual identity should feel grounded and trustworthy, countering the hype the mindset space is known for. A clean, consistent, calm look signals substance and safety, reassuring a thoughtful prospect that you're a credible guide rather than a hype merchant. Lock in your template once so every transformation story and reframe carousel carries the same steady, considered feel. In a field crowded with flashy positivity, a calm and professional feed is itself a signal that your work has real depth.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel calm and consistent, so your feed signals depth and safety, not hype.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, mindset coaches battled a credibility problem in a space flooded with empty positivity, and had no time to fight it well. Your work was substantive, grounded in real psychology, but between client sessions there was no time to create content, and turning invisible internal shifts into compelling posts was genuinely hard. So your feed defaulted to the same 'good vibes' quotes that make people distrust mindset coaches, your client transformations stayed private, and the thoughtful people who needed real inner work couldn't tell you apart from the hype. Your depth was real; your visibility made you look like everyone else.",
    after_carouselabs:
      "With CarouseLabs, the substance of your mindset work finally shows. A client's mental shift becomes a believable transformation story. A hidden limiting belief becomes a hook that sparks recognition. A real reframe becomes a carousel that delivers an actual mental tool. Because you batch a week in one session, you stay present through the slow, personal journey toward deciding to do inner work. Grounding your content in real psychology sets you apart from the positivity peddlers, and your calm, credible feed signals the depth that makes thoughtful prospects finally trust you with how they think.",
    time_to_first_post:
      "About 20 minutes including onboarding — most mindset coaches turn one client shift into a first carousel the same afternoon.",
    quick_wins: [
      "Your first transformation-story carousel that makes your internal results visible and believable.",
      "A reframe post that delivers a real mental tool and proves your work has substance.",
      "Your first inbound from someone who says a post revealed a limiting belief they didn't know they held.",
    ],
  },
  "productivity-coaches": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Pick the productivity problem you actually solve",
        description:
          "Productivity is a crowded, generic space, so specialize: overwhelmed professionals, procrastinating creatives, founders drowning in busywork, teams with broken focus. Choose your person and their specific problem, and build content around it. This focus separates you from the endless recycled 'top 10 productivity tips' and makes the right person feel you understand their particular kind of stuck. Specificity is what turns generic productivity content into something an overwhelmed person feels was written for them.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your specific productivity problem, so your feed cuts through the generic-tips noise.",
      },
      {
        step_number: 2,
        title: "Turn client turnarounds into proof content",
        description:
          "Your clients' transformations — from overwhelmed to in-control, from scattered to focused, from burnt out to sustainable — are your best proof, with permission. Keep a note of these turnarounds and the specific system or shift behind each. Leading with the mechanism proves you have a repeatable method rather than generic advice. Because productivity buyers are skeptical of hacks that never stick, a real client who built lasting change is the evidence that your approach is different from the tips they've already tried and abandoned.",
        time_required: "10 min per client story",
        carouselabs_tip:
          "CarouseLabs turns a client's productivity turnaround into a proof carousel, so your results counter the skepticism about hacks that never stick.",
      },
      {
        step_number: 3,
        title: "Write hooks that challenge productivity myths",
        description:
          "Productivity hooks land when they overturn a belief the reader holds: 'You don't need more discipline. You need fewer decisions.' Challenging the hustle-and-willpower assumptions most people carry creates instant intrigue and relief. Your audience is exhausted from failing at productivity systems, so a hook that reframes their struggle as a design problem rather than a personal failing is magnetic. It promises a fresh approach after all the hacks that made them feel worse, which is exactly what they're searching for.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates myth-challenging hooks, so your posts offer relief and a fresh angle instead of another willpower lecture.",
      },
      {
        step_number: 4,
        title: "Build a carousel around one system people can adopt",
        description:
          "Give the reader a real, implementable system. Structure a carousel around one method: the problem it solves, why the usual approach fails, your system, the steps to set it up, and the result. Handing over a genuinely usable productivity system builds trust fast, because when someone tries your free method and actually gets a calmer, more focused day, they believe your coaching can transform how they work. Usable substance beats abstract advice, especially for an audience burned by tips that didn't stick.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full system carousel from your method, so your free content is a real, adoptable system rather than another loose tip.",
      },
      {
        step_number: 5,
        title: "Address burnout and sustainability, not just output",
        description:
          "The productivity coaches who stand out talk about sustainability, not just squeezing more from every hour. Share content about avoiding burnout, working with your energy, and why relentless optimization backfires. This human, sustainable angle differentiates you from the grind-harder crowd and speaks to the exhausted professionals who secretly know hustle isn't working. Positioning productivity as a path to a calmer, more intentional life — not just more output — attracts the clients who want change that lasts, not another sprint.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs mixes sustainability and burnout angles into your idea feed, so your content speaks to exhausted professionals, not just output-chasers.",
      },
      {
        step_number: 6,
        title: "Stay consistent to reach people at their breaking point",
        description:
          "People seek a productivity coach at moments of overwhelm or burnout that arrive unpredictably. Consistent presence means you're there when someone finally hits their limit. Batch a week of posts in one session to maintain visibility even when your own schedule is full — and as a productivity coach, staying consistent without chaos is itself a demonstration of your methods. Being the calm, reliable voice in someone's feed when they reach their breaking point is what makes you the coach they reach out to.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so you stay present for the unpredictable moment someone hits overwhelm — while modeling your own methods.",
      },
      {
        step_number: 7,
        title: "Keep visuals clean, calm, and uncluttered",
        description:
          "Your visual identity should embody what you sell: clarity and calm. A clean, consistent, uncluttered look reassures an overwhelmed prospect and demonstrates the very order you help them create. A chaotic feed would contradict your entire message. Lock in a simple, considered template once so every proof carousel and system post reinforces the sense of calm control. For a productivity coach, a serene, well-organized feed is a live proof of the outcome you promise.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clean and calm, so your feed embodies the clarity your coaching delivers.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, productivity coaches drowned in the very overwhelm they help others escape — ironically too busy to create content. Your methods produced real, lasting turnarounds, but between client sessions there was no time to prove it, so your feed defaulted to the generic 'top 10 tips' that this exhausted audience has already tried and abandoned. Your sustainable, human approach couldn't be distinguished from the grind-harder crowd, and the overwhelmed professionals who needed exactly your calm systems kept scrolling past. You were selling clarity while your own content strategy was chaos, and the contradiction cost you the clients you were built to help.",
    after_carouselabs:
      "With CarouseLabs, your calm, effective methods finally reach the overwhelmed. A client's turnaround becomes proof that counters the skepticism about hacks. A productivity myth becomes a hook that offers relief and a fresh angle. Your method becomes an adoptable system carousel. Because you batch a week in one session, you stay present for the unpredictable moment someone hits their breaking point — while modeling the very consistency you teach. Your sustainability content sets you apart from the grind crowd, and your clean, calm feed becomes a live proof of the clarity your coaching delivers.",
    time_to_first_post:
      "About 20 minutes including onboarding — most productivity coaches turn one client turnaround into a first carousel the same day.",
    quick_wins: [
      "Your first proof carousel that counters the skepticism about productivity hacks that never stick.",
      "An adoptable system post that gives a reader a calmer day and builds trust toward your coaching.",
      "A clean, consistent feed that models the very clarity you help clients create.",
    ],
  },
  "public-speaking-coaches": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define the speaking outcome you help people reach",
        description:
          "Public speaking coaching serves distinct needs — conquering stage fright, landing keynote gigs, presenting to executives, going viral with talks. Choose the specific outcome you deliver and anchor your content to it. Nervous speakers and ambitious presenters want a coach who understands their exact goal, whether that's surviving a wedding toast or headlining a conference. This focus makes your content resonate with the right person at the right stage, which is when they're most motivated to get help.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your specific speaking outcome, so your feed speaks to the exact goal your clients are chasing.",
      },
      {
        step_number: 2,
        title: "Turn client breakthroughs into on-stage stories",
        description:
          "Your clients' wins — the panic attack overcome, the standing ovation, the promotion that followed a great presentation — are vivid, relatable content, with permission. Keep a note of these transformations and the specific technique behind each. Because speaking fear is so common and visceral, a story of someone conquering it is deeply resonant and hopeful. It proves your coaching works and lets a terrified prospect imagine their own moment of confidence, which is the emotional trigger to reach out for help.",
        time_required: "10 min per client story",
        carouselabs_tip:
          "CarouseLabs turns a client's speaking breakthrough into a vivid story carousel, so your results give nervous speakers hope they can do it too.",
      },
      {
        step_number: 3,
        title: "Write hooks that speak to the fear of the stage",
        description:
          "Speaking hooks land when they name the specific dread people feel: 'The moment your mind goes blank on stage isn't nerves. It's a fixable pattern.' Addressing the visceral fear — the shaking hands, the blank mind, the racing heart — creates instant recognition in anyone who's dreaded presenting. Because fear of public speaking is nearly universal and rarely discussed openly, a hook that names it with empathy and promises a fix cuts straight through and stops the scroll of anyone who's ever felt it.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that name the fear of speaking with empathy, so your posts connect instantly with nervous presenters.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a real speaking technique",
        description:
          "Give the reader a technique they can use in their next presentation: how to open a talk, how to handle a blank moment, how to use pauses, how to structure a story. Structure the carousel around the problem, the common mistake, your technique, the exact steps, and the result. A genuinely usable technique builds trust fast, because when a reader tries your tip and their next presentation goes better, they believe your coaching can transform them from terrified to compelling on stage.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full technique carousel from your method, so your free content is a real, usable speaking tip rather than vague encouragement.",
      },
      {
        step_number: 5,
        title: "Reframe speaking as a learnable skill, not a talent",
        description:
          "Many people believe good speakers are born, which keeps them stuck, so a powerful content angle is dismantling that myth. Share content showing that speaking is a trainable skill — that even great speakers were once terrified, that specific practice creates confidence. This reframe gives hope to people who've written themselves off and positions you as the coach who can teach anyone. It attracts the huge audience who wants to speak well but assumes they never could, which is exactly your market.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape the 'speaking is learnable' message into posts, so your feed gives hope to people who've written themselves off.",
      },
      {
        step_number: 6,
        title: "Stay consistent for the moment a big talk looms",
        description:
          "People seek a speaking coach when a high-stakes moment appears — a keynote, a pitch, a big presentation — often on short notice. Consistent visibility means you're the name they remember when that pressure hits. Batch a week of posts in one session to maintain presence even when you're busy coaching. Being the speaking coach who consistently shows up with helpful, reassuring content is what makes a suddenly-nervous professional reach out to you the moment their intimidating talk gets scheduled.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so you're the coach top of mind when someone's big, nerve-wracking talk suddenly appears on the calendar.",
      },
      {
        step_number: 7,
        title: "Present with confident, polished visuals",
        description:
          "Your visual identity should radiate the confidence and polish you help clients develop — a scrappy feed would undercut your message. A clean, consistent, professional look demonstrates the command and clarity you teach, reassuring prospects that you embody what you coach. Lock in your template once so every breakthrough story and technique carousel carries the same confident polish. For a speaking coach, a feed that looks assured is itself a demonstration of the presence you promise to help clients build.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel polished and confident, so your feed embodies the presence your coaching builds.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, public speaking coaches wanted to reach the huge audience of nervous presenters but had no time to create the content that would find them. Between client sessions, the vivid breakthroughs that could give people hope stayed private, and turning the visceral, emotional reality of speaking fear into resonant posts felt hard. So your feed went quiet or generic, invisible to the many people quietly dreading their next presentation and assuming they could never improve. Your transformative, technique-driven coaching was exactly what they needed, but they couldn't find it — and reached out to no one when their big talk loomed.",
    after_carouselabs:
      "With CarouseLabs, your coaching reaches the nervous presenters searching for it. A client's on-stage breakthrough becomes a vivid story that gives hope. The fear of the stage becomes a hook that connects instantly. Your method becomes a technique carousel a reader can use in their next presentation. Because you batch a week in one session, you're the coach top of mind when someone's high-stakes talk suddenly appears. Your 'speaking is learnable' message gives hope to people who'd written themselves off, and your confident, polished feed embodies the very presence you promise to help them build.",
    time_to_first_post:
      "About 20 minutes including onboarding — most speaking coaches turn one client breakthrough into a first carousel the same afternoon.",
    quick_wins: [
      "Your first breakthrough-story carousel that gives terrified speakers hope they can do it too.",
      "A technique post that helps a reader's next presentation go better and builds trust toward your coaching.",
      "Your first enquiry from a professional whose big talk just got scheduled and who remembered your name.",
    ],
  },
  "health-coaches": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Choose the health struggle you guide people through",
        description:
          "Health coaching is broad, so specialize: gut health, energy and fatigue, weight without dieting, chronic-condition support, healthy habits for busy professionals. Choose the specific struggle you help with and build content around it. People with health concerns want a coach who understands their exact situation, not general wellness advice. This focus makes your content resonate with the right person, and in a space full of vague health tips, specificity is what makes someone feel you truly understand what they're dealing with.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your specific health specialty, so your feed speaks to a real struggle rather than wellness in general.",
      },
      {
        step_number: 2,
        title: "Turn client health wins into behavior-led stories",
        description:
          "Your clients' improvements — more energy, better digestion, sustainable habits — are your best content, with permission, and led by the behavior change rather than a number. Keep a note of these wins and the specific habit shift behind each. Leading with the sustainable behavior proves you deliver a repeatable process, not a quick fix. Because health-conscious buyers have been burned by crash approaches, a real client who built lasting change is the evidence that your method is different from the fads they've abandoned.",
        time_required: "10 min per client story",
        carouselabs_tip:
          "CarouseLabs turns a client's health win into a behavior-led story carousel, so your results prove a sustainable process, not another quick fix.",
      },
      {
        step_number: 3,
        title: "Write hooks that counter health misinformation with empathy",
        description:
          "Health hooks land when they gently correct a widespread myth or name a real frustration: 'You're not lacking willpower. Your energy crashes are a habit problem.' The internet is full of health confusion and shame, so hooks that offer clarity and compassion cut through. Avoid fear-mongering and shame — they repel the people who need you. Leading with an empathetic, myth-busting angle attracts the confused, discouraged reader who's looking for a trustworthy voice amid the noise.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates empathetic, myth-busting hooks, so your posts offer clarity and compassion instead of adding to health-shame and fear.",
      },
      {
        step_number: 4,
        title: "Build a carousel that gives one doable health step",
        description:
          "Give the reader a real, achievable change: how to build a morning routine that boosts energy, how to improve sleep, how to eat better without dieting. Structure it around the problem, why the common approach fails, your simple approach, the steps, and the first action. A genuinely doable step builds trust fast, because when your free advice actually helps someone feel better, they believe your coaching can improve their health. Small, real wins beat overwhelming overhauls, especially for people tired of all-or-nothing plans.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full doable-step carousel from your method, so your free content delivers a real, achievable win rather than an overwhelming plan.",
      },
      {
        step_number: 5,
        title: "Champion sustainable health over quick fixes",
        description:
          "The health coaches who stand out reject the detox-and-crash-diet culture and talk about sustainable, realistic change. Share content that reframes health as a long game of consistent habits, not extreme sprints. This human, sustainable message differentiates you from the fad-pushers and speaks to people exhausted by yo-yo approaches. Positioning yourself as the coach who helps people build health they can actually keep attracts the clients who want lasting change, not another cycle of motivation and collapse.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs mixes sustainable-health angles into your idea feed, so your content stands apart from the fad-and-crash crowd.",
      },
      {
        step_number: 6,
        title: "Stay present for the slow decision to prioritize health",
        description:
          "People decide to invest in their health slowly, often after repeated frustration, so consistent presence keeps you there for that whole journey. Batch a week of posts in one session so your feed keeps showing up during their moments of motivation and discouragement. Consistency builds the trust that health decisions require, so when someone finally commits to changing, you're the coach they've come to trust — the obvious choice for a deeply personal decision about their body and wellbeing.",
        time_required: "60 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so you stay present through the slow, frustrating journey before someone commits to their health.",
      },
      {
        step_number: 7,
        title: "Create a warm, credible, non-preachy visual style",
        description:
          "Your visual identity should feel warm and trustworthy, not clinical or preachy. A clean, consistent, approachable look reassures a discouraged prospect that you're a supportive guide, not another source of health guilt. Lock in your template once so every behavior-led story and doable-step carousel carries the same encouraging warmth. In a space full of intimidating fitness aesthetics and shame, a warm and human feed is itself a reason for a hesitant person to feel safe reaching out to you.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel warm and consistent, so your feed feels like a supportive guide, not a source of guilt.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, health coaches fought to be heard over a deafening feed of fad diets, detox scams, and shame-based fitness content. Your sustainable, empathetic approach was what people actually needed, but between client sessions there was no time to create content, and turning nuanced health guidance into simple posts felt hard. So your client wins stayed private, your compassionate voice stayed quiet, and the confused, discouraged people who needed exactly your kind of help kept scrolling past the noise. You did honest, transformative work while flashy fad-pushers won the attention — and the clients.",
    after_carouselabs:
      "With CarouseLabs, your sustainable approach finally cuts through the health noise. A client's energy or habit win becomes a behavior-led story that proves a real process. A health myth becomes an empathetic hook that offers clarity instead of shame. Your method becomes a doable-step carousel that gives a real win. Because you batch a week in one session, you stay present through the slow, frustrating journey before someone commits to their health. Your sustainable message sets you apart from the fad crowd, and your warm, credible feed becomes the safe, supportive presence that makes a discouraged person finally reach out.",
    time_to_first_post:
      "About 20 minutes including onboarding — most health coaches turn one client win into a first carousel the same afternoon.",
    quick_wins: [
      "Your first behavior-led client story that proves you deliver a sustainable process, not a quick fix.",
      "A doable-step post that gives a reader a real win and builds trust toward your coaching.",
      "Your first inbound from someone who says your content was the first health advice that didn't make them feel ashamed.",
    ],
  },
  "wellness-coaches": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define the dimension of wellbeing you focus on",
        description:
          "Wellness is vast, so choose your lane — stress and burnout, work-life balance, holistic wellbeing for professionals, mind-body connection. Anchor your content to that specific dimension. People seeking wellness support want a coach who addresses their particular imbalance, not a generic 'live your best life' message. This focus makes your content meaningful to the right person, and in a space prone to vagueness and buzzwords, being specific about the wellbeing you cultivate is what makes a stressed prospect feel genuinely understood.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your specific wellness dimension, so your feed avoids the vague buzzwords the space is known for.",
      },
      {
        step_number: 2,
        title: "Turn client shifts into relatable wellbeing stories",
        description:
          "Your clients' transformations — from burnt out to balanced, from anxious to grounded, from depleted to restored — are your most persuasive content, with permission. Keep a note of these shifts and the specific practice or boundary that created each. Because wellness results are internal and easily dismissed as fluffy, a concrete story of real life change makes your work credible and tangible. It lets a stressed prospect see themselves in the transformation, which is the emotional pull that turns a follower into a client.",
        time_required: "10 min per client story",
        carouselabs_tip:
          "CarouseLabs turns a client's wellbeing shift into a relatable story carousel, so your internal results become tangible and credible.",
      },
      {
        step_number: 3,
        title: "Write hooks that name the cost of ignoring wellbeing",
        description:
          "Wellness hooks land when they surface the real consequences people feel: 'Your exhaustion isn't a productivity problem. It's a warning.' Naming the true cost of burnout, chronic stress, or imbalance creates recognition in someone quietly running on empty. High-achievers especially ignore these signals until named plainly. A hook that gives language to their depletion and hints at a way out stops the scroll of exactly the overworked professional who needs your help but hasn't admitted it yet.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that name the real cost of ignoring wellbeing, so your posts reach the depleted high-achiever who hasn't admitted it yet.",
      },
      {
        step_number: 4,
        title: "Build a carousel around a real wellness practice",
        description:
          "Give the reader an actual practice they can try: a boundary-setting method, a stress-reset routine, a way to build restorative habits into a busy day. Structure it around the problem, why the usual advice fails, your practice, the steps, and what shifts. A genuinely usable practice builds trust because when a reader tries it and feels even slightly calmer, they believe your deeper coaching can restore their wellbeing. Real, doable practices differentiate you from the abstract self-care content that helps no one.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full wellness-practice carousel from your method, so your free content delivers a real practice, not abstract self-care platitudes.",
      },
      {
        step_number: 5,
        title: "Ground wellness in realism, not toxic positivity",
        description:
          "The wellness space is saturated with performative self-care and toxic positivity, so grounding your work in realism sets you apart. Share honest content about the fact that wellbeing is hard, that rest isn't lazy, that boundaries cost something. This authenticity resonates with exhausted people tired of being told to just meditate and be grateful. Being the wellness coach who's real about the messy work of wellbeing attracts the clients who want genuine change, not another aesthetic self-care checklist.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape honest, realistic wellness takes into posts, so your feed rises above the toxic-positivity self-care noise.",
      },
      {
        step_number: 6,
        title: "Stay present as people slowly reach their limit",
        description:
          "People seek wellness coaching when burnout or imbalance finally becomes unignorable — a moment that builds slowly and arrives unpredictably. Consistent presence keeps you there for it. Batch a week of posts in one session so your calming, grounded content keeps showing up in their feed as they approach their limit. Being the steady, trustworthy voice someone has followed through their slow-building exhaustion is what makes you the coach they turn to when they finally decide something has to change.",
        time_required: "60 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your grounding presence stays steady for the slow-building moment someone reaches their limit.",
      },
      {
        step_number: 7,
        title: "Create a calming, restorative visual presence",
        description:
          "Your visual identity should feel like the calm you help create — uncluttered, soothing, consistent. A serene, professional look reassures a depleted prospect and embodies the restoration you offer, while a chaotic feed would contradict your message. Lock in a calming template once so every wellbeing story and practice carousel reinforces the sense of peace. For a wellness coach, a tranquil, considered feed is itself a small demonstration of the balance you help clients find.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel calming and consistent, so your feed embodies the peace your coaching offers.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, wellness coaches struggled to be taken seriously in a space drowning in performative self-care and buzzwords, with no time to prove their substance. Your grounded, realistic approach was what depleted people actually needed, but between client sessions there was no time to create content, and turning internal wellbeing shifts into credible posts was hard. So your feed defaulted to the vague inspirational content that makes people dismiss wellness coaching, your client transformations stayed private, and the exhausted professionals who needed your genuine help couldn't find you beneath the toxic positivity.",
    after_carouselabs:
      "With CarouseLabs, the substance of your wellness work finally shows. A client's shift from burnt out to balanced becomes a tangible story. The real cost of ignoring wellbeing becomes a hook that reaches the depleted high-achiever. Your practice becomes a carousel that delivers a real calm. Because you batch a week in one session, your grounding presence stays steady for the slow-building moment someone reaches their limit. Your honest, realistic content sets you apart from the toxic-positivity crowd, and your calming feed embodies the peace that makes an exhausted professional finally reach out.",
    time_to_first_post:
      "About 20 minutes including onboarding — most wellness coaches turn one client shift into a first carousel the same afternoon.",
    quick_wins: [
      "Your first wellbeing-shift carousel that makes your internal results tangible and credible.",
      "A real-practice post that gives a reader a moment of calm and builds trust toward your coaching.",
      "Your first inbound from a depleted professional who says your content named exactly what they'd been ignoring.",
    ],
  },
  "relationship-coaches": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Choose the relationship challenge you specialize in",
        description:
          "Relationship coaching spans distinct journeys — dating and finding a partner, repairing a struggling relationship, communication for couples, healing after a breakup. Choose your focus and build content around it. People with relationship struggles are vulnerable and want a coach who understands their specific situation, not generic love advice. This focus makes your content resonate with the right person at a tender moment, which is when they're most open to seeking guidance from someone who clearly gets what they're going through.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your specific relationship specialty, so your feed speaks to a real situation rather than love in general.",
      },
      {
        step_number: 2,
        title: "Turn client breakthroughs into relatable stories",
        description:
          "Your clients' breakthroughs — the reconnection, the confident dating, the healed communication — are content that gives struggling people hope, with permission and careful anonymity. Keep a note of these transformations and the specific shift behind each. Because relationship pain is isolating, a story of someone in a similar situation finding their way through is profoundly reassuring. It proves your coaching works and lets a hurting prospect imagine their own resolution, which is the emotional trigger that makes them reach out.",
        time_required: "10 min per client story",
        carouselabs_tip:
          "CarouseLabs turns a client's relationship breakthrough into a relatable story carousel, so your results give hurting people hope while protecting privacy.",
      },
      {
        step_number: 3,
        title: "Write hooks that name a painful relationship pattern",
        description:
          "Relationship hooks land when they name a pattern the reader recognizes but hasn't named: 'The reason you keep attracting the same wrong partner isn't bad luck.' Surfacing an invisible dynamic creates a jolt of recognition and curiosity. Because people rarely have language for their relationship patterns, a hook that gives them that language is magnetic — it makes the reader feel seen in their private struggle and eager to understand what you know about the pattern that's been running their love life.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that name painful relationship patterns, so your posts create the recognition that stops a struggling reader mid-scroll.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a real relationship tool",
        description:
          "Give the reader an actual tool: a communication technique, a way to set a boundary, a reframe for conflict. Structure it around the situation, the common mistake, your tool, how to use it, and what changes. A genuinely usable relationship tool builds trust because when a reader tries it and a conversation goes better, they believe your coaching can transform their relationships. Real, applicable tools set you apart from the vague 'communicate more' advice that leaves struggling people no better off.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full relationship-tool carousel from your method, so your free content delivers a usable technique, not vague advice.",
      },
      {
        step_number: 5,
        title: "Be compassionate and non-judgmental, never preachy",
        description:
          "Relationship struggles carry shame, so content that judges or lectures repels the people who need you. The coaches who build trust lead with compassion and normalize the struggle — 'this is human, and it's fixable.' Sharing empathetic, non-judgmental content makes a vulnerable prospect feel safe rather than criticized. In a personal, tender domain, being the coach who meets people with warmth instead of judgment is what earns the deep trust required before someone will let you into their relationships.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs drafts compassionate, non-judgmental content, so your feed makes vulnerable people feel safe rather than criticized.",
      },
      {
        step_number: 6,
        title: "Stay present through a deeply personal decision",
        description:
          "Deciding to work with a relationship coach is intimate and slow — people often follow for a long time before they're ready to open up. Consistent presence keeps you there for that whole journey. Batch a week of posts in one session so your compassionate content keeps showing up as they move toward readiness. Sustained, trustworthy presence builds the safety a deeply personal decision requires, so when they finally decide to get help, you're the coach they already feel safe with.",
        time_required: "60 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so you stay present through the slow, intimate journey before someone trusts you with their relationships.",
      },
      {
        step_number: 7,
        title: "Create a warm, safe-feeling visual presence",
        description:
          "Your visual identity should feel warm, safe, and non-clinical — you're inviting people to share something vulnerable. A consistent, approachable, gentle look reassures a hurting prospect that you're a compassionate guide. Lock in your template once so every breakthrough story and relationship-tool carousel carries the same warmth. In a domain where trust and emotional safety are everything, a feed that feels like a warm, judgment-free space is itself a reason for a vulnerable person to reach out to you.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel warm and consistent, so your feed feels like the safe space your coaching provides.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, relationship coaches wanted to reach hurting people but had no time to create the content that would find them, and the topic's sensitivity made it hard to write well. Between client sessions, the breakthroughs that could give people hope stayed private, and turning intimate relationship dynamics into compassionate, resonant posts felt daunting. So your feed went quiet or leaned on generic love quotes, invisible to the vulnerable people quietly struggling and searching for a coach who understood their pain without judgment. Your empathetic, effective coaching was exactly what they needed, but they couldn't find it.",
    after_carouselabs:
      "With CarouseLabs, your compassionate coaching reaches the people who need it. A client's breakthrough becomes a relatable story that gives hope while protecting privacy. A painful pattern becomes a hook that makes a struggling reader feel seen. Your method becomes a relationship-tool carousel that helps a real conversation go better. Because you batch a week in one session, you stay present through the slow, intimate journey before someone trusts you with their heart. Your non-judgmental content makes vulnerable people feel safe, and your warm, consistent feed becomes the judgment-free space that makes a hurting person finally reach out.",
    time_to_first_post:
      "About 20 minutes including onboarding — most relationship coaches turn one client breakthrough into a first carousel the same afternoon.",
    quick_wins: [
      "Your first breakthrough-story carousel that gives struggling people hope while protecting client privacy.",
      "A relationship-tool post that helps a reader's real conversation go better and builds trust.",
      "Your first inbound from someone who says a post named the pattern they couldn't put into words.",
    ],
  },
  "management-consultants": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define the business problem you're the authority on",
        description:
          "Management consulting is credibility-driven, and generic 'we improve businesses' positioning wins no one. Decide the specific problem you solve — operational efficiency, organizational restructuring, change management, cost transformation. Anchor your content to that expertise. Decision-makers hiring consultants want a demonstrated authority on their exact problem, not a generalist. This focus builds the reputation that makes a executive think of you specifically when that challenge lands on their desk, which is how consulting engagements actually originate.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your specific consulting expertise, so your feed builds authority on one problem rather than everything.",
      },
      {
        step_number: 2,
        title: "Turn your frameworks and engagements into insight content",
        description:
          "Your value is structured thinking, so your frameworks, methodologies, and (anonymized) engagement lessons are your best content. Keep a note of the insights you generate in your work — the diagnostic that revealed the real problem, the change approach that stuck. Sharing your thinking demonstrates the analytical rigor clients pay premium fees for, and it lets prospective clients sample your problem-solving before hiring you. For consultants, visible thinking is the most direct proof of the expertise you sell.",
        time_required: "10 min, weekly",
        carouselabs_tip:
          "CarouseLabs turns a framework or engagement lesson into a structured insight carousel, so your consulting thinking becomes proof of your rigor.",
      },
      {
        step_number: 3,
        title: "Write hooks that reframe how leaders see a problem",
        description:
          "Consulting hooks land when they offer a sharper diagnosis than the reader has: 'Your restructuring will fail for the same reason 70% do — and it's not the org chart.' Leading with a counterintuitive reframe of a business problem signals the diagnostic skill executives value. This audience is sophisticated, so avoid obvious advice; the hook must promise a genuinely more insightful way of seeing their challenge. A reframe that makes a leader rethink their assumption is what marks you as worth their attention.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that reframe business problems, so your posts signal the diagnostic insight executives pay consultants for.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a real framework",
        description:
          "Structure a carousel around one framework or methodology: how you diagnose an operational bottleneck, how you approach a transformation, how you measure change success. Walk through the situation, the flawed default approach, your framework, how to apply it, and the outcome. Giving away a genuinely useful framework demonstrates the substance of your work and lets prospects experience your thinking. Sophisticated buyers hire consultants whose approach they already respect, so teaching your method openly is direct pipeline-building.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full framework carousel from your methodology, so your structured thinking becomes content prospects can respect and remember.",
      },
      {
        step_number: 5,
        title: "Share a point of view on where business is heading",
        description:
          "Executives respect consultants who see around corners, so share your perspective on trends shaping your field — the shifts in how organizations work, the changes reshaping your clients' industries. A forward-looking point of view positions you as a strategic thinker rather than a hired pair of hands. This thought leadership elevates your brand into the realm senior leaders take seriously, and it attracts the forward-thinking organizations that make the best, most interesting consulting clients.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape a point of view on business trends into a post, so your feed reads as thought leadership, not service promotion.",
      },
      {
        step_number: 6,
        title: "Stay consistently visible to a small buyer pool",
        description:
          "Your buyers are few and senior, and engagements originate at unpredictable moments of organizational need. Consistent presence keeps you top of mind for when that need arises. Batch a week of posts in one session to maintain steady visibility despite a demanding project schedule. For high-value, relationship-driven consulting, being the authority a decision-maker has followed and come to trust is what turns their moment of need into a call to you rather than a competitor.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your authority stays visible to a small, senior buyer pool even during demanding engagements.",
      },
      {
        step_number: 7,
        title: "Present with the polish executive buyers expect",
        description:
          "Your audience lives in a world of high standards, and your feed must meet them. A refined, consistent, professional visual identity signals the rigor and quality your engagements deliver — anything scrappy undercuts your credibility with discerning buyers. Lock in a considered template once so every framework and insight carousel carries the same executive polish. At this level, a feed that looks the part quietly reinforces that your consulting is as rigorous as your content appears.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel refined and consistent, so your feed meets the standards executive buyers expect.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, management consultants knew thought leadership drove engagements but couldn't fit content creation into demanding project schedules. The frameworks and insights you generated in your work — the exact proof of your rigor — stayed inside client decks and your own head, never reaching the executives forming their impression of you. When you did post, it was generic business commentary that built no distinct authority. Meanwhile the engagements went to consultants who'd built a visible reputation on a specific problem, and decision-makers chose advisors partly on a thought leadership you didn't have time to produce.",
    after_carouselabs:
      "With CarouseLabs, your consulting expertise finally becomes visible authority. A framework becomes a structured carousel that proves your rigor. A sharper diagnosis becomes a hook that reframes how a leader sees their problem. Your point of view on business trends becomes thought leadership that positions you as a strategic thinker. Because you batch a week in one session, your authority stays visible to a small, senior buyer pool even during demanding engagements — so you're the advisor a decision-maker thinks of when their problem lands. Your polished feed matches the standards of executive buyers, and your visible thinking becomes your most direct pipeline.",
    time_to_first_post:
      "About 20 minutes including onboarding — most consultants turn one framework into a first insight carousel the same day.",
    quick_wins: [
      "Your first framework carousel that proves your analytical rigor to prospective clients.",
      "A reframe post that makes an executive rethink an assumption about their business.",
      "Your first inbound from a decision-maker who says your content made you the obvious call for their problem.",
    ],
  },
  "strategy-consultants": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Stake out the strategic domain you own",
        description:
          "Strategy consulting is elite and crowded at the top, so define the specific strategic question you're known for — market entry, competitive positioning, growth strategy, digital transformation. Anchor your content to that domain. Senior leaders seeking strategic guidance want a recognized thinker on their exact challenge, not a generalist. Owning a clear strategic domain builds the reputation that makes a C-suite leader seek your perspective specifically, which is how high-stakes strategy engagements begin.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your strategic domain, so your feed builds recognized authority on one high-value question.",
      },
      {
        step_number: 2,
        title: "Turn strategic analysis into sharp, contrarian insight",
        description:
          "Your value is superior thinking, so your content must showcase it. Keep a note of the strategic insights you develop — the market shift others are missing, the reason a common strategy fails, the non-obvious move. Sharing genuinely sharp analysis, especially contrarian takes, demonstrates the strategic mind leaders pay for. For strategy consultants, the quality of your thinking is the entire product, so visible, non-obvious insight is the most persuasive proof you can offer a discerning buyer.",
        time_required: "10 min, weekly",
        carouselabs_tip:
          "CarouseLabs turns a strategic insight into a sharp carousel, so your best thinking becomes visible proof of the mind leaders hire.",
      },
      {
        step_number: 3,
        title: "Write hooks that promise a non-obvious strategic truth",
        description:
          "Strategy hooks land when they promise an insight the sophisticated reader hasn't considered: 'Most companies pick the wrong market to enter, and it's because of a bias in how they analyze TAM.' Leading with a counterintuitive strategic truth signals the caliber of your thinking. Your audience is senior and skeptical, so the hook must promise real intellectual value, not surface commentary. A genuinely non-obvious angle is what earns the attention of leaders who've heard every generic strategy take.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that promise non-obvious strategic truths, so your posts earn the attention of a senior, skeptical audience.",
      },
      {
        step_number: 4,
        title: "Build a carousel that walks through strategic reasoning",
        description:
          "Structure a carousel around a piece of strategic reasoning: how you'd evaluate a market, how to think about a competitive threat, how to prioritize where to play. Walk through the framing, the flawed conventional approach, your reasoning, and the conclusion. Demonstrating rigorous strategic thinking end-to-end lets prospects experience the quality of your mind. Since strategy buyers hire based on how a consultant thinks, showing your reasoning openly is the most direct way to prove you're worth an elite engagement.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full strategic-reasoning carousel from your analysis, so prospects experience the quality of your thinking firsthand.",
      },
      {
        step_number: 5,
        title: "Comment incisively on major strategic moves",
        description:
          "Analyzing high-profile strategic decisions — a company's pivot, an acquisition, a market disruption — is powerful content that showcases your lens in real time. Share your incisive read on what's really happening and why. This positions you as a strategic thinker whose perspective is worth following, and it demonstrates your analysis applied to situations everyone's watching. Being the consultant with the sharpest take on the moves everyone's discussing is a fast route to the reputation that attracts elite clients.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape an incisive take on a major strategic move into a post, so your feed showcases your lens on situations everyone's watching.",
      },
      {
        step_number: 6,
        title: "Stay visible to an elite, slow-moving buyer pool",
        description:
          "Your buyers are a tiny, senior group, and strategy engagements emerge at unpredictable inflection points. Consistent presence keeps your name and thinking in front of them for when that moment comes. Batch a week of posts in one session to maintain steady, high-caliber visibility despite intense project demands. For elite, relationship-driven consulting, being the strategic mind a leader has followed and come to respect is what makes their inflection point become an engagement with you.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your high-caliber thinking stays visible to an elite buyer pool even amid intense engagements.",
      },
      {
        step_number: 7,
        title: "Present with elite, understated polish",
        description:
          "At the top of strategy consulting, visual credibility is subtle but real — your buyers notice everything. A refined, consistent, understated visual identity signals the caliber and seriousness of your work; anything flashy or scrappy reads as a mismatch. Lock in a considered template once so every reasoning carousel and insight post carries the same elite polish. For a strategy consultant, a feed that looks as considered as your thinking quietly reinforces that you operate at the level your buyers require.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel refined and understated, so your feed matches the caliber of your strategic work.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, strategy consultants sat on their most valuable asset — superior thinking — and rarely made it visible. Intense engagements left no room for content, so the sharp analysis and contrarian insights you developed stayed in client rooms and your own notes, never reaching the senior leaders forming their view of you. When you posted, it was generic commentary indistinguishable from every other consultant's, building no reputation for the non-obvious thinking that actually wins elite work. The best engagements went to consultants with a visible intellectual brand, and you competed for high-stakes work while your best thinking stayed hidden.",
    after_carouselabs:
      "With CarouseLabs, your strategic thinking finally becomes a visible brand. A sharp insight becomes a carousel that proves the caliber of your mind. A non-obvious truth becomes a hook that earns a skeptical audience's attention. Your reasoning becomes a carousel prospects can experience firsthand. Your incisive take on a major move showcases your lens in real time. Because you batch a week in one session, your high-caliber thinking stays visible to an elite buyer pool even amid intense engagements — so you're the strategic mind a leader turns to at their inflection point. Your understated, polished feed matches the level your buyers require.",
    time_to_first_post:
      "About 20 minutes including onboarding — most strategy consultants turn one insight into a first carousel the same day.",
    quick_wins: [
      "Your first strategic-reasoning carousel that lets prospects experience the caliber of your thinking.",
      "An incisive take on a major move that showcases your lens on a situation everyone's watching.",
      "Your first inbound from a senior leader who says your thinking is why they want you at their table.",
    ],
  },
  "brand-consultants": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Own a clear philosophy of what makes brands work",
        description:
          "Brand consulting is subjective, so your differentiation is a distinct point of view on what great branding actually is. Decide the philosophy you stand for — brand as clarity, brand as emotional resonance, brand as consistency — and anchor your content to it. Clients hire brand consultants whose worldview they resonate with, so a strong, visible philosophy attracts the right clients and repels the mismatches. Your perspective, not a service list, is what makes you memorable in a field crowded with 'we do branding' generalists.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content anchored to your brand philosophy, so your feed argues a worldview instead of listing deliverables.",
      },
      {
        step_number: 2,
        title: "Turn brand transformations into before-and-after stories",
        description:
          "Your clients' brand transformations — the repositioning that unlocked growth, the identity that finally fit — are your most persuasive content, with permission. Keep a note of these and the specific insight that drove each. Because branding results can feel intangible, a concrete before-and-after of a brand's clarity and impact makes your work credible. Showing the strategic thinking behind the transformation, not just the pretty logo, proves you deliver business results, which is what discerning brand clients actually buy.",
        time_required: "10 min per client story",
        carouselabs_tip:
          "CarouseLabs turns a brand transformation into a before-and-after story carousel, so your intangible work becomes concrete and credible.",
      },
      {
        step_number: 3,
        title: "Write hooks that expose branding mistakes",
        description:
          "Brand hooks land when they call out a common, costly mistake: 'Your brand isn't confusing customers because of your logo. It's your positioning.' Naming a branding error the reader is probably making creates recognition and a little productive worry. Business owners often misdiagnose their brand problems, so a hook that reframes the real issue signals your diagnostic expertise and makes them think 'wait, is my brand doing that?' — the curiosity that earns the follow and eventually the enquiry.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that expose common branding mistakes, so your posts signal diagnostic expertise and spark self-recognition.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a real branding principle",
        description:
          "Structure a carousel around one branding principle: how to build a distinct positioning, why consistency compounds, how to find a brand's core message. Walk through the problem, the common mistake, your principle, how to apply it, and the result. Teaching a genuine branding principle demonstrates the substance behind your work and lets prospects experience your thinking. Clients hire brand consultants whose approach they already respect, so sharing your principles openly is direct authority-building.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full branding-principle carousel from your notes, so your expertise becomes content prospects can respect and remember.",
      },
      {
        step_number: 5,
        title: "Analyze brands everyone recognizes",
        description:
          "Breaking down why a well-known brand works (or fails) is compelling, shareable content that showcases your lens on situations everyone already has an opinion about. Share your read on a famous rebrand, a brand that nailed its positioning, or one that lost its way. This demonstrates your expertise applied to recognizable examples and sparks discussion, while positioning you as the brand thinker whose take is worth following. Familiar examples make your abstract expertise instantly tangible.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape a sharp analysis of a well-known brand into a post, so your expertise shows through examples everyone recognizes.",
      },
      {
        step_number: 6,
        title: "Stay consistently visible to prove you practice branding",
        description:
          "As a brand consultant, your own consistent, well-branded presence is proof you can do the job — inconsistency is disqualifying. Batch a week of posts in one session so your feed stays active and on-message regardless of client work. Sustained, coherent presence keeps you top of mind for the moment a business decides its brand needs help, and it demonstrates the very discipline you sell. For you, consistency isn't just good practice; it's a live portfolio piece.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your on-brand presence stays consistent — the living proof that you practice what you sell.",
      },
      {
        step_number: 7,
        title: "Make your visual identity flawless",
        description:
          "You sell brand and visual coherence, so your feed must be impeccable — a sloppy look would be fatal to your credibility. A polished, distinctive, perfectly consistent visual identity is itself your strongest sales argument. Lock in a considered template once so every transformation story and principle carousel exemplifies the branding excellence you offer. For a brand consultant, a visually flawless feed is the ultimate proof of concept, doing your selling for you around the clock.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel flawlessly on-brand, so your feed is a living proof of the branding excellence you sell.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, brand consultants faced a cruel irony: you sold brand consistency and visual excellence, but had no time to maintain your own. Client work consumed your hours, so your feed went quiet or looked inconsistent — a credibility killer for someone in your field. Your brand transformations stayed private, your distinct philosophy stayed unspoken, and prospects couldn't distinguish your strategic work from the 'we make logos' crowd. You were the cobbler with no shoes, and the gap between the brand excellence you preached and the feed you actually maintained quietly cost you the discerning clients who were watching to see if you walk the talk.",
    after_carouselabs:
      "With CarouseLabs, your feed becomes the living proof of the branding you sell. A client transformation becomes a before-and-after story that shows real business results. A branding mistake becomes a hook that signals your diagnostic expertise. Your principle becomes a carousel prospects respect. Your analysis of a famous brand showcases your lens through familiar examples. Because you batch a week in one session, your on-brand presence stays flawlessly consistent regardless of client work — the ultimate proof of concept. The gap between what you preach and what you post closes, and your impeccable feed sells your brand expertise around the clock.",
    time_to_first_post:
      "About 20 minutes including onboarding — most brand consultants turn one client transformation into a first carousel the same day.",
    quick_wins: [
      "Your first before-and-after brand carousel that proves your work drives real business results.",
      "A flawlessly on-brand feed that becomes living proof you practice the excellence you sell.",
      "Your first inbound from a business owner who recognized their own brand mistake in one of your posts.",
    ],
  },
  "marketing-consultants": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define the marketing outcome you're known for driving",
        description:
          "Marketing consulting is results-driven, so specialize: demand generation, positioning, content strategy, funnel optimization. Decide the specific outcome you deliver and anchor your content there. Businesses hiring marketing consultants want a proven expert on their exact challenge, not a jack-of-all-trades. This focus builds the reputation that makes a company think of you specifically when that marketing problem surfaces, and it lets your content speak directly to the buyer feeling that particular pain.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your marketing specialty, so your feed builds authority on one outcome rather than everything.",
      },
      {
        step_number: 2,
        title: "Turn client results into proof-driven content",
        description:
          "Your clients' marketing wins — the pipeline lift, the CAC reduction, the campaign that worked — are your strongest content, with permission. Keep a note of these results and the specific strategy behind each. Because marketing buyers are skeptical (everyone claims results), showing real numbers and the thinking behind them proves you deliver. Leading with the strategy, not just the outcome, demonstrates you have a repeatable approach rather than lucky wins, which is what a burned prospect needs to see before trusting you.",
        time_required: "10 min per client story",
        carouselabs_tip:
          "CarouseLabs turns a client's marketing win into a proof-driven carousel, so your results answer the skeptical buyer's first question.",
      },
      {
        step_number: 3,
        title: "Write hooks that challenge marketing conventional wisdom",
        description:
          "Marketing hooks land when they overturn a common belief: 'You don't need more content. You need to distribute the content you have.' Challenging the assumptions businesses hold about marketing signals sharper thinking and creates intrigue. Your audience is drowning in generic marketing advice, so a hook that offers a genuinely fresh, contrarian angle cuts through and marks you as a strategic thinker rather than another consultant repeating best-practice platitudes.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that challenge marketing conventional wisdom, so your posts stand out from the generic best-practice noise.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a real marketing playbook",
        description:
          "Structure a carousel around one playbook: how to build a positioning statement, how to design a content engine, how to fix a leaky funnel. Walk through the problem, the common mistake, your playbook, the steps, and the result. Giving away a genuinely useful playbook demonstrates your expertise and lets prospects experience your thinking. Marketing buyers hire consultants whose approach they respect, so teaching your methods openly attracts the clients who realize they'd rather have you implement it than DIY it badly.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full playbook carousel from your method, so your marketing expertise becomes content that proves your value.",
      },
      {
        step_number: 5,
        title: "Share your take on marketing trends and channels",
        description:
          "Businesses hire marketing consultants who are current, so share your perspective on what's working now — the channels rising and falling, the shifts in buyer behavior, the tactics quietly dying. A forward-looking, informed point of view positions you as a consultant worth listening to and reassures prospects that your advice won't be outdated. Being the marketing voice who clearly tracks the fast-moving landscape is what attracts businesses anxious about keeping up.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape a take on marketing trends into a post, so your feed proves you're current in a fast-moving field.",
      },
      {
        step_number: 6,
        title: "Practice the consistency you'd advise clients to keep",
        description:
          "You'd tell any client that consistent content is essential, so your own feed must model it — an inconsistent marketing consultant undercuts their own advice. Batch a week of posts in one session so your presence stays steady regardless of client work. Sustained visibility keeps you top of mind for the moment a business decides it needs marketing help, and it demonstrates the discipline you preach. For you, a consistent feed is both lead generation and a credibility proof.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so you model the content consistency you'd advise any client to maintain.",
      },
      {
        step_number: 7,
        title: "Keep a polished, results-oriented visual identity",
        description:
          "As a marketing consultant, your feed is a sample of your marketing ability, so it needs to look sharp and intentional. A polished, consistent visual identity signals that you know how to make marketing look and perform well — a scrappy feed would suggest otherwise. Lock in your template once so every proof carousel and playbook post carries the same professional polish. Your feed's quality is a live demonstration of the marketing competence prospects are evaluating.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel polished and consistent, so your feed demonstrates your marketing competence.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, marketing consultants lived the cobbler's-children problem: you drove great results for clients while your own marketing went neglected. Client work ate your hours, so your feed went quiet or generic — undercutting the very expertise you sell. Your client results stayed private, your sharp strategic takes stayed unwritten, and prospects couldn't tell you apart from the sea of consultants repeating best-practice platitudes. You'd advise any client that consistent content was essential, yet your own presence was inconsistent, and the gap cost you the credibility and leads your expertise deserved.",
    after_carouselabs:
      "With CarouseLabs, you finally market yourself as well as you market clients. A client result becomes a proof-driven carousel that answers the skeptic. A contrarian take challenges marketing conventional wisdom and marks you as a strategic thinker. Your method becomes a playbook carousel prospects respect. Because you batch a week in one session, you model the consistency you preach and stay top of mind for the moment a business needs help. Your polished feed demonstrates the marketing competence prospects are evaluating, and the gap between your advice and your own practice finally closes.",
    time_to_first_post:
      "About 20 minutes including onboarding — most marketing consultants turn one client result into a first carousel the same day.",
    quick_wins: [
      "Your first proof-driven carousel that answers the skeptical buyer's question with real results.",
      "A playbook post that lets prospects experience your marketing thinking firsthand.",
      "A consistent feed that finally models the discipline you'd advise any client to keep.",
    ],
  },
  "innovation-consultants": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Stake out the kind of innovation you help unlock",
        description:
          "Innovation is a vague buzzword, so ground your positioning in the specific outcome you enable — new product development, corporate innovation culture, disruptive strategy, design thinking transformation. Anchor your content to it. Organizations seeking innovation help want a consultant with a concrete methodology, not an abstract 'innovation guru.' This focus separates you from the buzzword crowd and makes your content resonate with leaders who have a real innovation problem, which is when they're ready to bring in outside help.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your specific innovation methodology, so your feed avoids the buzzword vagueness the space is known for.",
      },
      {
        step_number: 2,
        title: "Turn innovation engagements into concrete case content",
        description:
          "Your value is helping organizations actually innovate, so your engagement stories — the stalled team you unblocked, the process that produced a breakthrough — are your best proof, anonymized and with permission. Keep a note of these and the specific intervention behind each. Because innovation results feel intangible and buzzword-laden, concrete stories of real change make your work credible. Showing the method behind the breakthrough proves you have a repeatable approach, not just inspiring talks.",
        time_required: "10 min per case",
        carouselabs_tip:
          "CarouseLabs turns an innovation engagement into a concrete case carousel, so your intangible-sounding work becomes credible and specific.",
      },
      {
        step_number: 3,
        title: "Write hooks that puncture innovation theater",
        description:
          "Innovation hooks land when they call out the fake version everyone recognizes: 'Your innovation lab is theater. Here's why nothing ships.' Naming the gap between innovation talk and real results signals that you're the consultant who delivers substance, not workshops that go nowhere. Leaders are cynical about innovation buzz, so a hook that acknowledges that cynicism and promises the real thing cuts through and marks you as refreshingly honest and genuinely capable.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that puncture innovation theater, so your posts read as substance to leaders cynical about buzzwords.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a real innovation method",
        description:
          "Structure a carousel around one method: how to run a real discovery sprint, how to kill bad ideas fast, how to build an innovation culture that ships. Walk through the problem, why most attempts fail, your method, the steps, and the outcome. Teaching a genuine, practical method demonstrates the substance behind your work and separates you from the inspiration-only crowd. Leaders hire innovation consultants with concrete approaches, so showing your method openly is direct credibility-building.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full innovation-method carousel from your notes, so your practical methodology becomes visible proof you deliver, not just inspire.",
      },
      {
        step_number: 5,
        title: "Share your view on what's actually driving change",
        description:
          "Innovation consultants must be ahead of the curve, so share your grounded perspective on real shifts — the technologies, behaviors, and business-model changes actually reshaping industries. Cut through the hype to what matters. This positions you as a credible futurist rather than a buzzword-dropper, and it attracts the forward-thinking organizations that make the best innovation clients. Being the voice who separates real change from noise is exactly the judgment leaders want from an innovation advisor.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape a grounded take on real change into a post, so your feed reads as credible foresight, not hype.",
      },
      {
        step_number: 6,
        title: "Stay visible to organizations at their innovation crossroads",
        description:
          "Companies seek innovation help at specific inflection points — disruption threats, stalled growth, digital transformation — that arrive unpredictably. Consistent presence keeps you top of mind for those moments. Batch a week of posts in one session to maintain steady visibility despite project demands. For high-value, relationship-driven consulting, being the innovation authority a leader has followed and come to trust is what turns their crossroads into an engagement with you.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your innovation authority stays visible for the unpredictable moment a company reaches its crossroads.",
      },
      {
        step_number: 7,
        title: "Present with modern, credible visuals",
        description:
          "As an innovation consultant, a dated or scrappy feed undercuts your entire premise — you should look forward-thinking and considered. A clean, modern, consistent visual identity reinforces that you're at the edge of your field. Lock in your template once so every case carousel and method post carries the same contemporary polish. For someone selling innovation, a feed that looks current and intentional is itself a small signal that you practice the forward-thinking you preach.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel modern and consistent, so your feed looks as forward-thinking as your work.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, innovation consultants battled buzzword fatigue with no time to prove their substance. Your work produced real, concrete change, but between engagements there was no time to create content, and turning innovation methods into credible posts felt hard. So your feed defaulted to the vague 'innovation is the future' content that makes leaders roll their eyes, your real cases stayed private, and cynical decision-makers couldn't tell your substantive work from the theater. You delivered genuine breakthroughs while buzzword-droppers won the attention — and the engagements you were better equipped to handle.",
    after_carouselabs:
      "With CarouseLabs, the substance of your innovation work finally shows. An engagement becomes a concrete case carousel that proves real change. A hook that punctures innovation theater reads as refreshing substance to cynical leaders. Your method becomes a carousel that proves you deliver, not just inspire. Your grounded take on real change reads as credible foresight. Because you batch a week in one session, your authority stays visible for the unpredictable moment a company reaches its crossroads — so you're the advisor they trust. Your modern, polished feed looks as forward-thinking as the work you do.",
    time_to_first_post:
      "About 20 minutes including onboarding — most innovation consultants turn one engagement into a first case carousel the same day.",
    quick_wins: [
      "Your first concrete case carousel that proves your innovation work drives real, specific change.",
      "A method post that shows cynical leaders you deliver substance, not workshops that go nowhere.",
      "Your first inbound from a leader who says your content proved you're the real thing, not innovation theater.",
    ],
  },
  "diversity-inclusion-consultants": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Ground your work in measurable business and human outcomes",
        description:
          "D&I consulting faces skepticism and backlash, so anchor your positioning in the concrete outcomes you drive — better retention, stronger teams, measurable culture change, real belonging. Choose your focus and build content around it. Organizations serious about inclusion want a consultant with substance and results, not slogans. This focus separates you from performative D&I and makes your content resonate with leaders genuinely committed to change, which is where the meaningful, well-resourced engagements are.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on measurable inclusion outcomes, so your feed reads as substantive work rather than slogans.",
      },
      {
        step_number: 2,
        title: "Turn engagement wins into evidence of real change",
        description:
          "Your engagements produce real shifts — the retention that improved, the culture that opened up, the leadership that finally listened — and those anonymized stories are your best proof. Keep a note of these and the specific intervention behind each. Because D&I is often dismissed as fluffy, concrete evidence of measurable change makes your work credible to skeptical decision-makers. Showing your method and its results proves you deliver business impact, which is what secures serious engagements.",
        time_required: "10 min per case",
        carouselabs_tip:
          "CarouseLabs turns an engagement win into an evidence-based carousel, so your work reads as measurable impact, not good intentions.",
      },
      {
        step_number: 3,
        title: "Write hooks that reframe inclusion as a business imperative",
        description:
          "D&I hooks land when they connect inclusion to outcomes leaders care about: 'Your best people are leaving, and your exit interviews are hiding why.' Framing inclusion in terms of retention, performance, and risk speaks to business reality and disarms skepticism. Avoid hooks that preach; lead with the concrete stakes. This reframing attracts the pragmatic leaders who'll fund real work and signals that you understand the business case, not just the moral one — which is what makes serious organizations engage.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that frame inclusion as a business imperative, so your posts reach pragmatic leaders, not just the already-convinced.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a practical inclusion step",
        description:
          "Structure a carousel around one concrete practice: how to run inclusive meetings, how to de-bias hiring, how to make feedback equitable. Walk through the problem, the common well-intentioned mistake, your practice, the steps, and the outcome. Teaching a genuinely practical step demonstrates that your work is actionable, not abstract, and gives leaders something they can implement today. Practical substance is what separates you from the awareness-only crowd and proves your engagements produce real change.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full inclusion-practice carousel from your notes, so your work reads as actionable and practical, not abstract.",
      },
      {
        step_number: 5,
        title: "Address the hard, honest realities with nuance",
        description:
          "D&I is a charged, complex space, and consultants who bring honest nuance — acknowledging tensions, avoiding both defensiveness and preachiness — build the most trust. Share content that navigates the difficult conversations thoughtfully. This positions you as a credible, mature guide rather than a divisive figure, and it reassures leaders that you'll handle sensitive work with the judgment it requires. Being the voice of grounded, honest nuance in a polarized space is a powerful differentiator.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape nuanced, honest takes on difficult topics into posts, so your feed reads as mature guidance, not polarizing rhetoric.",
      },
      {
        step_number: 6,
        title: "Stay consistently visible to committed organizations",
        description:
          "Organizations commit to D&I work at specific moments — a crisis, a leadership change, a strategic push — that arrive unpredictably. Consistent presence keeps you top of mind for those moments. Batch a week of posts in one session to maintain steady, credible visibility despite engagement demands. For relationship-driven consulting in a scrutinized field, being the substantive expert a leader has followed and come to trust is what turns their moment of commitment into an engagement with you.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your credible presence stays steady for the moment an organization commits to real inclusion work.",
      },
      {
        step_number: 7,
        title: "Present with professional, credible visuals",
        description:
          "In a scrutinized field, a polished, professional visual identity reinforces that you're a serious, substantive consultant. A clean, consistent look signals rigor and credibility, helping your evidence-based content land with discerning leaders. Lock in your template once so every evidence carousel and practice post carries the same professional polish. A considered feed quietly supports the impression that your D&I work is as rigorous and results-driven as you say.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel professional and consistent, so your feed reinforces your substantive credibility.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, D&I consultants did substantive, results-driven work but struggled to make it visible amid skepticism and noise. Between engagements there was no time to create content, and turning charged, complex topics into credible posts was genuinely hard. So your feed went quiet or leaned on slogans that fed the 'D&I is fluffy' dismissal, your real engagement wins stayed private, and pragmatic leaders couldn't tell your measurable work from performative box-ticking. You drove genuine change while performative voices shaped the conversation — and the serious organizations you could help best couldn't find the substance beneath the noise.",
    after_carouselabs:
      "With CarouseLabs, the substance of your inclusion work becomes visible. An engagement win becomes an evidence-based carousel that reads as measurable impact. A hook framing inclusion as a business imperative reaches pragmatic leaders. Your practice becomes an actionable carousel leaders can implement. Your nuanced takes read as mature guidance in a polarized space. Because you batch a week in one session, your credible presence stays steady for the moment an organization commits to real work — so you're the trusted expert they engage. Your professional feed reinforces that your D&I work is as rigorous and results-driven as you say.",
    time_to_first_post:
      "About 20 minutes including onboarding — most D&I consultants turn one engagement win into a first carousel the same day.",
    quick_wins: [
      "Your first evidence-based carousel that reads as measurable impact, not good intentions.",
      "A business-case hook that reaches pragmatic leaders beyond the already-convinced.",
      "Your first inbound from an organization that says your content proved you do substantive, results-driven work.",
    ],
  },
  "performance-coaches": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define the peak performance you help people reach",
        description:
          "Performance coaching serves distinct clients — executives, athletes, high-achieving professionals, founders — each chasing a different edge. Choose your focus and the specific performance outcome you deliver, and anchor your content there. High performers want a coach who understands their particular arena and pressure, not generic motivation. This focus makes your content resonate with ambitious people who take performance seriously, which is exactly the driven clientele who invest in coaching to gain an edge.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your specific performance arena, so your feed speaks to the driven clients you actually serve.",
      },
      {
        step_number: 2,
        title: "Turn client breakthroughs into performance stories",
        description:
          "Your clients' breakthroughs — the executive who stopped burning out, the founder who found focus, the athlete who broke through a plateau — are your best content, with permission. Keep a note of these and the specific method behind each. High performers are evidence-driven, so a concrete story of measurable improvement is more persuasive than any motivational message. Showing the systematic approach behind the breakthrough proves you deliver a real methodology, which is what serious performers want to see.",
        time_required: "10 min per client story",
        carouselabs_tip:
          "CarouseLabs turns a client's performance breakthrough into an evidence-driven story carousel, so your results persuade an outcome-focused audience.",
      },
      {
        step_number: 3,
        title: "Write hooks that speak to the high performer's edge",
        description:
          "Performance hooks land when they promise a specific edge or expose a hidden limiter: 'The reason talented people plateau isn't effort. It's recovery.' High performers stop scrolling for a genuine competitive advantage or a sharp insight about why they're stuck. Leading with a substantive, non-obvious angle about performance speaks to their constant drive to optimize, and it signals that you offer real methodology rather than the surface-level motivation they've long outgrown.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that promise a real performance edge, so your posts grab high performers instead of getting dismissed as motivation.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a real performance system",
        description:
          "Structure a carousel around one system: how to build sustainable focus, how to manage energy across a demanding week, how to recover for peak output. Walk through the problem, the common mistake driven people make, your system, the steps, and the result. A genuinely usable performance system builds credibility fast, because when a high achiever tries your method and gets a real gain, they believe your coaching can unlock the next level. Systematic substance beats motivation for this discerning audience.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full performance-system carousel from your method, so your free content delivers a real system, not a pep talk.",
      },
      {
        step_number: 5,
        title: "Champion sustainable performance over burnout",
        description:
          "The performance coaches who stand out reject grind-till-you-break culture and teach sustainable peak performance. Share content about recovery, energy management, and avoiding the burnout that sabotages driven people. This resonates with high achievers who've hit the wall and secretly know pushing harder isn't working. Positioning yourself as the coach who helps people perform at their peak without breaking attracts the ambitious clients who want longevity, not just another sprint into exhaustion.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs mixes sustainable-performance angles into your idea feed, so your content speaks to driven people wary of burnout, not just grind.",
      },
      {
        step_number: 6,
        title: "Stay consistently visible to ambitious, discerning buyers",
        description:
          "High performers decide to hire a coach at moments of ambition or frustration that arrive unpredictably. Consistent presence keeps you top of mind for those moments. Batch a week of posts in one session to maintain steady, substantive visibility despite a full coaching schedule. And as a performance coach, staying consistent without burning out is itself a demonstration of your methods. Sustained presence is what makes you the coach a driven achiever turns to when they decide to level up.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so you stay top of mind for ambitious buyers — while modeling the sustainable performance you teach.",
      },
      {
        step_number: 7,
        title: "Present with sharp, high-caliber visuals",
        description:
          "Your audience operates at a high level and notices quality, so your feed should look as sharp and intentional as the performance you help build. A polished, consistent visual identity signals excellence and reinforces your credibility with discerning, high-achieving buyers. Lock in your template once so every breakthrough story and system carousel carries the same high-caliber polish. For a performance coach, a feed that exemplifies excellence is a fitting demonstration of the standards you help clients reach.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel sharp and consistent, so your feed reflects the excellence your coaching builds.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, performance coaches served a discerning, evidence-driven audience but had no time to prove their substance publicly. Your systematic methods produced real, measurable gains, but between client sessions there was no time to create content, and your feed defaulted to the generic motivation that high performers have long outgrown. Your client breakthroughs stayed private, your sustainable-performance philosophy stayed unspoken, and ambitious achievers couldn't tell your real methodology from the grind-harder crowd. You delivered genuine edges while louder motivational voices won the attention of the clients you were best equipped to elevate.",
    after_carouselabs:
      "With CarouseLabs, your systematic methods finally reach the high performers who value them. A client breakthrough becomes an evidence-driven story that persuades an outcome-focused audience. A real edge becomes a hook that grabs driven people. Your method becomes a system carousel that delivers a genuine gain. Because you batch a week in one session, you stay top of mind for ambitious buyers while modeling the sustainable performance you teach. Your focus on sustainability sets you apart from the burnout crowd, and your sharp, high-caliber feed reflects the excellence your coaching builds.",
    time_to_first_post:
      "About 20 minutes including onboarding — most performance coaches turn one client breakthrough into a first carousel the same day.",
    quick_wins: [
      "Your first evidence-driven breakthrough carousel that persuades an outcome-focused, discerning audience.",
      "A performance-system post that delivers a real gain and builds credibility toward your coaching.",
      "Your first inbound from a high achiever who says your content offered a genuine edge, not just motivation.",
    ],
  },
  "digital-marketers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Decide the digital marketing edge you want to be known for",
        description:
          "Digital marketing is broad and crowded, so pick your lane — paid acquisition, SEO, conversion optimization, marketing automation, full-funnel strategy. Anchor your content to that expertise. Whether you're building a personal brand for career growth, freelance clients, or authority in the field, a clear specialty makes you the name people associate with that skill. This focus cuts through the noise of generalist marketing content and attracts the specific opportunities — jobs, clients, or collaborations — tied to your expertise.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content anchored to your digital marketing specialty, so your feed builds recognition for one skill rather than everything.",
      },
      {
        step_number: 2,
        title: "Turn campaigns and experiments into tactical content",
        description:
          "Your best content is the real campaigns and tests you run — the ad that crushed it, the A/B test that surprised you, the funnel fix that lifted conversions. Keep a note of these results and the specific insight behind each. Digital marketers are hungry for tactical, real-world data, so sharing your actual experiments (with numbers where you can) is far more valuable than theory. It proves you're a practitioner, not a pundit, which is what earns respect in a field full of armchair experts.",
        time_required: "10 min per experiment",
        carouselabs_tip:
          "CarouseLabs turns a real campaign or experiment into a tactical carousel, so your hands-on results become the practitioner content peers respect.",
      },
      {
        step_number: 3,
        title: "Write hooks that promise a specific, tested tactic",
        description:
          "Digital marketing hooks land when they promise a concrete, data-backed tactic: 'The landing page change that lifted our conversion rate 34%.' Leading with a specific number and a usable tactic speaks to marketers' constant hunt for what actually works. Avoid vague 'marketing tips' hooks — this audience is sophisticated and allergic to fluff. A precise, results-backed angle promises real value and marks you as someone who's actually in the arena testing things.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates tactical, number-backed hooks, so your posts grab a sophisticated marketing audience hungry for what actually works.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a real, replicable tactic",
        description:
          "Structure a carousel around one tactic others can copy: how to structure a high-converting ad, how to build an email flow, how to audit a funnel. Walk through the situation, the common mistake, your tactic, the steps, and the result. Giving away a genuinely replicable tactic builds authority fast, because when a marketer tries your method and it works, they follow you for more. In a peer-heavy field, shareable tactical value is exactly what spreads your reach and reputation.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full tactical carousel from your method, so your expertise becomes replicable value that spreads across the marketing community.",
      },
      {
        step_number: 5,
        title: "Share your take on the fast-changing marketing landscape",
        description:
          "Digital marketing changes constantly — algorithm updates, new channels, AI tools, privacy shifts — and having a sharp take on these positions you as a current, informed voice. Share your perspective on what's changing and what it means for marketers. This keeps your content timely and relevant, attracts engagement from peers debating the same shifts, and builds your reputation as someone who's ahead of the curve rather than repeating last year's playbook.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs surfaces trending marketing developments and helps you shape a take, so your feed stays current in a fast-moving field.",
      },
      {
        step_number: 6,
        title: "Post consistently to compound your authority",
        description:
          "In digital marketing, personal authority compounds — the marketer who posts consistently becomes a known name, which opens jobs, clients, and speaking. Batch a week of posts in one session so your presence stays steady regardless of workload. Consistency is what turns sporadic good posts into a genuine reputation, and for marketers specifically, a strong personal brand is often worth more to your career than any single campaign result. Reliable visibility is the long game that pays off.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your authority-building presence stays consistent even during your busiest campaign periods.",
      },
      {
        step_number: 7,
        title: "Make your feed a demonstration of good marketing",
        description:
          "As a digital marketer, your feed is a live sample of your marketing sense, so it needs to look sharp, scroll-stopping, and consistent. A polished visual identity demonstrates that you understand what makes content perform — the exact skill you're known for. Lock in your template once so every tactical carousel and experiment post looks the part. Your feed's quality is itself a portfolio piece, quietly proving your marketing competence to every peer, recruiter, or client who scrolls by.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel scroll-stopping and consistent, so your feed demonstrates the marketing sense you're known for.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, digital marketers knew a personal brand could transform their career or client pipeline, but the irony was brutal: you marketed everyone else while neglecting yourself. Client campaigns and workload ate your hours, so your feed went quiet, and the real experiments and results that would have proven your expertise stayed locked in your dashboards. When you did post, it was generic marketing tips indistinguishable from the crowd, building no distinct authority. Meanwhile the jobs, clients, and opportunities went to marketers who'd built a visible reputation, and your genuine practitioner expertise stayed invisible.",
    after_carouselabs:
      "With CarouseLabs, you finally market yourself as well as your clients. A real campaign becomes a tactical carousel peers respect. A tested tactic becomes a data-backed hook that grabs a sophisticated audience. Your method becomes replicable value that spreads your reach. Your take on a landscape shift keeps you current and ahead of the curve. Because you batch a week in one session, your authority-building presence stays consistent through your busiest periods — and authority compounds into jobs, clients, and opportunities. Your scroll-stopping feed becomes a live demonstration of the marketing sense you're known for.",
    time_to_first_post:
      "About 15 minutes from signup — appropriately fast for someone whose whole craft is content and marketing.",
    quick_wins: [
      "Your first tactical carousel from a real campaign — practitioner content that earns peer respect.",
      "A batched week of posts that keeps your authority compounding through a busy campaign period.",
      "Your first opportunity — a job lead, client, or collaboration — that came from your visible expertise.",
    ],
  },
  "content-marketers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define the content expertise you want to be known for",
        description:
          "Content marketing spans strategy, SEO content, storytelling, distribution, and more — so pick the facet you want your name attached to. Anchor your personal content around it. Whether you're building authority for career moves, freelance work, or industry standing, a clear specialty makes you the go-to voice for that thing. This focus separates you from the ocean of generic content-marketing advice and attracts the specific opportunities tied to your expertise, rather than blending into the crowd.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your content-marketing specialty, so your feed builds authority on one facet rather than everything.",
      },
      {
        step_number: 2,
        title: "Practice your craft visibly — your feed is your portfolio",
        description:
          "As a content marketer, your own content is the ultimate proof of your ability — mediocre posts undermine every claim you make. Treat your feed as a live portfolio that demonstrates the strategy, storytelling, and quality you sell. Keep a note of the content lessons you learn in your work and turn them into posts. There's no faking it here: consistently producing excellent content is the single most persuasive evidence that you know how to do content marketing.",
        time_required: "10 min, ongoing",
        carouselabs_tip:
          "CarouseLabs helps you consistently produce high-quality content, so your feed becomes the living portfolio your content-marketing career depends on.",
      },
      {
        step_number: 3,
        title: "Write hooks that demonstrate content mastery",
        description:
          "Your hooks are a live audition — they must exemplify the scroll-stopping skill you claim to have. Craft hooks that promise real value and prove your storytelling: 'The content strategy mistake killing your organic reach (and the fix).' Because your subject is content itself, every hook you write is simultaneously a lesson and a demonstration. Nailing your hooks proves you understand attention, which is the core of the content marketing you're selling.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates strong hook options, so every post demonstrates the attention-grabbing skill you're known for as a content marketer.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a content framework",
        description:
          "Structure a carousel around one framework: how to build a content engine, how to repurpose one piece into ten, how to write for search and humans at once. Walk through the problem, the common mistake, your framework, the steps, and the result. Teaching your content methodology openly demonstrates your expertise and, done well, proves your quality in the very act of sharing. For a content marketer, a great teaching carousel is both the message and the proof.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full framework carousel from your method — demonstrating, in its own quality, the content skill you're teaching.",
      },
      {
        step_number: 5,
        title: "Share your perspective on the evolving content landscape",
        description:
          "Content marketing shifts constantly — AI content, changing SEO, new formats, distribution challenges — and a sharp take on these keeps you relevant and sparks engagement. Share your view on where content is heading and what marketers should do about it. This positions you as a forward-thinking voice rather than someone repeating outdated advice, and it attracts the peers and prospects who want a content marketer who's genuinely current in a fast-moving discipline.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs surfaces content-marketing trends and helps you shape a take, so your feed stays relevant in a rapidly changing field.",
      },
      {
        step_number: 6,
        title: "Model the consistency content marketing demands",
        description:
          "You know consistency is the heart of content marketing, so your own feed must embody it — sporadic posting contradicts your entire expertise. Batch a week of posts in one session so your presence never lapses regardless of workload. Your reliable output is itself a demonstration of the discipline you preach, and it compounds into the authority that opens career and client opportunities. For a content marketer, walking your own consistency talk is non-negotiable credibility.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so you model the content consistency you preach even during your busiest weeks.",
      },
      {
        step_number: 7,
        title: "Set the visual standard you'd advise others to meet",
        description:
          "Your carousels should exemplify the content quality you champion — you can't credibly preach great content while posting mediocre-looking slides. A polished, consistent visual identity makes your feed a standard others aspire to and demonstrates your understanding of format and presentation. Lock in your template once so every framework post and craft lesson looks the part. For a content marketer, a visually excellent feed is a continuous, silent proof of your expertise.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel polished and consistent, so your feed models the content standard you champion.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, content marketers faced a painful contradiction: your career depended on a standout personal feed, but producing content for employers or clients left you no time or energy to create your own. So your feed — the ultimate proof of your ability — went quiet or looked mediocre, undermining every claim you made about content excellence. Your real content lessons stayed unwritten, and prospects and recruiters couldn't tell you apart from the generic content-marketing crowd. You were the content expert whose own content strategy was neglected, and the gap quietly cost you the authority and opportunities your skills deserved.",
    after_carouselabs:
      "With CarouseLabs, your feed finally becomes the living portfolio your career depends on. A content lesson becomes a framework carousel that teaches while demonstrating your quality. Every hook doubles as proof of your attention-grabbing skill. Your take on the content landscape keeps you current. Because you batch a week in one session, you model the consistency you preach even during your busiest weeks — and that consistency compounds into authority. The contradiction closes: instead of the content expert with a neglected feed, you become the content marketer whose own posts are the most persuasive proof of your expertise.",
    time_to_first_post:
      "About 15 minutes from signup — appropriately fast for someone whose entire craft is content creation.",
    quick_wins: [
      "Your first framework carousel that teaches your methodology while demonstrating your content quality.",
      "A consistently excellent feed that finally becomes the living portfolio your career depends on.",
      "Your first opportunity — a role, client, or collaboration — sparked by your visible content expertise.",
    ],
  },
  "social-media-managers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Build your own brand while you build everyone else's",
        description:
          "Social media managers spend all day growing brands and often neglect their own — yet a strong personal presence is your best career asset. Decide the expertise you want to be known for: platform strategy, community, content systems, paid social. Anchor your LinkedIn content to it. Your personal feed proves you can do the job better than any resume, and in a field where hiring managers check your socials, a standout presence is a direct pipeline to better roles and clients.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your social media specialty, so your feed builds a personal brand as strong as the ones you manage.",
      },
      {
        step_number: 2,
        title: "Turn your daily platform work into insider content",
        description:
          "You have front-line knowledge of what actually works across platforms — the post types that perform, the algorithm quirks, the community tactics. Keep a note of these insights as you work. Sharing real, current platform know-how is hugely valuable because so much social media advice is outdated or theoretical. Your hands-on experience managing real accounts makes you a credible insider, which is exactly the authority that attracts better job offers and freelance clients.",
        time_required: "10 min, ongoing",
        carouselabs_tip:
          "CarouseLabs turns a platform insight into a carousel, so your front-line social media knowledge becomes credible insider content.",
      },
      {
        step_number: 3,
        title: "Write hooks that promise current platform know-how",
        description:
          "Your hooks should promise the timely, tactical insight only a practitioner has: 'What's actually working on LinkedIn right now (from managing 12 accounts).' Referencing your hands-on scale and current results signals credibility and specificity. Social media changes fast, so a hook that promises what works now — not last year — cuts through the outdated advice and grabs peers, marketers, and potential employers hungry for current tactics.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that promise current, practitioner-grade platform insight, so your posts stand out from outdated social media advice.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a real social media system",
        description:
          "Structure a carousel around one system: how to build a content calendar that doesn't burn you out, how to boost engagement, how to repurpose across platforms. Walk through the problem, the common mistake, your system, the steps, and the result. Teaching a genuinely usable system demonstrates your expertise and proves your quality in the doing. A great carousel about social media, made by a social media manager, is both the lesson and the proof of your competence.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full system carousel from your method — demonstrating, in its own quality, the social media skill you're teaching.",
      },
      {
        step_number: 5,
        title: "Share your take on platform shifts and trends",
        description:
          "Platforms change constantly — new features, algorithm updates, rising formats — and having a sharp, current take positions you as an informed voice worth following. Share your perspective on what a change means for brands and creators. This keeps your content timely, sparks engagement from peers navigating the same shifts, and builds your reputation as a social media manager who's genuinely ahead of the curve rather than reacting late to every update.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs surfaces platform developments and helps you shape a take, so your feed stays current with every shift in the social landscape.",
      },
      {
        step_number: 6,
        title: "Post consistently on your own account without burning out",
        description:
          "You manage relentless content schedules for clients, so your own account is easy to abandon by end of day. Batch a week of your personal posts in one session so your presence stays consistent without adding to your burnout. Sustained visibility compounds into the personal authority that opens career and freelance opportunities — and as a social media manager, staying consistent on your own feed proves you can sustain the very output you deliver for brands.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week of your own posts at once, so your personal presence stays consistent without adding to your daily content load.",
      },
      {
        step_number: 7,
        title: "Make your feed a showcase of social media excellence",
        description:
          "Your personal feed is a live demo of your social media ability, so it must look sharp, scroll-stopping, and consistent. A polished visual identity demonstrates the content sense you're hired for — a scrappy feed would undercut it. Lock in your template once so every insight and system carousel looks the part. Your feed's quality is a continuous portfolio piece, proving your competence to every recruiter, client, and peer who scrolls by.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel scroll-stopping and consistent, so your feed showcases the social media excellence you're hired for.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, social media managers lived the ultimate irony: you grew brands all day and had nothing left for your own presence. By the time client and brand content was scheduled, you were too drained to post for yourself, so your personal feed — your best career asset — sat neglected. The front-line platform knowledge that would have made you a credible insider stayed unshared, and recruiters and potential clients who checked your socials saw a quiet account that undersold your skills. You could grow anyone's brand but your own, and the gap quietly cost you the roles and opportunities your expertise deserved.",
    after_carouselabs:
      "With CarouseLabs, you finally build your own brand as well as everyone else's. A platform insight becomes insider content that proves your credibility. A hook promises current, practitioner-grade know-how. Your method becomes a system carousel that teaches while demonstrating your quality. Because you batch a week of your own posts in one session, your personal presence stays consistent without adding to your burnout — and that visibility compounds into authority that opens roles and freelance clients. Instead of the manager with a neglected feed, you become the social media pro whose own account is the strongest proof of your skill.",
    time_to_first_post:
      "About 15 minutes from signup — appropriately fast for a social media professional.",
    quick_wins: [
      "Your first insider carousel that turns your front-line platform knowledge into credible authority.",
      "A consistent personal feed built without adding to your daily content burnout.",
      "Your first opportunity — a role or client — from finally showcasing your own social media skill.",
    ],
  },
  "performance-marketers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Anchor your brand to the metrics you move",
        description:
          "Performance marketing is pure results, so anchor your content to the numbers you drive — ROAS, CAC, conversion rates, LTV. Decide the specific performance outcome you're expert in (paid acquisition, CRO, full-funnel efficiency) and build content around it. Whether for career growth or freelance clients, a reputation for moving a specific metric makes you the name people want. In a field where everyone claims results, owning a clear performance specialty is what builds real, differentiated authority.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on the metrics you move, so your feed builds authority in the language performance marketers respect.",
      },
      {
        step_number: 2,
        title: "Turn campaign data into proof-driven content",
        description:
          "Your best content is real campaign results — the account you turned around, the test that dropped CAC, the scaling play that worked. Keep a note of these outcomes and the specific lever behind each. Performance marketers live and die by data, so sharing actual numbers (anonymized where needed) and the reasoning is intensely credible. It proves you're a practitioner who moves metrics, not a theorist — which is the only kind of authority that matters in this results-obsessed field.",
        time_required: "10 min per campaign",
        carouselabs_tip:
          "CarouseLabs turns real campaign data into a proof-driven carousel, so your results become the credibility performance marketers respect.",
      },
      {
        step_number: 3,
        title: "Write hooks with specific numbers and hard truths",
        description:
          "Performance hooks land when they lead with a specific result or a data-backed truth: 'We cut CAC 40% by killing our best-performing campaign. Here's the counterintuitive reason.' Concrete numbers and counterintuitive insights signal you're in the arena. This audience is sophisticated and data-driven, so vague hooks get scrolled past instantly — but a precise, results-backed angle promises the real, applicable insight they're hunting for.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates number-led, counterintuitive hooks, so your posts grab a data-driven audience allergic to vague claims.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a replicable optimization",
        description:
          "Structure a carousel around one optimization others can apply: how to structure a testing framework, how to read attribution honestly, how to scale spend without tanking efficiency. Walk through the situation, the common mistake, your approach, the steps, and the result. Giving away a genuinely replicable performance tactic builds authority fast — when a marketer applies your method and their numbers improve, they follow you and share your work, spreading your reputation across a tight, peer-driven community.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full optimization carousel from your method, so your tactics become replicable value that spreads across the performance community.",
      },
      {
        step_number: 5,
        title: "Share your take on the shifting performance landscape",
        description:
          "Performance marketing is upended constantly — privacy changes, platform shifts, rising CACs, AI-driven bidding — and a sharp take on these positions you as a strategic voice, not just a button-pusher. Share your perspective on what's changing and how smart marketers should adapt. This elevates you above tactical execution into strategic thinking, which is what attracts senior roles, better clients, and the respect of a field that's watching these shifts nervously.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs surfaces performance-marketing developments and helps you shape a take, so your feed reads as strategic thinking, not just tactics.",
      },
      {
        step_number: 6,
        title: "Post consistently to build authority beyond the dashboard",
        description:
          "Your daily grind is buried in dashboards and campaigns, so personal content easily slips. But a visible personal brand is what separates a senior performance marketer from an interchangeable one — it opens leadership roles and premium clients. Batch a week of posts in one session so your authority-building stays consistent regardless of campaign chaos. In a results-driven field, the marketer who's both effective and visible wins the best opportunities.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your authority-building presence stays consistent even during heavy campaign periods.",
      },
      {
        step_number: 7,
        title: "Present data cleanly with a sharp visual identity",
        description:
          "Performance marketers work with numbers, and your carousels should present them clearly and credibly. A clean, consistent, data-friendly visual identity makes your results easy to grasp and your feed instantly recognizable. Lock in your template once so every proof carousel and optimization post carries the same sharp polish. Clear presentation of data is itself a signal of the analytical rigor you bring, quietly reinforcing your credibility with every scroll.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clean and consistent, so your data-driven content reads as clearly as your analysis.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, performance marketers were buried in dashboards with no time to build the personal brand that advances a career. You moved real metrics for employers and clients, but that proof stayed locked in ad accounts, never becoming the content that would establish you as an authority. When you did post, it was generic marketing advice that built no data-driven credibility. Meanwhile the senior roles and premium clients went to performance marketers who were both effective and visible, and your genuine, results-backed expertise stayed invisible behind the campaigns you were quietly crushing.",
    after_carouselabs:
      "With CarouseLabs, your results finally become visible authority. A campaign turnaround becomes a proof-driven carousel that reads as real credibility. A specific number becomes a hook that grabs a data-driven audience. Your method becomes a replicable optimization that spreads across the community. Your take on landscape shifts elevates you from button-pusher to strategic voice. Because you batch a week in one session, your authority-building stays consistent through campaign chaos — and in a results-driven field, being both effective and visible wins the best roles and clients. Your sharp, data-clean feed makes your rigor obvious at a glance.",
    time_to_first_post:
      "About 15 minutes from signup — appropriately fast for a marketer who lives in data and content.",
    quick_wins: [
      "Your first proof-driven carousel that turns real campaign results into visible authority.",
      "A replicable optimization post that spreads your reputation across the performance community.",
      "Your first opportunity — a senior role or premium client — from finally being both effective and visible.",
    ],
  },
  "seo-specialists": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Own a specific corner of the SEO world",
        description:
          "SEO is vast — technical, content, local, ecommerce, link building — so pick your specialty and anchor your content to it. Whether you're building authority for consulting, freelance, or in-house advancement, being known for a specific SEO discipline beats being a vague generalist. This focus attracts the exact clients and opportunities tied to your expertise, and in a field crowded with contradictory advice, a clear specialty makes you a trusted, findable authority on your particular slice of search.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your SEO specialty, so your feed builds authority on one discipline rather than everything.",
      },
      {
        step_number: 2,
        title: "Turn your real SEO results into case-study content",
        description:
          "Your best content is real ranking wins and traffic growth — the site you turned around, the technical fix that unlocked crawling, the content play that captured a competitive keyword. Keep a note of these results and the specific strategy behind each. SEO is full of theory and myth, so sharing actual case studies with real data makes you enormously credible. Proof of ranking results is the strongest evidence that you know how search actually works.",
        time_required: "10 min per case",
        carouselabs_tip:
          "CarouseLabs turns a real SEO win into a case-study carousel, so your ranking results become the proof that builds your authority.",
      },
      {
        step_number: 3,
        title: "Write hooks that cut through SEO myths and confusion",
        description:
          "SEO hooks land when they debunk a myth or reveal a tested truth: 'The ranking factor everyone obsesses over that barely moves the needle.' The SEO space is drowning in outdated advice and myths, so a hook that promises clarity from real testing cuts through instantly. Leading with a data-backed, myth-busting angle positions you as a credible practitioner among the guesswork, and it grabs the marketers and business owners confused by contradictory search advice.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates myth-busting, tested-truth hooks, so your posts bring clarity to a field drowning in SEO confusion.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a real SEO process",
        description:
          "Structure a carousel around one process: how to run a technical audit, how to build topical authority, how to do keyword research that actually converts. Walk through the problem, the common mistake, your process, the steps, and the result. Teaching a genuinely usable SEO process demonstrates your expertise and gives readers real value. When someone applies your method and their rankings improve, you earn a follower and an advocate, spreading your authority across a knowledge-hungry field.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full SEO-process carousel from your method, so your expertise becomes actionable value that grows your authority.",
      },
      {
        step_number: 5,
        title: "Share your take on algorithm updates and search shifts",
        description:
          "Search changes constantly — core updates, AI overviews, SERP feature shifts — and having a calm, informed take positions you as the expert people turn to when the ground moves. Share your analysis of what an update means and how to respond. This keeps your content timely, drives engagement from an anxious audience, and builds your reputation as the steady SEO voice who understands the changes rather than panicking about them like everyone else.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs surfaces search developments and helps you shape a take, so you're the calm, informed voice when algorithm updates hit.",
      },
      {
        step_number: 6,
        title: "Post consistently to compound your search authority",
        description:
          "Ironically, SEO specialists who understand compounding often neglect their own content compounding. Batch a week of posts in one session so your authority-building stays consistent regardless of client work. Just as SEO rewards consistent publishing, your personal reputation rewards consistent presence — it compounds into the trust that brings consulting clients, freelance work, and career opportunities. For an SEO expert, applying the compounding principle to your own brand is only fitting.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your personal authority compounds through consistency, just like the SEO you practice.",
      },
      {
        step_number: 7,
        title: "Present clearly with a clean, credible visual identity",
        description:
          "SEO involves data and process, and your carousels should present them clearly and credibly. A clean, consistent visual identity makes your audits, frameworks, and results easy to follow and your feed recognizable. Lock in your template once so every case study and process post carries the same professional polish. Clear, organized presentation signals the methodical rigor SEO demands, quietly reinforcing your credibility with every prospect who scrolls by.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clean and consistent, so your data and processes read as clearly as your analysis.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, SEO specialists understood compounding authority better than anyone yet rarely applied it to their own content. Client work ate your hours, so your real ranking wins stayed in your reports instead of becoming the case studies that build a reputation. When you posted, it was generic SEO tips indistinguishable from the myth-heavy crowd. Meanwhile the consulting clients and opportunities went to specialists who'd built visible authority, and your genuine, tested expertise stayed hidden — even as you knew, better than most, exactly how consistent publishing compounds into trust.",
    after_carouselabs:
      "With CarouseLabs, you finally apply compounding to your own brand. A ranking win becomes a case-study carousel that proves you know how search works. A myth-busting hook brings clarity to a confused field. Your method becomes an actionable process carousel that grows your authority. Your calm take on an algorithm update makes you the voice people turn to. Because you batch a week in one session, your authority compounds through consistency — just like the SEO you practice — bringing consulting clients, freelance work, and career opportunities. Your clean, credible feed reads as clearly as your analysis.",
    time_to_first_post:
      "About 15 minutes from signup — appropriately fast for a search and content specialist.",
    quick_wins: [
      "Your first case-study carousel that turns a real ranking win into visible authority.",
      "A myth-busting post that positions you as the clarity in a confused, contradictory field.",
      "Your first consulting or freelance enquiry from finally applying compounding to your own brand.",
    ],
  },
  "email-marketers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Own a specific email marketing expertise",
        description:
          "Email marketing spans deliverability, lifecycle automation, copywriting, list growth, and revenue optimization — so pick the facet you want your name attached to. Anchor your content to it. Whether you're building authority for freelance, agency, or in-house advancement, being known for a specific email discipline beats generalist positioning. This focus attracts the exact opportunities tied to your expertise, and in a field where great email marketers are quietly in high demand, a clear specialty makes you findable and sought-after.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your email specialty, so your feed builds authority on one discipline rather than everything.",
      },
      {
        step_number: 2,
        title: "Turn your email results into proof content",
        description:
          "Your best content is real email wins — the flow that drove revenue, the subject-line test that doubled opens, the re-engagement campaign that revived a dead list. Keep a note of these results and the specific tactic behind each. Email is beautifully measurable, so sharing actual numbers and the reasoning is intensely credible. Proof of email revenue and engagement is the strongest evidence that you can turn a list into a money-making asset, which is exactly what employers and clients pay for.",
        time_required: "10 min per campaign",
        carouselabs_tip:
          "CarouseLabs turns a real email win into a proof carousel, so your measurable results become the credibility that attracts clients and roles.",
      },
      {
        step_number: 3,
        title: "Write hooks that prove your grasp of attention",
        description:
          "Your hooks are a live demonstration of the subject-line skill you sell — if you can't stop the scroll, why would a client trust you to get emails opened? Craft hooks that promise value and prove your copywriting: 'The subject line formula that lifted our open rate from 18% to 34%.' Because email is fundamentally about earning attention in a crowded inbox, every hook you write on LinkedIn is a mini-audition for the exact skill you're known for.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates strong hook options, so every post demonstrates the attention-grabbing copy skill at the core of email marketing.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches an email framework",
        description:
          "Structure a carousel around one framework: how to build a welcome sequence, how to write copy that converts, how to segment for relevance, how to improve deliverability. Walk through the problem, the common mistake, your framework, the steps, and the result. Teaching a genuinely usable email framework demonstrates your expertise and gives readers real value. When someone applies your method and their email performance improves, you earn a follower and an advocate who spreads your reputation.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full email-framework carousel from your method, so your expertise becomes actionable value that grows your authority.",
      },
      {
        step_number: 5,
        title: "Champion email's value in a channel-obsessed world",
        description:
          "Marketers chase shiny new channels while email quietly outperforms them all, and being the voice who makes email's case is a strong content angle. Share content that reframes email as the highest-ROI, most-owned channel — and challenge the myths that it's dead or spammy. This positions you as a strategic thinker who understands where real marketing value lives, and it resonates with businesses tired of renting audiences on platforms they don't control.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape email-advocacy takes into posts, so your feed champions the channel you're expert in against the shiny-object crowd.",
      },
      {
        step_number: 6,
        title: "Post consistently to build authority beyond the inbox",
        description:
          "Your work happens invisibly inside email platforms, so personal visibility takes deliberate effort. Batch a week of posts in one session so your authority-building stays consistent regardless of campaign workload. A visible personal brand is what turns a skilled-but-unknown email marketer into a sought-after one, opening freelance clients, agency roles, and premium projects. In a specialized field, being both excellent and visible is what wins the best opportunities.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your authority-building stays consistent even during heavy campaign periods.",
      },
      {
        step_number: 7,
        title: "Present with a clean, conversion-minded visual identity",
        description:
          "As an email marketer, you understand how design supports conversion, and your carousels should reflect that sensibility. A clean, consistent, well-structured visual identity makes your frameworks easy to follow and demonstrates your grasp of persuasive presentation. Lock in your template once so every proof carousel and framework post carries the same polish. Your feed's clarity is itself a small demonstration of the conversion-focused thinking you bring to email.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clean and consistent, so your feed reflects the conversion-minded sense you bring to email.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, email marketers did highly measurable, revenue-driving work that stayed completely invisible. Your wins lived inside email platforms and reports, never becoming the content that builds a reputation, and campaign workload left no time to create anyway. When you posted, it was generic advice that built no distinct authority. Meanwhile the freelance clients, agency roles, and premium projects went to email marketers who'd made themselves visible, and your genuine, results-backed expertise stayed hidden in the inbox — a channel you knew outperformed everything, ironically unable to market yourself.",
    after_carouselabs:
      "With CarouseLabs, your invisible results finally become visible authority. A revenue-driving flow becomes a proof carousel that reads as real credibility. Every hook demonstrates the subject-line skill you sell. Your method becomes an actionable framework that grows your authority. Your email-advocacy takes position you as a strategic thinker. Because you batch a week in one session, your authority-building stays consistent through heavy campaign periods — and being both excellent and visible wins the best clients and roles. Instead of the skilled email marketer no one knows, you become the sought-after expert whose feed proves exactly what you can do.",
    time_to_first_post:
      "About 15 minutes from signup — appropriately fast for a copy and content professional.",
    quick_wins: [
      "Your first proof carousel that turns invisible email revenue into visible authority.",
      "A framework post that demonstrates your expertise and grows your following.",
      "Your first freelance client or role from finally being both excellent and visible.",
    ],
  },
  "growth-hackers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define the growth problem you're known for cracking",
        description:
          "Growth hacking is about creative, data-driven scaling, so define the specific growth challenge you excel at — activation, viral loops, retention, acquisition experiments. Anchor your content to it. Whether for a startup role, consulting, or founder credibility, being known for cracking a specific growth problem beats vague 'growth' positioning. This focus attracts the startups and founders with exactly that challenge, and in a field that prizes proven experimenters, a clear specialty makes your expertise concrete and sought-after.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your growth specialty, so your feed builds authority on one problem rather than generic growth talk.",
      },
      {
        step_number: 2,
        title: "Turn your experiments into teardown content",
        description:
          "Your best content is the real experiments you run — the growth loop that worked, the test that failed and why, the unconventional tactic that moved a metric. Keep a note of these experiments and their results. Growth people are obsessed with tactics that actually work, so sharing your real experiments (wins and failures) with data is intensely valuable and credible. It proves you're a hands-on experimenter, not a theorist reciting famous growth case studies from a decade ago.",
        time_required: "10 min per experiment",
        carouselabs_tip:
          "CarouseLabs turns a real growth experiment into a teardown carousel, so your hands-on tests become the credible tactical content the field craves.",
      },
      {
        step_number: 3,
        title: "Write hooks that promise an unconventional growth tactic",
        description:
          "Growth hooks land when they promise a clever, non-obvious tactic or a counterintuitive result: 'We 3x'd signups by making our onboarding longer.' The growth audience craves creative, counterintuitive plays that break conventional wisdom. Leading with a surprising, specific tactic signals the inventive, experimental thinking that defines great growth work — and it grabs founders and marketers hungry for the unconventional edge that generic advice never gives them.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that promise unconventional, counterintuitive growth tactics, so your posts grab an audience hungry for creative plays.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a replicable growth play",
        description:
          "Structure a carousel around one play others can run: how to design a growth experiment, how to build a referral loop, how to find your activation moment. Walk through the situation, the common mistake, your play, the steps, and the result. Giving away a genuinely replicable growth tactic builds authority fast — when a founder runs your play and it works, they become an advocate. In a community that shares tactics obsessively, replicable value is exactly what spreads your reach and reputation.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full growth-play carousel from your method, so your tactics become replicable value that spreads across the growth community.",
      },
      {
        step_number: 5,
        title: "Share your framework for thinking about growth",
        description:
          "Beyond individual tactics, the best growth people have a systematic way of thinking — how they prioritize experiments, how they find leverage, how they avoid vanity metrics. Sharing your growth mental models positions you above tactic-collectors as a strategic growth mind. This is the content that attracts serious roles and consulting, because founders want someone who can build a growth system, not just execute one clever hack. Frameworks signal depth that random tactics don't.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape your growth mental models into posts, so your feed signals strategic depth, not just a bag of tactics.",
      },
      {
        step_number: 6,
        title: "Experiment with your own content like a growth channel",
        description:
          "Treat your LinkedIn presence as a growth channel to optimize — test hooks, analyze what resonates, iterate. Batch a week of posts in one session so you maintain the consistent volume that lets you actually learn what works. This meta-approach both keeps you visible and demonstrates your growth mindset in action. For a growth hacker, systematically growing your own audience is a fitting, credible proof of the exact skill you're selling.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch and iterate quickly, so you can treat your own content as a growth channel to optimize — proof of your skill in action.",
      },
      {
        step_number: 7,
        title: "Present experiments clearly with a sharp visual identity",
        description:
          "Growth content involves data, experiments, and results, and your carousels should present them clearly and engagingly. A clean, consistent, sharp visual identity makes your teardowns easy to follow and your feed recognizable. Lock in your template once so every experiment and play carousel carries the same polish. Clear, compelling presentation of your experiments is itself a signal of the crisp, analytical thinking that good growth work requires.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel sharp and consistent, so your experiments read as clearly as your analysis.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, growth hackers ran creative, data-driven experiments that nobody ever saw. Your real tests and unconventional wins stayed locked in internal docs, never becoming the teardown content that builds a growth reputation, and the daily experiment grind left no time to write. When you posted, it was generic growth advice recycling decade-old case studies. Meanwhile the startup roles and consulting gigs went to growth people who'd built visible authority through their tactics, and your genuine, inventive expertise stayed invisible — ironic for someone whose whole job is figuring out how to grow.",
    after_carouselabs:
      "With CarouseLabs, your experiments finally become visible authority. A real growth test becomes a teardown carousel the field craves. An unconventional result becomes a hook that grabs a tactic-hungry audience. Your play becomes replicable value that spreads across the growth community. Your mental models signal strategic depth beyond tactics. Because you batch and iterate, you can treat your own content as a growth channel to optimize — proof of your skill in action — while staying consistently visible. Instead of the growth hacker whose best work stays hidden, you become the known experimenter whose feed proves you can actually make things grow.",
    time_to_first_post:
      "About 15 minutes from signup — appropriately fast for someone who lives in experiments and iteration.",
    quick_wins: [
      "Your first experiment teardown carousel that turns a real test into the tactical content the field craves.",
      "A replicable growth play that spreads your reputation across the growth community.",
      "Your own content growing as a channel you optimize — living proof of the skill you sell.",
    ],
  },
  "brand-strategists": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Articulate your distinct philosophy of brand strategy",
        description:
          "Brand strategy is intellectual and subjective, so your differentiation is a clear, distinct point of view on how brands should be built. Decide the strategic philosophy you champion — brand as meaning, brand as differentiation, brand as consistency over time — and anchor your content to it. Clients choose brand strategists whose thinking they resonate with, so a visible, well-articulated philosophy is what attracts aligned clients and marks you as a strategist with real conviction rather than a generalist.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content anchored to your brand-strategy philosophy, so your feed argues a distinct worldview instead of generic branding tips.",
      },
      {
        step_number: 2,
        title: "Turn strategy work into insight-driven content",
        description:
          "Your value is strategic thinking, so your frameworks and (anonymized) engagement insights are your best content — the positioning breakthrough, the brand architecture decision, the insight that reframed a client's whole approach. Keep a note of these. Sharing your strategic thinking demonstrates the depth clients pay for and lets prospects sample your mind. For a brand strategist, visible thinking is the most direct proof of the intellectual value you offer.",
        time_required: "10 min, weekly",
        carouselabs_tip:
          "CarouseLabs turns a strategic insight into an insight-driven carousel, so your brand thinking becomes visible proof of your depth.",
      },
      {
        step_number: 3,
        title: "Write hooks that reframe how people think about brand",
        description:
          "Brand-strategy hooks land when they offer a sharper way of seeing: 'A brand isn't your logo or your colors. It's the gap between what you promise and what you deliver.' Leading with a reframe that challenges the reader's assumption signals strategic depth. Your audience includes sophisticated marketers and founders, so the hook must promise a genuinely more insightful lens on brand — the kind that makes someone rethink what they thought they understood.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that reframe how people think about brand, so your posts signal the strategic depth that sets you apart.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a strategic framework",
        description:
          "Structure a carousel around one framework: how to define brand positioning, how to build brand architecture, how to find a brand's true differentiator. Walk through the challenge, the common shallow approach, your framework, how to apply it, and the outcome. Teaching a genuine strategic framework demonstrates your intellectual substance and lets prospects experience your thinking. Clients hire strategists whose approach they respect, so sharing your frameworks openly is direct authority-building.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full strategic-framework carousel from your notes, so your thinking becomes content prospects respect and remember.",
      },
      {
        step_number: 5,
        title: "Analyze the brand strategy behind famous successes and failures",
        description:
          "Dissecting the strategy behind well-known brands — why one nailed its positioning, why another lost its way — is compelling, shareable content that showcases your strategic lens through familiar examples. Share your read on the strategic decisions behind brands everyone knows. This makes your abstract expertise tangible, sparks discussion, and positions you as the strategist whose analysis is worth following. Familiar cases are the fastest way to demonstrate strategic thinking to a broad audience.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape strategic analysis of famous brands into posts, so your expertise shows through examples everyone recognizes.",
      },
      {
        step_number: 6,
        title: "Stay consistently visible to build intellectual authority",
        description:
          "Brand-strategy engagements come from reputation, and reputation is built through consistent, visible thinking over time. Batch a week of posts in one session so your intellectual presence stays steady regardless of client work. Sustained visibility compounds into the authority that makes a business seek your strategic guidance specifically. For a thinking-driven service, being the strategist whose insights people have followed and come to respect is what turns reputation into engagements.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your intellectual authority compounds through consistent visibility, not sporadic posting.",
      },
      {
        step_number: 7,
        title: "Make your visual identity impeccably strategic",
        description:
          "You advise on brand, so your own visual identity must be coherent and considered — inconsistency would undermine your credibility. A polished, distinctive, consistent look is itself a demonstration of the strategic branding you champion. Lock in a considered template once so every insight and framework carousel exemplifies your strategic sensibility. For a brand strategist, a coherent feed is a living proof that you practice the disciplined brand-building you preach.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel coherent and on-brand, so your feed proves you practice the strategic branding you preach.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, brand strategists sat on their most valuable asset — distinctive strategic thinking — and rarely made it visible. Client work consumed your hours, so the frameworks and insights you developed stayed in decks and your own head, never reaching the marketers and founders forming their view of you. When you posted, it was generic branding advice that built no distinct intellectual authority. Meanwhile engagements went to strategists with a visible point of view, and, as someone who advises on brand consistency, you felt the sting of your own feed being anything but consistent.",
    after_carouselabs:
      "With CarouseLabs, your strategic thinking finally becomes a visible brand. An insight becomes a carousel that proves your depth. A reframe becomes a hook that signals strategic sophistication. Your framework becomes content prospects respect. Your analysis of a famous brand showcases your lens through familiar examples. Because you batch a week in one session, your intellectual authority compounds through consistent visibility — so businesses seek your guidance specifically. And your coherent, on-brand feed becomes living proof that you practice the disciplined brand-building you preach, closing the gap between your advice and your own presence.",
    time_to_first_post:
      "About 20 minutes including onboarding — most brand strategists turn one strategic insight into a first carousel the same day.",
    quick_wins: [
      "Your first insight carousel that makes your distinctive strategic thinking visible.",
      "A reframe post that makes a sophisticated reader rethink what they thought they knew about brand.",
      "Your first inbound from a business that resonated with your point of view and wants your strategic guidance.",
    ],
  },
  "content-strategists": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define the content challenge you solve strategically",
        description:
          "Content strategy is bigger than creating content — it's about systems, audiences, and business outcomes. Define the specific strategic challenge you own: building content engines, aligning content to the funnel, editorial strategy, content operations. Anchor your feed to it. Clients and employers want a strategist who thinks in systems, not just a writer, so a clear strategic focus positions you above the content-creator crowd and attracts the roles and projects that value high-level thinking.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your strategic specialty, so your feed positions you as a systems thinker, not just a creator.",
      },
      {
        step_number: 2,
        title: "Show your strategic thinking, not just your output",
        description:
          "Your value is the thinking behind the content — the audience insight, the distribution plan, the measurement approach. Keep a note of the strategic decisions you make and share the reasoning. Anyone can post content; showing how you strategize proves you operate at a higher level. This is what distinguishes a content strategist from a content producer, and it's exactly the depth that attracts the senior roles and consulting engagements you want.",
        time_required: "10 min, weekly",
        carouselabs_tip:
          "CarouseLabs turns a strategic content decision into an insight carousel, so your thinking — not just your output — becomes visible proof of your level.",
      },
      {
        step_number: 3,
        title: "Write hooks that reframe how people approach content",
        description:
          "Content-strategy hooks land when they challenge a common approach: 'You don't have a content problem. You have a distribution problem.' Reframing how the reader thinks about their content struggles signals strategic depth. Your audience is marketers and founders frustrated that their content isn't working, so a hook that diagnoses the real, higher-level issue stops their scroll and marks you as the strategist who sees what they're missing.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that reframe how people approach content, so your posts signal the strategic depth that sets you apart from creators.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a content system",
        description:
          "Structure a carousel around one system: how to build a content engine, how to map content to the buyer journey, how to measure content that matters. Walk through the problem, the common tactical mistake, your system, the steps, and the result. Teaching a genuine content system demonstrates your strategic substance and gives readers a framework they can apply. When a marketer adopts your system and their content finally works, you earn an advocate who spreads your authority.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full content-system carousel from your method, so your strategic thinking becomes an actionable framework prospects value.",
      },
      {
        step_number: 5,
        title: "Share your take on the evolving content ecosystem",
        description:
          "Content is being reshaped by AI, changing platforms, and shifting attention, and a strategic take on these positions you as a forward-thinking voice. Share your perspective on where content strategy is heading and what organizations should do. This keeps your content relevant, sparks engagement from peers navigating the same shifts, and reinforces your reputation as a strategist who thinks about the future of the discipline, not just today's tactics.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs surfaces content-industry shifts and helps you shape a take, so your feed reads as forward-thinking strategy.",
      },
      {
        step_number: 6,
        title: "Model the consistency that content strategy requires",
        description:
          "You'd never advise a client to post sporadically, so your own feed must model the consistency you preach. Batch a week of posts in one session so your strategic presence stays steady regardless of workload. Sustained visibility compounds into the authority that opens senior roles and consulting, and it demonstrates the disciplined execution behind your strategy. For a content strategist, walking your own consistency talk is a credibility requirement.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so you model the content consistency you'd advise any client to maintain.",
      },
      {
        step_number: 7,
        title: "Present strategy clearly with a polished visual identity",
        description:
          "Your carousels should present complex strategic ideas clearly and professionally — clarity of communication is core to a content strategist's value. A clean, consistent visual identity makes your systems and frameworks easy to follow and your feed recognizable. Lock in your template once so every insight and system post carries the same polish. A clear, well-designed feed is itself a demonstration of the strategic communication skill you bring.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clear and consistent, so your strategy reads as cleanly as you think it.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, content strategists struggled to prove they were more than content producers, with no time to make their thinking visible. The strategic decisions behind your work — the systems, the audience insights, the measurement — stayed inside plans and your own head, never becoming the content that distinguishes a strategist from a writer. When you posted, it blended in with generic content advice. Meanwhile senior roles and consulting went to strategists with a visible point of view, and, ironically, the content strategist's own content strategy was neglected.",
    after_carouselabs:
      "With CarouseLabs, your strategic depth finally shows. A strategic decision becomes an insight carousel that proves you operate at a higher level. A reframe becomes a hook that diagnoses the real problem. Your method becomes a content-system carousel prospects value. Your take on the content ecosystem reads as forward-thinking strategy. Because you batch a week in one session, you model the consistency you preach — compounding into authority that opens senior roles and consulting. Instead of being mistaken for a content producer, you become the recognized strategist whose visible thinking proves your level.",
    time_to_first_post:
      "About 15 minutes from signup — appropriately fast for a content professional.",
    quick_wins: [
      "Your first insight carousel that proves you're a strategist, not just a content producer.",
      "A content-system post that gives marketers a framework and grows your authority.",
      "Your first senior role or consulting enquiry from finally making your strategic thinking visible.",
    ],
  },
  "copywriters": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Own a copywriting specialty and audience",
        description:
          "Copywriting spans sales pages, emails, ads, brand voice, and more — so pick your specialty and the industries you serve. Anchor your content to it. Clients hire copywriters who specialize in their exact need, and a clear focus commands higher rates than generalist positioning. This specificity attracts the right clients and marks you as the go-to writer for that niche, rather than competing on price with every generalist in a crowded freelance market.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your copywriting specialty, so your feed attracts the specific clients who pay premium rates.",
      },
      {
        step_number: 2,
        title: "Make every post prove you can write",
        description:
          "For a copywriter, your content is the ultimate audition — every post demonstrates (or undermines) the exact skill clients pay for. Treat your feed as a living portfolio of persuasive, engaging writing. Keep a note of copywriting lessons and turn them into posts that themselves exemplify great copy. There's no faking it: consistently sharp, compelling writing on your feed is the single most persuasive proof that you're worth hiring.",
        time_required: "10 min, ongoing",
        carouselabs_tip:
          "CarouseLabs helps you produce consistently sharp posts, so your feed becomes the living portfolio that proves your copywriting ability.",
      },
      {
        step_number: 3,
        title: "Write hooks that showcase your command of attention",
        description:
          "Your hooks are the purest demonstration of your craft — if you can't stop the scroll, no client will trust you to sell. Craft hooks that prove your persuasive skill: 'The word that quietly kills your sales copy (and what to use instead).' Because copywriting is fundamentally about earning attention and driving action, every hook you write is a live sample of your ability. Nailing your hooks is both your best marketing and irrefutable proof of skill.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates strong hook options, so every post showcases the attention-grabbing command at the heart of your copywriting.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a copywriting technique",
        description:
          "Structure a carousel around one technique: how to write a headline that converts, how to handle objections in copy, how to create urgency without being sleazy. Walk through the principle, the common mistake, your technique, an example, and the result. Teaching your craft demonstrates expertise and, when written well, proves your skill in the very act. Copywriters worry teaching gives away the goods, but it does the opposite — it proves you're the expert worth hiring.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full technique carousel from your method — demonstrating, in its own copy, the skill you're teaching.",
      },
      {
        step_number: 5,
        title: "Share the psychology behind persuasion",
        description:
          "Great copywriting rests on understanding human psychology, and sharing that depth sets you apart from writers who just string words together. Share content about why certain copy works — the psychological triggers, the reasons people buy, the emotions behind decisions. This positions you as a strategic writer who understands persuasion at a deep level, which is what commands premium rates and attracts clients who want results, not just pretty words.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape persuasion-psychology insights into posts, so your feed proves you understand why copy works, not just how to write it.",
      },
      {
        step_number: 6,
        title: "Post consistently so your writing stays in front of clients",
        description:
          "Freelance copywriting income swings with feast-or-famine cycles driven by inconsistent visibility. Batch a week of posts in one session so your writing keeps appearing in front of potential clients even during busy project weeks. Consistent presence means prospects keep discovering your work, so your next client is lined up before the current project ends. For a copywriter, a steady stream of sharp posts is both portfolio and lead generation running on autopilot.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your writing keeps attracting clients even during your busiest project weeks.",
      },
      {
        step_number: 7,
        title: "Present your words in a clean, professional frame",
        description:
          "Your words are the star, so your visual identity should present them cleanly and professionally without competing for attention. A consistent, uncluttered visual style makes your copy shine and your feed recognizable. Lock in your template once so every technique post and craft lesson carries the same clean frame. A professional, considered feed signals that you take your craft seriously, reassuring premium clients that you're a pro worth their budget.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clean and consistent, so your words stay the star while your feed looks professional.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, copywriters faced a brutal contradiction: your career depended on a feed that showcased your writing, but writing for clients all day left you drained with nothing for yourself. So your feed — the ultimate proof of your craft — went quiet or inconsistent, undermining the exact skill you sell. Your best copywriting lessons stayed unwritten, and prospects couldn't tell your work from a generalist's. Worse, the feast-or-famine cycle meant you stopped posting whenever a project landed, then scrambled for clients when it ended, competing on price instead of the authority your talent deserved.",
    after_carouselabs:
      "With CarouseLabs, your feed becomes the living portfolio that wins premium clients. Every hook showcases your command of attention. A technique becomes a carousel that teaches while demonstrating your skill. Your persuasion-psychology insights prove you understand why copy works, not just how to write it. Because you batch a week in one session, your writing keeps attracting clients even during busy project weeks — smoothing the feast-or-famine cycle so your next client is lined up before the current one ends. Instead of the skilled copywriter no one sees, you become the sought-after writer whose every post proves you're worth the rate.",
    time_to_first_post:
      "About 15 minutes from signup — appropriately fast for a professional writer.",
    quick_wins: [
      "Your first technique carousel that teaches your craft while demonstrating your skill in the writing itself.",
      "A consistent feed that becomes the living portfolio winning you premium clients.",
      "Your next client lined up before the current project ends, smoothing the freelance income roller coaster.",
    ],
  },
  "linkedin-ghostwriters": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Prove your skill by growing your own LinkedIn",
        description:
          "As a LinkedIn ghostwriter, your own profile is your single most important sales asset — a flat feed makes it impossible to sell your ability to grow others'. Decide to treat your presence as the ultimate case study, demonstrating the exact strategies you'd deploy for clients. There's zero room to fake it here: a ghostwriter with a thriving personal feed is instantly credible, while one with a quiet feed contradicts their entire pitch. This is your non-negotiable foundation.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs helps you consistently produce standout content, so your own feed becomes the case study that proves you can grow anyone's.",
      },
      {
        step_number: 2,
        title: "Turn client results into proof (with permission)",
        description:
          "Your clients' LinkedIn growth — the follower jumps, the inbound leads, the viral posts you wrote — is your most persuasive content, shared with permission and appropriate discretion. Keep a note of these results and the strategy behind each. Because ghostwriting is invisible by nature, showing real client outcomes is how you make your impact visible and answer the skeptic's question of whether you can actually deliver. Demonstrated client growth is the credibility that closes ghostwriting deals.",
        time_required: "10 min per client win",
        carouselabs_tip:
          "CarouseLabs turns a client's growth into a results carousel, so your otherwise-invisible ghostwriting impact becomes visible proof.",
      },
      {
        step_number: 3,
        title: "Write hooks that prove you understand what performs",
        description:
          "Your hooks are a live demonstration of the skill clients pay for — the ability to stop the scroll. Craft hooks that both deliver value and prove your mastery of LinkedIn attention: 'The hook structure I use to get my clients' posts 5x the reach.' Because you're literally selling the ability to write high-performing LinkedIn content, every hook you write is an audition. Consistently nailing them is your most direct proof of ghostwriting skill.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates strong hook options, so every post proves the scroll-stopping skill you're hired to deliver for clients.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches your writing process",
        description:
          "Structure a carousel around your process: how you find a client's voice, how you turn an idea into a post, how you structure a carousel for reach. Walk through the challenge, the common mistake, your process, the steps, and the result. Teaching your ghostwriting method openly demonstrates your expertise and, done well, proves your quality. Sharing how you work doesn't lose clients — it attracts the ones who realize they'd rather hire your skill than attempt it themselves.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full process carousel from your method — demonstrating, in its own quality, the ghostwriting skill you're describing.",
      },
      {
        step_number: 5,
        title: "Share your take on personal branding and thought leadership",
        description:
          "Your clients are busy professionals who want a personal brand, so content about the value and craft of thought leadership speaks directly to your buyers. Share your perspective on why personal branding matters, what makes an executive's content resonate, how founders should show up. This positions you as an expert in the exact outcome your clients want, and it attracts the professionals who read it and think 'I need this, but I don't have time — I should hire someone like this.'",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape thought-leadership takes into posts, so your feed speaks directly to the busy professionals who become ghostwriting clients.",
      },
      {
        step_number: 6,
        title: "Model relentless consistency",
        description:
          "You sell consistency as a core value, so your own feed must never lapse — an inconsistent LinkedIn ghostwriter is a walking contradiction. Batch a week of posts in one session so your presence stays steady while you're busy writing for clients. Your reliable output is itself proof you can sustain the exact service you offer, and it keeps you top of mind for prospects deciding to invest in a ghostwriter. For you, consistency is both proof of concept and lead generation.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so you model relentless consistency even while writing for a full roster of clients.",
      },
      {
        step_number: 7,
        title: "Set the visual standard clients will want for themselves",
        description:
          "Your carousels should exemplify the quality clients will want on their own feeds — mediocre visuals would undercut your pitch. A polished, consistent visual identity makes your feed a standard prospects aspire to and demonstrates the design sense you bring. Lock in your template once so every results and process carousel looks the part. When a prospect wishes their feed looked like yours, your visual quality becomes a silent, ongoing sales pitch for your ghostwriting.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel polished and consistent, so your feed models the standard clients will want you to build for them.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, LinkedIn ghostwriters faced the ultimate contradiction: you were hired to produce standout content for clients, which left no time or energy to maintain your own feed — the very thing that proves you can do the job. So your personal presence went quiet or looked mediocre, a fatal flaw for someone selling LinkedIn growth. Your client results stayed invisible by the nature of ghostwriting, and prospects had no proof you could deliver. You were teaching consistency while being inconsistent, and the gap between your pitch and your feed quietly cost you the clients who checked to see if you walk the talk.",
    after_carouselabs:
      "With CarouseLabs, your feed becomes the case study your business depends on. A client's growth becomes a results carousel that makes your invisible impact visible. Every hook proves your scroll-stopping skill. Your process becomes a carousel that teaches while demonstrating your quality. Your thought-leadership takes speak directly to future clients. Because you batch a week in one session, you model the relentless consistency you sell — even with a full client roster. The contradiction closes: instead of the ghostwriter with a neglected feed, you become the one whose own presence is the most persuasive proof you can grow anyone's.",
    time_to_first_post:
      "About 15 minutes from signup — appropriately fast for a LinkedIn content professional.",
    quick_wins: [
      "Your first results carousel that makes your invisible ghostwriting impact visible to prospects.",
      "A consistently standout feed that becomes the case study proving you can grow anyone's presence.",
      "Your first ghostwriting enquiry from a professional who saw your feed and thought 'I need this.'",
    ],
  },
  "social-media-consultants": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define the social media outcome you consult on",
        description:
          "Social media consulting is broad, so specialize: platform strategy for a specific industry, organic growth, social selling, community building. Anchor your content to it. Businesses hiring social consultants want proven expertise on their exact challenge, and a clear specialty commands higher fees than generalist positioning. This focus attracts the right clients and, crucially, your own strong presence proves you can deliver — because no business will hire a social media consultant whose own socials are weak.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your social consulting specialty, so your feed builds authority on one outcome and proves you can do it.",
      },
      {
        step_number: 2,
        title: "Turn client results into proof-driven content",
        description:
          "Your clients' social media wins — the growth you engineered, the strategy that worked, the turnaround — are your best content, with permission. Keep a note of these results and the specific approach behind each. Because businesses are skeptical of social media ROI, showing real client outcomes and the reasoning proves you deliver measurable value, not just vanity metrics. Demonstrated results are what separate a credible consultant from the many who just claim expertise.",
        time_required: "10 min per client story",
        carouselabs_tip:
          "CarouseLabs turns a client's social win into a proof-driven carousel, so your results answer the skeptical business owner's ROI question.",
      },
      {
        step_number: 3,
        title: "Write hooks that offer current, strategic social insight",
        description:
          "Social hooks land when they promise timely, strategic insight: 'The social media strategy shift most businesses are missing right now.' Leading with current, higher-level thinking (not basic tips) signals you're a strategist worth consulting, not just someone who posts. Because social media changes fast and businesses feel behind, a hook that promises to orient them to what actually works now grabs the exact decision-makers who might hire you.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates current, strategic social hooks, so your posts position you as a consultant worth hiring, not just a poster.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a real social strategy",
        description:
          "Structure a carousel around one strategy: how to build a platform presence from scratch, how to turn followers into customers, how to run a content system that scales. Walk through the problem, the common mistake, your strategy, the steps, and the result. Teaching a genuine strategy demonstrates your consulting substance and lets prospects experience your thinking. Businesses hire consultants whose approach they respect, so sharing your strategy openly attracts clients who want you to implement it.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full strategy carousel from your method, so your consulting expertise becomes content that proves your value.",
      },
      {
        step_number: 5,
        title: "Share your take on the shifting social landscape",
        description:
          "Platforms and social behavior change constantly, and a sharp take on these shifts positions you as the strategist businesses turn to for direction. Share your perspective on what a change means and how businesses should respond. This keeps your content timely, reassures prospects that your advice is current, and reinforces your reputation as a consultant who's ahead of the curve — exactly the guide anxious businesses want when the social ground keeps moving.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs surfaces social-platform shifts and helps you shape a take, so you're the current, strategic voice businesses turn to.",
      },
      {
        step_number: 6,
        title: "Model the consistency you'd sell to any client",
        description:
          "You'd tell every client that consistency is essential, so your own feed must embody it — an inconsistent social media consultant undercuts their own advice and proof. Batch a week of posts in one session so your presence stays steady regardless of client work. Sustained visibility keeps you top of mind for businesses deciding to get help, and it proves you practice what you preach. For you, a consistent feed is both lead generation and living credibility.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so you model the consistency you'd sell to any client and stay top of mind for prospects.",
      },
      {
        step_number: 7,
        title: "Make your feed a showcase of social media excellence",
        description:
          "As a social media consultant, your feed is a live sample of your ability — it must look sharp, scroll-stopping, and consistent. A polished visual identity demonstrates the content sense you're hired for, while a scrappy feed would be disqualifying. Lock in your template once so every proof and strategy carousel looks the part. Your feed's quality is a continuous demonstration of your expertise to every business owner who scrolls by considering a consultant.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel scroll-stopping and consistent, so your feed showcases the social excellence you're hired for.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, social media consultants faced a disqualifying irony: you advised businesses on social media while your own presence — your most important proof — sat neglected. Client work consumed your hours, so your feed went quiet or looked weak, undermining your entire pitch. Your client results stayed private, your strategic takes stayed unwritten, and prospects couldn't tell your expertise from the crowd of self-proclaimed social gurus. You'd tell any client that consistency was essential while being inconsistent yourself, and the contradiction quietly cost you the credibility and clients your skills deserved.",
    after_carouselabs:
      "With CarouseLabs, your own feed becomes the proof your consulting requires. A client win becomes a proof-driven carousel that answers the ROI skeptic. A current, strategic hook positions you above the poster crowd. Your method becomes a strategy carousel prospects respect. Your take on social shifts makes you the voice businesses turn to. Because you batch a week in one session, you model the consistency you'd sell to any client and stay top of mind for prospects. Instead of the consultant with a weak feed, you become the one whose thriving presence is the ultimate proof you can deliver.",
    time_to_first_post:
      "About 15 minutes from signup — appropriately fast for a social media professional.",
    quick_wins: [
      "Your first proof-driven carousel that answers the skeptical business owner's ROI question.",
      "A thriving, consistent feed that becomes the ultimate proof you can deliver social results.",
      "Your first client enquiry from a business that saw your presence and trusted you could grow theirs.",
    ],
  },
  "pr-professionals": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Position around the PR expertise you're known for",
        description:
          "PR spans media relations, crisis communications, brand reputation, and thought-leadership building — so define your specialty and anchor your content to it. Whether you're building your own consultancy, advancing in-house, or attracting clients, a clear focus makes you the go-to for that specific PR need. And in a field all about shaping narratives, your own well-crafted presence proves you can do exactly that — a compelling personal brand is the ultimate demonstration of PR skill.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your PR specialty, so your feed proves you can shape a narrative — starting with your own.",
      },
      {
        step_number: 2,
        title: "Turn PR wins into behind-the-scenes stories",
        description:
          "Your successes — the coverage you landed, the crisis you navigated, the reputation you rebuilt — are compelling content, shared with appropriate discretion. Keep a note of these wins and the strategy behind each. PR is often mysterious to outsiders, so a behind-the-scenes look at how you actually secured a result is fascinating and credible. It proves you deliver outcomes, not just activity, which is what clients and employers want from a PR pro.",
        time_required: "10 min per win",
        carouselabs_tip:
          "CarouseLabs turns a PR win into a behind-the-scenes carousel, so your results become credible proof of the outcomes you deliver.",
      },
      {
        step_number: 3,
        title: "Write hooks that demonstrate narrative instinct",
        description:
          "As a PR pro, your hooks are a live demonstration of your storytelling and messaging instinct — the core of your craft. Craft hooks that prove you understand attention and framing: 'The reason your press release gets ignored (and it's not the news).' Because PR is about making messages land, every hook you write showcases the exact skill you sell. A sharp, well-framed hook signals to prospects that you know how to make a story cut through.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates well-framed hook options, so every post demonstrates the narrative instinct at the heart of your PR craft.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a PR strategy",
        description:
          "Structure a carousel around one strategy: how to pitch journalists, how to handle a reputation crisis, how to build thought leadership. Walk through the challenge, the common mistake, your strategy, the steps, and the outcome. Teaching a genuine PR strategy demonstrates your expertise and gives readers real value. Because so many misunderstand PR, sharing how it actually works positions you as a credible authority and attracts clients who want your strategic guidance.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full PR-strategy carousel from your method, so your expertise becomes content that proves your authority.",
      },
      {
        step_number: 5,
        title: "Comment on reputation moments everyone's watching",
        description:
          "When a brand faces a PR crisis or nails a communications move, your expert analysis is timely, shareable content that showcases your judgment on situations everyone already has opinions about. Share your read on what a company did right or wrong and what you'd have advised. This demonstrates your expertise applied to real, recognizable events, sparks discussion, and positions you as the PR voice worth following when reputation is on the line.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape sharp takes on reputation moments into posts, so your judgment shows through events everyone's watching.",
      },
      {
        step_number: 6,
        title: "Stay consistently visible to build your own reputation",
        description:
          "You build reputations for a living, so your own must be consistently cultivated — sporadic presence undercuts your authority. Batch a week of posts in one session so your visibility stays steady regardless of client demands. Sustained presence compounds into the personal reputation that attracts clients, roles, and speaking, and it demonstrates the reputation-building discipline you sell. For a PR pro, a consistent, well-managed feed is a living case study of your craft.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your own reputation stays consistently cultivated — a living case study of your PR craft.",
      },
      {
        step_number: 7,
        title: "Present with polished, message-clear visuals",
        description:
          "PR is about clear, professional communication, and your carousels should reflect that. A clean, consistent, well-crafted visual identity makes your messages land clearly and your feed recognizable. Lock in your template once so every behind-the-scenes and strategy carousel carries the same polish. A professional, message-clear feed demonstrates the communications sensibility you bring, quietly reinforcing your credibility with every prospect who scrolls by.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel polished and message-clear, so your feed reflects the communications sense you bring.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, PR professionals built reputations for clients while their own stayed neglected. Client work and media chasing consumed your hours, so the wins that showcased your skill stayed behind the scenes, and your narrative instinct — the core of your craft — went undemonstrated on your own feed. When you posted, it blended into generic communications advice. Meanwhile the clients, roles, and speaking went to PR pros who'd built visible personal brands, and, ironically, the professional who shapes narratives for a living had no compelling narrative of their own.",
    after_carouselabs:
      "With CarouseLabs, you finally shape your own narrative as skillfully as your clients'. A PR win becomes a behind-the-scenes carousel that proves the outcomes you deliver. Every hook demonstrates your narrative instinct. Your method becomes a strategy carousel that proves your authority. Your take on a reputation moment showcases your judgment on events everyone's watching. Because you batch a week in one session, your own reputation stays consistently cultivated — a living case study of your craft. Instead of the invisible reputation-builder, you become the visible PR authority whose feed proves you can make any story land.",
    time_to_first_post:
      "About 15 minutes from signup — appropriately fast for a communications professional.",
    quick_wins: [
      "Your first behind-the-scenes carousel that proves the real PR outcomes you deliver.",
      "A consistent feed that becomes a living case study of the reputation-building you sell.",
      "Your first client or opportunity from finally having a compelling narrative of your own.",
    ],
  },
  "marketing-agency-owners": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Turn your agency's results into your marketing engine",
        description:
          "Your agency's best marketing is the results you generate for clients. List your strongest recent wins and get permission to share the approach, even anonymized. A specific result — 'we tripled a client's qualified leads in 90 days' — outperforms any 'full-service marketing agency' post. Prospects hire agencies on proof, and your case studies are the evidence competitors' generic service pages can't match. This proof-first positioning is what fills your pipeline with pre-sold leads.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs turns a client result into a proof carousel, so your wins become marketing without a case-study writing project.",
      },
      {
        step_number: 2,
        title: "Practice the marketing you sell — visibly",
        description:
          "As a marketing agency, your own marketing is a live demonstration of your ability — a neglected feed screams 'the cobbler's children have no shoes.' Treat your presence as proof you can do what you charge for. Keep a note of the marketing lessons your agency learns and turn them into content. When your own marketing is excellent and visible, it becomes the single most persuasive argument that clients should trust you with theirs.",
        time_required: "10 min, ongoing",
        carouselabs_tip:
          "CarouseLabs helps you consistently produce quality content, so your agency's own marketing proves you can do what you charge clients for.",
      },
      {
        step_number: 3,
        title: "Write hooks that call out your ideal client's frustration",
        description:
          "The clients you want are frustrated with something specific — an agency that ghosted them, results that never came, wasted ad spend. Your hooks should name that frustration precisely: 'If your last agency sent reports but no results, here's why.' Speaking directly to a prospect's pain makes the right client feel understood before they book a call, which is when agency sales get easy. It also filters out the bad-fit clients who don't share that pain.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that speak to your ideal client's frustrations, so your posts pre-qualify prospects before they reach your inbox.",
      },
      {
        step_number: 4,
        title: "Build a carousel that shows how you think",
        description:
          "Prospects want to see your thinking before trusting you with a budget. Teach one part of your process openly: the audit you run, the framework you use, the mistake you fix on every account. Structure it as hook, common mistake, your method, the steps, and the result. Giving away your thinking doesn't lose clients — it wins the ones who realize they'd rather hire the expert than DIY it badly. Demonstrated expertise is direct pipeline-building.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full process carousel from your notes, so demonstrating your expertise doesn't require an afternoon your delivery team needs.",
      },
      {
        step_number: 5,
        title: "Lead with a sharp point of view, not a service list",
        description:
          "Agencies blur together because they all list the same services. What separates you is a strong opinion about how marketing should be done. Pick the hill you'll die on — 'most brands create too much content and distribute too little' — and build content defending it. A clear point of view attracts the clients who agree (the joy to work with) and repels the ones who'll fight you, which is exactly the filtering a busy agency owner needs.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you develop content around your point of view, so your feed argues a philosophy instead of listing deliverables.",
      },
      {
        step_number: 6,
        title: "Systematize your own marketing so delivery doesn't kill it",
        description:
          "The agency trap: you're so busy delivering for clients that your own marketing goes neglected, and then referrals slow and the pipeline swings. Treat your content like a client account — batch a week in one session, schedule it, protect the time. When your pipeline runs on a system instead of spare moments, you escape the feast-or-famine cycle that forces you to take bad-fit clients just to fill gaps.",
        time_required: "60 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week of agency content at once, so marketing your own shop finally runs like the systems you build for clients.",
      },
      {
        step_number: 7,
        title: "Keep a premium visual identity that samples your work",
        description:
          "Your feed is a live sample of your agency's output — if it looks scrappy, prospects assume your deliverables will too. Lock in a polished, consistent template with your colors and style. A cohesive, high-quality visual identity signals the competence clients pay a premium for, and it makes your posts recognizable amid interchangeable agencies. For a marketing agency, a premium-looking feed is a continuous proof of the quality you deliver.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one branded reference and CarouseLabs matches your agency's colors and style on every carousel, so your feed looks like the premium work you sell.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, marketing agency owners lived the cobbler's-children problem in its purest form: you produced brilliant marketing for clients while your own went silent for months. Delivery always came first, so marketing the agency happened only in the panic between projects — a feast-or-famine pipeline that forced you to take bad-fit clients to cover gaps. Your best proof, the client results you generated weekly, never became content because case studies were one more job nobody had time for. And your generic 'services we offer' posts were indistinguishable from every other agency's, building trust with no one.",
    after_carouselabs:
      "With CarouseLabs, your agency finally markets itself as well as it markets clients. A recent win becomes a proof carousel in minutes. Your sharp point of view runs through a feed that attracts dream clients and filters out nightmares. Because you batch a week in one session and schedule it, your own pipeline runs on a system instead of spare moments — ending the feast-or-famine cycle. Your process carousels demonstrate how you think, drawing in pre-sold leads. And your premium feed samples the quality you deliver, so instead of the agency with no shoes, you become the one whose own marketing proves they can do the job.",
    time_to_first_post:
      "About 20 minutes including onboarding — most agency owners turn a recent client win into their first carousel the same day.",
    quick_wins: [
      "Your first client-result carousel that acts as living proof instead of a case study nobody had time to write.",
      "A batched week scheduled in one session, ending the feast-or-famine cycle in your own pipeline.",
      "Your first inbound lead who books a call already sold on your point of view.",
    ],
  },
  "community-managers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define the community expertise you want known",
        description:
          "Community management spans engagement, moderation, growth, and community-led growth strategy — so pick the facet you own and anchor your content to it. Community is an undervalued, misunderstood discipline, so a clear specialty positions you as a serious practitioner rather than 'the person who replies to comments.' This focus attracts the roles and consulting that value community as a strategic function, which is where the interesting, well-paid work in this field actually lives.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your community specialty, so your feed positions you as a strategic practitioner, not a comment-replier.",
      },
      {
        step_number: 2,
        title: "Turn community wins into strategic proof",
        description:
          "Your wins — the engagement you revived, the member retention you lifted, the community that became a growth channel — are your best content, with permission. Keep a note of these results and the specific intervention behind each. Because community ROI is often questioned, showing real outcomes and the strategy behind them proves your work drives business value, not just good vibes. Concrete results are what elevate community from a nice-to-have to a funded strategic function.",
        time_required: "10 min per win",
        carouselabs_tip:
          "CarouseLabs turns a community win into a proof carousel, so your work reads as strategic business value rather than good vibes.",
      },
      {
        step_number: 3,
        title: "Write hooks that reveal what really builds community",
        description:
          "Community hooks land when they overturn a common assumption: 'Your community isn't dead because members are busy. You built it around your product instead of their problem.' Naming the real, non-obvious reason communities fail signals genuine expertise. Your audience — founders and marketers whose communities are struggling — is hungry for a diagnosis that goes deeper than 'post more,' and a sharp reframe marks you as the person who actually understands community dynamics.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that reveal what really builds community, so your posts signal genuine expertise over surface-level tips.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a community system",
        description:
          "Structure a carousel around one system: how to onboard members so they stick, how to spark member-led conversation, how to measure community health. Walk through the problem, the common mistake, your system, the steps, and the result. Teaching a genuine community system demonstrates your strategic substance and gives readers a framework they can apply. When someone uses your system and their community comes alive, you earn an advocate who spreads your reputation.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full community-system carousel from your method, so your expertise becomes an actionable framework others value.",
      },
      {
        step_number: 5,
        title: "Make the case for community as a business driver",
        description:
          "Community is chronically undervalued, and being the voice who articulates its strategic worth — retention, advocacy, product insight, reduced support costs — is a powerful angle. Share content that reframes community as a business driver, not a cost center. This positions you as a strategic thinker rather than a coordinator, and it resonates with the founders and leaders who are starting to realize community might be their most defensible advantage.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape community-as-business-driver takes into posts, so your feed elevates the discipline you work in.",
      },
      {
        step_number: 6,
        title: "Stay visible while you're busy serving members",
        description:
          "Community work is relentlessly demanding — you're always on, always responding — so personal content easily disappears. Batch a week of posts in one session so your own authority-building stays consistent regardless of member demands. A visible personal brand is what turns a skilled-but-unknown community manager into a sought-after one, opening senior roles and consulting. In an undervalued field, being both excellent and visible is what wins the opportunities.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your authority-building stays consistent even while you're always-on for your members.",
      },
      {
        step_number: 7,
        title: "Present with a warm, human visual identity",
        description:
          "Community is about people and belonging, and your visual identity should feel warm and human rather than corporate. A consistent, approachable look reflects the community sensibility you bring while still looking professional. Lock in your template once so every proof and system carousel carries the same warmth. For a community professional, a feed that feels human and inviting is itself a small demonstration of the atmosphere you know how to create.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel warm and consistent, so your feed reflects the human sensibility you bring to community.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, community managers worked in an undervalued, always-on discipline with no time to build the authority that would change that. Your real wins — the revived engagement, the retention lifts, the community that became a growth channel — stayed invisible, so the field kept getting dismissed as 'the person who replies to comments.' When you posted, it was generic engagement tips that built no strategic credibility. Meanwhile the senior roles and consulting went to community pros who'd made their strategic thinking visible, and your genuine expertise stayed buried under the relentless daily work of serving members.",
    after_carouselabs:
      "With CarouseLabs, your community expertise finally reads as the strategic discipline it is. A community win becomes a proof carousel that shows real business value. A sharp reframe reveals what actually builds community. Your method becomes an actionable system others adopt. Your community-as-business-driver takes elevate the whole field. Because you batch a week in one session, your authority-building stays consistent even while you're always-on for members. Instead of the undervalued coordinator, you become the recognized strategist whose visible thinking opens senior roles and consulting.",
    time_to_first_post:
      "About 15 minutes from signup — appropriately fast for someone who lives in content and engagement.",
    quick_wins: [
      "Your first proof carousel that shows community driving real business value, not just good vibes.",
      "A community-system post that gives founders a framework and grows your strategic authority.",
      "Your first senior role or consulting enquiry from finally making your community thinking visible.",
    ],
  },
  "b2b-sales-professionals": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Decide to sell by being findable, not just by outreach",
        description:
          "Cold outreach gets harder every year while social selling quietly outperforms it — buyers research you before they ever reply. Decide to build a presence that makes prospects warm to you before the first call. Anchor your content to the industry and problem your product solves. When your buyers see you posting genuinely useful insight about their world, your cold email stops being cold. For a B2B seller, a visible presence is the difference between chasing and being sought.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content anchored to your buyers' industry and problems, so prospects warm to you before you ever reach out.",
      },
      {
        step_number: 2,
        title: "Turn buyer conversations into content",
        description:
          "Every discovery call, objection, and lost deal teaches you what your buyers actually worry about — and that's your content goldmine. Keep a note of the questions and pain points prospects raise. Writing about the exact problems your buyers voice makes your content magnetically relevant to the next prospect facing the same thing. This is far more effective than product posts, because it speaks to their problem rather than your solution.",
        time_required: "5 min a day",
        carouselabs_tip:
          "CarouseLabs turns a buyer's real objection or question into a post, so your daily sales conversations become content that pulls in the next prospect.",
      },
      {
        step_number: 3,
        title: "Write hooks that speak to the buyer, not about your product",
        description:
          "Sales hooks fail when they pitch. They land when they name the buyer's problem: 'The hidden cost in your procurement process that nobody's tracking.' Leading with your prospect's world — not your product — earns attention from decision-makers who scroll past every ad. Because B2B buyers are drowning in pitches, a hook that offers genuine insight into their challenge positions you as a helpful expert rather than another rep to ignore.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates buyer-focused hooks that lead with their problem, so your posts earn attention instead of reading as another pitch.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches your buyer something useful",
        description:
          "Structure a carousel around one thing your buyer needs to know: how to evaluate vendors in your category, the mistakes companies make solving this problem, a framework for building the business case. Walk through the problem, the common mistake, your insight, the steps, and the outcome. Giving genuine value builds trust with buyers long before they're ready to purchase — so when they are, you're the rep they already trust rather than a stranger cold-calling.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full buyer-education carousel from your notes, so you deliver real value to prospects without an afternoon away from selling.",
      },
      {
        step_number: 5,
        title: "Be a human, not a quota-carrying robot",
        description:
          "Buyers buy from people they like and trust, so let your personality through. Share the honest side of sales — the deal you lost and learned from, the lesson a prospect taught you, why you believe in what you sell. This humanity differentiates you from the templated outreach flooding your buyers' inboxes and makes you memorable. In a profession people are conditioned to distrust, being genuinely human is a real competitive advantage.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs mixes human, honest angles into your idea feed, so your feed shows the person behind the pitch and makes you memorable.",
      },
      {
        step_number: 6,
        title: "Post consistently so you're warm when buyers are ready",
        description:
          "B2B buying cycles are long and unpredictable — the prospect who buys in eight months is watching you now. Consistent presence means you stay top of mind through that whole window. Batch a week of posts in one session so your visibility holds regardless of how busy your pipeline gets. When the buying moment finally arrives, you're the rep they've been quietly learning from — the warmest possible position from which to win a deal.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so you stay top of mind through long buying cycles even during your busiest quarters.",
      },
      {
        step_number: 7,
        title: "Look credible and professional to senior buyers",
        description:
          "Your buyers are often senior and judge credibility fast, so a polished, consistent visual identity signals professionalism and seriousness. A sharp feed reassures a decision-maker that you're a credible partner, not a spray-and-pray rep. Lock in your template once so every buyer-education carousel carries the same polish. In B2B, where trust and credibility drive deals, a professional-looking feed quietly supports every conversation you're trying to open.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel polished and consistent, so your feed reads as credible to senior buyers.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, B2B sales meant grinding cold outreach into an increasingly hostile inbox. You knew social selling worked — that buyers research you before replying — but between calls, demos, and CRM admin there was no time to build a presence. So prospects found a bare profile, your outreach stayed cold, and you competed on persistence rather than trust. The real insight from your buyer conversations, the exact material that would have made you magnetic to the next prospect, stayed trapped in your call notes. Meanwhile reps who'd built a visible presence had buyers coming to them warm.",
    after_carouselabs:
      "With CarouseLabs, prospects warm to you before you ever reach out. A buyer's real objection becomes a post that pulls in the next prospect facing it. Your hooks lead with their problem, not your pitch, so decision-makers actually stop. Your insight becomes a buyer-education carousel that builds trust long before they're ready. Because you batch a week in one session, you stay top of mind through long buying cycles even in your busiest quarters. Instead of grinding cold outreach, you become the rep buyers already trust when their moment finally arrives.",
    time_to_first_post:
      "About 20 minutes including onboarding — most reps turn a real buyer objection into their first carousel the same day.",
    quick_wins: [
      "Your first buyer-focused carousel that speaks to their problem instead of pitching your product.",
      "A batched week of posts that keeps you top of mind through long buying cycles.",
      "Your first prospect who replies warm because they've been reading your content — outreach that isn't cold.",
    ],
  },
  "sales-managers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Build authority as a leader, not just a closer",
        description:
          "As a sales manager, your content should reflect your shift from individual performance to team leadership. Decide the leadership expertise you want known — coaching reps, building pipeline systems, scaling a team, sales culture. Anchor your content there. This positions you for senior sales leadership roles and attracts the talent you need to hire. A manager known for developing people, not just hitting numbers, is exactly the profile that gets promoted and recruited.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your sales leadership expertise, so your feed builds a leader's reputation, not just a closer's.",
      },
      {
        step_number: 2,
        title: "Turn team wins and coaching moments into content",
        description:
          "Your best content comes from leading a team — the rep you coached from struggling to top performer, the process change that lifted team close rates, the culture shift that cut turnover. Keep a note of these moments and the specific leadership move behind each. These stories demonstrate that you build and develop teams, which is what senior sales leadership roles are actually hired for, and they attract reps who want to work for a manager who invests in people.",
        time_required: "10 min per moment",
        carouselabs_tip:
          "CarouseLabs turns a team win or coaching moment into a leadership story carousel, so your people-development skill becomes visible.",
      },
      {
        step_number: 3,
        title: "Write hooks about the real tensions of sales leadership",
        description:
          "Sales-leadership hooks land when they name a tension every manager feels: 'Your best rep isn't your best hire. Here's the trap.' Speaking to the hard realities — carrying a number through other people, coaching underperformers, protecting culture under quota pressure — creates instant resonance with peers and signals genuine leadership depth. Avoid generic motivation; the specific, uncomfortable truths of managing a sales team are what earn respect from this audience.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks around the real tensions of sales leadership, so your posts resonate with peers instead of sounding like motivation.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a leadership system",
        description:
          "Structure a carousel around one system: how you run pipeline reviews that actually help, how you coach a struggling rep, how you build a forecasting process people trust. Walk through the problem, the common mistake, your system, the steps, and the result. Teaching a genuine leadership system demonstrates your management substance and positions you as a thinker in the sales-leadership space — exactly the profile that attracts senior roles and strong reps.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full leadership-system carousel from your method, so your management approach becomes visible proof of your level.",
      },
      {
        step_number: 5,
        title: "Champion your team publicly",
        description:
          "Some of your most powerful content celebrates your reps — their wins, their growth, the culture you've built. Publicly championing your team makes you a manager people want to work for, turning your feed into a recruiting engine in a market where good sales talent is scarce. It also signals to senior leadership that you build and retain people. A manager who shares credit publicly is a magnet for both talent and promotion.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you turn a rep's win into a post that celebrates your team, so your feed doubles as a recruiting magnet.",
      },
      {
        step_number: 6,
        title: "Stay visible through the quarter's chaos",
        description:
          "Sales management is relentless — forecast pressure, coaching, escalations — so personal content slips easily, especially at quarter-end. Batch a week of posts in one session so your leadership brand keeps building regardless of the cycle. Consistent visibility compounds into the reputation that opens VP roles and attracts strong reps, while a manager who only surfaces occasionally stays invisible to the opportunities their results deserve.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your leadership brand keeps building even through quarter-end chaos.",
      },
      {
        step_number: 7,
        title: "Present with credible, leadership-caliber visuals",
        description:
          "As you build a leadership brand, your feed should look the part — polished and considered rather than scrappy. A clean, consistent visual identity signals the professionalism senior leadership expects and reassures strong reps that you're a credible leader. Lock in your template once so every leadership story and system carousel carries the same polish. A considered feed quietly supports the impression that you operate at the level you're aiming for.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel polished and consistent, so your feed matches the leadership level you're building toward.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, sales managers were consumed by forecast pressure, coaching, and escalations with nothing left for building their own leadership brand. The team wins and coaching breakthroughs that proved you develop people — the exact evidence senior sales leadership roles hire for — stayed invisible. When you posted, it was generic sales motivation that built no leadership credibility. Meanwhile the VP roles went to managers who'd made their thinking visible, and strong reps chose teams led by managers with a public reputation for investing in people. Your leadership was real; nobody outside your team could see it.",
    after_carouselabs:
      "With CarouseLabs, your leadership finally becomes visible. A coaching breakthrough becomes a story carousel that proves you develop people. The real tensions of sales leadership become hooks that resonate with peers. Your management approach becomes a system carousel that shows your level. Championing your reps turns your feed into a recruiting magnet. Because you batch a week in one session, your leadership brand keeps building through quarter-end chaos — compounding into the reputation that opens VP roles and attracts the strong reps you need to hire.",
    time_to_first_post:
      "About 20 minutes including onboarding — most sales managers turn one coaching moment into a first carousel the same day.",
    quick_wins: [
      "Your first leadership-story carousel that proves you develop people, not just hit numbers.",
      "A team-championing post that turns your feed into a recruiting magnet for strong reps.",
      "Your first inbound from a recruiter or rep who noticed the leader you've become visible as.",
    ],
  },
  "account-executives": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Make buyers know you before your first email",
        description:
          "As an AE, your quota depends on getting meetings with people drowning in outreach. A visible presence changes the math — when a prospect recognizes your name from useful content in their feed, your email gets opened. Anchor your content to your buyers' industry and the problems your product solves. This turns you from an unknown rep into a familiar expert, which is the single biggest unlock for reply rates and pipeline.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content anchored to your buyers' world, so prospects recognize your name before your first email lands.",
      },
      {
        step_number: 2,
        title: "Turn your deal experience into buyer-useful content",
        description:
          "Every discovery call and lost deal teaches you what your buyers really wrestle with. Keep a note of the objections, questions, and misconceptions you hear. Writing about the exact problems your prospects voice makes your content magnetically relevant to the next buyer in the same seat. This beats product content every time, because it speaks to their world rather than your pitch — and it positions you as an expert in their problem, not a vendor.",
        time_required: "5 min a day",
        carouselabs_tip:
          "CarouseLabs turns a real objection from a call into a post, so your deal experience becomes content that warms your next prospect.",
      },
      {
        step_number: 3,
        title: "Write hooks that lead with the buyer's problem",
        description:
          "AE hooks fail when they pitch and win when they diagnose: 'Most teams buying in this category get the requirements wrong. Here's what to ask instead.' Leading with genuine insight into your buyer's decision earns attention from people who scroll past every ad. Because B2B buyers are pitched constantly, a hook that helps them think better about their problem positions you as a trusted advisor rather than another rep with a quota.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates buyer-problem hooks, so your posts read as helpful expertise instead of another pitch to ignore.",
      },
      {
        step_number: 4,
        title: "Build a carousel that helps buyers make a better decision",
        description:
          "Structure a carousel around something genuinely useful to your buyer: how to evaluate options in your category, how to build an internal business case, the mistakes teams make implementing this. Walk through the problem, the common mistake, your insight, the steps, and the outcome. Helping buyers decide well — even neutrally — builds trust that pays off when they do buy. You become the rep they call, rather than the one they dodge.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full buyer-decision carousel from your notes, so you deliver real value to prospects without stepping away from selling.",
      },
      {
        step_number: 5,
        title: "Show the human behind the quota",
        description:
          "Buyers are conditioned to distrust salespeople, so letting your personality and honesty through is a genuine differentiator. Share the deal you lost and what it taught you, the prospect who changed your thinking, why you actually believe in what you sell. This humanity makes you memorable amid templated outreach and builds the likeability that quietly closes deals. In a profession people expect to be slick, being real stands out.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs mixes honest, human angles into your idea feed, so your feed shows the person behind the quota and makes you memorable.",
      },
      {
        step_number: 6,
        title: "Stay consistent through the quarter's grind",
        description:
          "Your pipeline needs constant feeding, and buying cycles are long — the prospect who buys next year is watching you now. Batch a week of posts in one session so your visibility holds through quarter-end crunch and demo-heavy weeks. Consistent presence means that when a buyer's moment finally arrives, you're the familiar expert they reach out to, rather than a stranger they ignore. For an AE, that warm recognition is worth more than any outreach sequence.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your visibility holds through quarter-end crunch and long buying cycles.",
      },
      {
        step_number: 7,
        title: "Look like a credible partner, not a spray-and-pray rep",
        description:
          "Your buyers are often senior and judge fast, so a polished, consistent visual identity signals that you're a serious professional worth a meeting. A sharp feed reassures a decision-maker that you're credible before they've spoken to you. Lock in your template once so every buyer-education carousel carries the same polish. In B2B, where credibility opens doors, a professional feed quietly supports every conversation you're trying to start.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel polished and consistent, so senior buyers read you as a credible partner.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, being an AE meant grinding outreach to prospects who'd never heard of you. You knew that buyers who recognize your name reply far more often, but between demos, discovery calls, and CRM admin there was no time to build a presence. So your profile stayed bare, your emails stayed cold, and you competed on volume and persistence instead of trust. The real insight from your buyer conversations — the exact material that would have made you familiar and credible — stayed trapped in call notes, while reps who'd built a following had prospects coming to them.",
    after_carouselabs:
      "With CarouseLabs, prospects recognize your name before your first email. A real objection becomes a post that warms your next buyer. Your hooks diagnose their problem instead of pitching, so decision-makers actually stop. Your insight becomes a carousel that helps buyers decide well and trust you. Because you batch a week in one session, your visibility holds through quarter-end crunch and long buying cycles. Instead of the unknown rep getting ignored, you become the familiar expert buyers reach out to when their moment arrives — the warmest position from which to hit quota.",
    time_to_first_post:
      "About 20 minutes including onboarding — most AEs turn a real objection into their first carousel the same day.",
    quick_wins: [
      "Your first buyer-problem carousel that reads as helpful expertise instead of another pitch.",
      "A batched week that keeps you visible through quarter-end crunch.",
      "Your first prospect who opens your email because they recognized your name from their feed.",
    ],
  },
  "business-development-managers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Position around the partnerships and growth you create",
        description:
          "Business development is about opening doors — partnerships, new markets, strategic deals — so anchor your content to the growth you engineer and the ecosystem you work in. A visible presence makes partners and prospects come to you rather than requiring cold outreach every time. In a role built entirely on relationships and reputation, being a known, credible name in your ecosystem is the single biggest multiplier on your effectiveness.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content anchored to your ecosystem, so partners and prospects come to you instead of requiring cold outreach.",
      },
      {
        step_number: 2,
        title: "Turn deals and partnerships into insight content",
        description:
          "Your best content comes from the deals you structure — the partnership that unlocked a market, the negotiation lesson, the alliance that failed and why. Keep a note of these and the strategic thinking behind each. Because BD is relationship-driven and opaque, sharing real insight into how deals actually get done is fascinating and credible. It proves you're a strategic operator who creates growth, not just a networker with a big contact list.",
        time_required: "10 min per deal",
        carouselabs_tip:
          "CarouseLabs turns a partnership lesson into an insight carousel, so your deal-making experience becomes credible proof of your strategic value.",
      },
      {
        step_number: 3,
        title: "Write hooks that speak to ecosystem opportunity",
        description:
          "BD hooks land when they surface an opportunity or misconception about growth: 'Most partnerships fail before the contract — here's the conversation nobody has.' Leading with strategic insight about how growth and partnerships really work signals that you think at a business level, not just a networking one. This attracts the partners, founders, and executives who might work with you, because it proves you understand the mechanics of creating mutual value.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks around partnership and growth insight, so your posts signal strategic thinking to potential partners.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches how deals get done",
        description:
          "Structure a carousel around one aspect of BD: how to structure a partnership that lasts, how to find the right strategic partner, how to build a business case both sides believe. Walk through the challenge, the common mistake, your approach, the steps, and the outcome. Teaching how deals actually work demystifies your craft, builds your authority, and attracts the partners and opportunities that come from being seen as a genuinely strategic operator.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full deal-making carousel from your notes, so your BD expertise becomes visible authority in your ecosystem.",
      },
      {
        step_number: 5,
        title: "Be visibly generous in your ecosystem",
        description:
          "BD runs on reciprocity, so use your content to celebrate partners, highlight interesting companies, and share genuinely useful connections and insight. Being visibly generous builds the goodwill that makes people want to work with you — and in a relationship-driven role, goodwill compounds into inbound opportunities. The BD professional known for creating value before asking for it is the one whose calls always get returned.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape posts that celebrate partners and share insight, so your feed builds the goodwill BD runs on.",
      },
      {
        step_number: 6,
        title: "Stay consistently visible so opportunities find you",
        description:
          "Partnership and deal opportunities arrive unpredictably, often from people quietly watching you. Consistent presence means you're top of mind when someone's looking for exactly what you offer. Batch a week of posts in one session so your visibility holds despite a travel- and meeting-heavy schedule. In a role where the best opportunities come through relationships and reputation, sustained visibility is what turns you from a cold caller into a magnet.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your visibility holds through a meeting-heavy schedule and opportunities keep finding you.",
      },
      {
        step_number: 7,
        title: "Present with polished, partner-ready visuals",
        description:
          "You approach senior partners and executives, so your feed must look credible and professional. A clean, consistent visual identity signals that you're a serious operator worth partnering with. Lock in your template once so every insight and deal carousel carries the same polish. In a relationship business where first impressions open or close doors, a professional feed quietly supports every partnership conversation you're trying to start.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel polished and consistent, so senior partners read you as a credible operator.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, business development meant working the phones and inbox to open every door manually. You knew a visible reputation would make partners come to you, but between meetings, travel, and deal-structuring there was no time to build one. So your ecosystem didn't know your name, every opportunity required cold outreach, and the strategic insight from your deals — the exact material that would have made you a known, credible operator — stayed in your head. Meanwhile BD pros who'd built visible authority had partnerships and opportunities arriving inbound.",
    after_carouselabs:
      "With CarouseLabs, opportunities start finding you. A partnership lesson becomes an insight carousel that proves your strategic value. A hook about how deals really work signals you think at a business level. Your approach becomes a carousel that builds authority in your ecosystem. Your visibly generous posts build the goodwill BD runs on. Because you batch a week in one session, your visibility holds through a meeting-heavy schedule — so when someone's looking for exactly what you offer, you're top of mind. Instead of opening every door manually, you become the known operator whose calls get returned.",
    time_to_first_post:
      "About 20 minutes including onboarding — most BD managers turn one partnership lesson into a first carousel the same day.",
    quick_wins: [
      "Your first deal-insight carousel that proves you're a strategic operator, not just a networker.",
      "A batched week that keeps you visible through a travel- and meeting-heavy schedule.",
      "Your first inbound partnership enquiry from someone who's been quietly following your thinking.",
    ],
  },
  "software-engineers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Decide what you want your engineering reputation to be",
        description:
          "You're not selling a product — you're building a reputation that leads to better roles, higher offers, and influence. Decide the technical identity you want: the distributed-systems person, the developer-experience advocate, the pragmatic architect. Anchoring your content to one area makes you the name people associate with it. In a field where hiring is relationship- and reputation-driven, a visible technical identity is worth more to your career than another certification.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content anchored to your technical identity, so your feed builds a focused reputation rather than scattered opinions.",
      },
      {
        step_number: 2,
        title: "Turn the problems you debug into teaching content",
        description:
          "Every gnarly bug, architecture decision, and refactor you handle is content other engineers want. Keep a note of the technical problems you solve and the reasoning behind your choices. These lived, specific examples are far more valuable than recycled tutorial content, because engineers want to see how a real practitioner thinks through trade-offs. Your daily work is a continuous stream of teachable moments that most engineers never share.",
        time_required: "5 min a day",
        carouselabs_tip:
          "CarouseLabs turns a short note about a technical problem you solved into a teaching post, so your daily work becomes career-building content.",
      },
      {
        step_number: 3,
        title: "Write hooks that name a real engineering pain",
        description:
          "Engineering hooks land when they name a shared frustration or a hard-won lesson: 'We spent 3 weeks on a caching layer we didn't need. Here's how to tell.' Leading with a specific, technical reality — not a generic 'clean code matters' take — earns respect from a skeptical audience allergic to fluff. Engineers scroll past platitudes but stop for concrete war stories with a real technical lesson inside.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks around real engineering pains, so your posts earn respect from an audience that scrolls past platitudes.",
      },
      {
        step_number: 4,
        title: "Build a carousel that explains a technical concept clearly",
        description:
          "Structure a carousel around one concept: how a system works, why an architecture choice matters, a debugging methodology. Walk through the problem, the naive approach, the insight, the solution, and the trade-off. Explaining technical depth clearly is a rare and valued skill — it demonstrates both your knowledge and your communication ability, which is exactly the combination that gets engineers promoted into senior and staff roles where influence matters more than raw code output.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full technical-explainer carousel from your notes, so your depth becomes clear, shareable content without an evening of writing.",
      },
      {
        step_number: 5,
        title: "Share the failures and trade-offs honestly",
        description:
          "The outage you caused, the design you regret, the premature optimization that cost weeks — these honest posts build more authority than any success story, because they demonstrate the judgment that only comes from being wrong. Engineering is a craft of trade-offs under uncertainty, so showing you can reflect honestly on a mistake signals exactly the maturity that senior and staff engineers are hired for.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape a technical failure into a reflective lesson that reads as senior judgment rather than an admission of weakness.",
      },
      {
        step_number: 6,
        title: "Post consistently without it eating your focus time",
        description:
          "Engineers guard deep work fiercely, and rightly so — context-switching to write posts is costly. Batch a week of posts in one session so your reputation-building never competes with your flow state. Consistency is what compounds into the recruiter DMs, conference invites, and opportunities that follow visible engineers, while equally skilled but invisible engineers watch those opportunities go elsewhere. Protecting deep work and building a reputation aren't mutually exclusive if you batch.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so reputation-building never interrupts your deep work or flow state.",
      },
      {
        step_number: 7,
        title: "Present code and concepts cleanly and consistently",
        description:
          "Technical content lives or dies on clarity, so a clean, consistent visual identity makes your explainers easy to follow and your feed recognizable. Clear presentation of complex ideas is itself a demonstration of the communication skill that separates senior engineers from strong coders. Lock in your template once so every explainer and war story carries the same clean polish, letting the technical substance stay the focus.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clean and consistent, so your technical content reads as clearly as you think it.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, building an engineering reputation was something you meant to do and never did. Between sprints, code review, and on-call, writing a thoughtful technical post always lost — and context-switching out of deep work to wrestle with prose felt genuinely costly. So the hard problems you solved every week, the exact material that would have marked you as a sharp practitioner, stayed in PRs and Slack threads. Meanwhile the senior roles, conference invites, and recruiter DMs went to engineers who'd figured out how to be visible, even when their actual work was no better than yours.",
    after_carouselabs:
      "With CarouseLabs, your everyday engineering work becomes the content that builds your career. A gnarly bug becomes a teaching post. A technical concept becomes a clear explainer that demonstrates both depth and communication skill. An outage becomes a reflection that reads as senior judgment. Because you batch a week in one session, reputation-building never interrupts your flow state — and consistency compounds into the recruiter DMs, conference invites, and staff-level opportunities you used to watch go to louder, not better, engineers.",
    time_to_first_post:
      "About 20 minutes including onboarding — most engineers turn a real problem from their week into a first teaching carousel the same day.",
    quick_wins: [
      "Your first technical explainer that proves you can communicate depth clearly — the senior-engineer differentiator.",
      "A batched week of posts that builds your reputation without interrupting deep work.",
      "Your first recruiter or peer DM referencing a post — proof your feed is becoming a career asset.",
    ],
  },
  "web-developers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define your web development niche and audience",
        description:
          "Web development is crowded, so decide your focus — frontend performance, a specific framework, accessibility, full-stack for startups — and whether you're building toward freelance clients or better roles. Anchor your content accordingly. A clear specialty makes you findable and memorable, and for freelancers especially, it commands higher rates than generalist positioning. In a field where anyone can claim to build websites, a visible specialty is what makes you the obvious choice.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your web dev specialty, so your feed attracts the specific clients and roles you want.",
      },
      {
        step_number: 2,
        title: "Turn your builds into visible proof of skill",
        description:
          "Every project you ship — the performance win, the tricky integration, the UI problem you solved elegantly — is proof content that markets you better than any 'available for work' post. Keep a note of these with permission where client work is involved. Showing your actual work in action lets prospects and hiring managers pre-judge your quality and reach out already convinced, rather than you chasing them with a portfolio link.",
        time_required: "10 min per project",
        carouselabs_tip:
          "CarouseLabs turns a project into a proof-of-skill carousel, so your portfolio grows every time you ship something.",
      },
      {
        step_number: 3,
        title: "Write hooks about real web problems developers face",
        description:
          "Web dev hooks land when they promise a concrete fix or a hard-won lesson: 'Your Lighthouse score is lying to you. Here's what actually made our site fast.' Leading with a specific, technical reality earns attention from a practical audience that scrolls past generic 'learn to code' content. Concrete problems and measurable results are what stop developers and technical buyers mid-scroll.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks around real web development problems, so your posts grab a practical audience allergic to generic content.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a real technique",
        description:
          "Structure a carousel around one technique: how to optimize load time, how to structure a component library, how to make a site genuinely accessible. Walk through the problem, the common mistake, your technique, the steps, and the result. Teaching a usable technique demonstrates your expertise and gives readers real value. When a developer applies your method and it works, you earn a follower and an advocate — and when a client sees it, they see the expert they'd rather hire.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full technique carousel from your method, so your expertise becomes actionable value that grows your authority.",
      },
      {
        step_number: 5,
        title: "Share your take on the fast-moving web ecosystem",
        description:
          "The web changes constantly — frameworks, tooling, standards, AI-assisted development — and a grounded take on these positions you as a developer who's current without chasing every hype cycle. Share your perspective on what's actually worth adopting and what isn't. This pragmatic voice resonates with developers exhausted by framework churn and reassures clients that you make sensible technology choices rather than rewriting everything each year.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs surfaces web development trends and helps you shape a grounded take, so your feed reads as pragmatic rather than hype-chasing.",
      },
      {
        step_number: 6,
        title: "Post consistently without breaking your flow",
        description:
          "Developers guard focus time, and freelancers face the added trap of going silent whenever a project lands — then scrambling for work when it ends. Batch a week of posts in one session so your visibility holds without interrupting your build time. For freelancers this smooths the income roller coaster; for employed developers it compounds into the reputation that opens better roles. Either way, batching keeps content from competing with code.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your visibility holds through heads-down build weeks without breaking your flow.",
      },
      {
        step_number: 7,
        title: "Make your feed demonstrate your eye for quality",
        description:
          "As a web developer, visual quality and polish are part of your craft, so a scrappy feed undercuts your credibility. A clean, consistent, well-designed visual identity demonstrates the attention to detail clients and employers are hiring for. Lock in your template once so every proof and technique carousel looks the part. Your feed's polish is itself a small portfolio piece, proving you care about the quality of what you ship.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clean and consistent, so your feed demonstrates the eye for quality you're hired for.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, web developers shipped great work that nobody outside the project ever saw. Between builds, code review, and client deadlines, writing posts always lost — and context-switching out of flow to wrestle with prose felt costly. So your projects, performance wins, and elegant solutions stayed invisible, and you competed for clients on price or for roles on a resume rather than on demonstrated expertise. For freelancers, the silence during busy projects meant a scramble for work when they ended. Your craft was real; your visibility wasn't.",
    after_carouselabs:
      "With CarouseLabs, your builds become visible proof of skill. A project becomes a portfolio carousel that markets you without a cold pitch. A real web problem becomes a hook that grabs a practical audience. Your technique becomes actionable value that grows your authority. Your grounded take on the ecosystem reads as pragmatic rather than hype-chasing. Because you batch a week in one session, your visibility holds through heads-down build weeks without breaking flow — smoothing the freelance roller coaster and compounding into better roles. Your polished feed proves the eye for quality you're hired for.",
    time_to_first_post:
      "About 20 minutes including onboarding — most developers turn a recent project into a first proof carousel the same day.",
    quick_wins: [
      "Your first proof-of-skill carousel from a real project — portfolio content that markets you without a cold pitch.",
      "A batched week that keeps you visible through heads-down build weeks.",
      "Your first inbound client or role enquiry from demonstrated expertise rather than a resume.",
    ],
  },
  "data-scientists": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Decide the data problem you want to be known for",
        description:
          "Data science spans modeling, experimentation, analytics engineering, and ML deployment — so pick your focus and anchor your content to it. Whether you're aiming for senior roles, consulting, or industry influence, being known for a specific data specialty beats generalist positioning. In a field where the title means wildly different things at different companies, a clear identity makes your expertise legible and attracts the specific opportunities you actually want.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your data specialty, so your feed builds a legible identity in a field where titles mean everything and nothing.",
      },
      {
        step_number: 2,
        title: "Turn your analyses into insight content",
        description:
          "Your best content is the real analytical work you do — the surprising finding, the model that failed and why, the experiment that overturned an assumption. Keep a note of these and the reasoning behind each. Data people are hungry for real practitioner stories rather than tutorial content, because the hard part of data science is judgment under ambiguity, not syntax. Sharing your reasoning proves you have that judgment.",
        time_required: "10 min per analysis",
        carouselabs_tip:
          "CarouseLabs turns a real analysis or finding into an insight carousel, so your practitioner judgment becomes visible career-building content.",
      },
      {
        step_number: 3,
        title: "Write hooks that surface a counterintuitive data truth",
        description:
          "Data hooks land when they promise a surprising finding or bust a methodological myth: 'Our A/B test was significant. It was also completely wrong. Here's why.' Leading with a counterintuitive, technically-grounded truth earns attention from a rigorous audience allergic to hype. Data people scroll past 'AI will change everything' takes but stop for a specific, well-reasoned insight that challenges how they work.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks around counterintuitive data truths, so your posts earn attention from a rigorous, hype-resistant audience.",
      },
      {
        step_number: 4,
        title: "Build a carousel that explains a concept without the jargon",
        description:
          "Structure a carousel around one concept: how to design a trustworthy experiment, why your model is overfitting, how to communicate uncertainty to stakeholders. Walk through the problem, the naive approach, the insight, the method, and the caveat. Explaining statistical depth clearly is rare and valuable — it demonstrates both rigor and communication ability, which is exactly the combination that gets data scientists promoted into roles where influence matters more than notebooks.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full explainer carousel from your notes, so your statistical depth becomes clear content without an evening of writing.",
      },
      {
        step_number: 5,
        title: "Share the stakeholder side, not just the modeling",
        description:
          "Most data science content obsesses over models while the actual job is often persuading stakeholders and defining the right question. Share content about the human side — how to push back on a bad metric, how to communicate uncertainty, how to say 'the data can't answer that.' This resonates deeply with practitioners living those struggles and positions you as a mature data professional rather than a Kaggle competitor.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs mixes stakeholder and communication angles into your idea feed, so your content reflects the real job, not just the modeling.",
      },
      {
        step_number: 6,
        title: "Post consistently without breaking deep work",
        description:
          "Data work demands long stretches of focus, so context-switching to write is costly. Batch a week of posts in one session so your reputation-building never competes with your analysis time. Consistency compounds into the recruiter interest, speaking invites, and consulting opportunities that follow visible data scientists, while equally rigorous but invisible practitioners watch those opportunities go elsewhere. Batching lets you protect focus and build a reputation at once.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so reputation-building never interrupts the deep focus your analysis requires.",
      },
      {
        step_number: 7,
        title: "Present data and concepts with clean, credible visuals",
        description:
          "You communicate quantitative ideas for a living, and your carousels should demonstrate that skill. A clean, consistent visual identity makes your explanations easy to follow and signals the rigor you bring. Lock in your template once so every insight and explainer carousel carries the same clarity. For a data scientist, clear visual communication of complex ideas is literally part of the job, so a well-presented feed is a live demonstration of your competence.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clean and consistent, so your quantitative ideas read as clearly as you reason them.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, data scientists did rigorous, high-judgment work that stayed entirely invisible. Your surprising findings, failed models, and hard-won methodological lessons lived in notebooks and internal decks, never becoming the content that builds a reputation — and context-switching out of deep analysis to write felt costly. When you posted, it was generic AI commentary that built no credibility with a rigorous audience. Meanwhile senior roles, speaking invites, and consulting went to data scientists who'd made their thinking visible, and your genuine analytical judgment stayed hidden in the notebook.",
    after_carouselabs:
      "With CarouseLabs, your analytical judgment finally becomes visible. A real finding becomes an insight carousel that proves your practitioner depth. A counterintuitive truth becomes a hook that earns a rigorous audience's attention. Your concept becomes a clear explainer that demonstrates both rigor and communication. Your stakeholder content reflects the real job, not just modeling. Because you batch a week in one session, reputation-building never interrupts your deep focus — and consistency compounds into the recruiter interest and speaking invites you used to watch go elsewhere.",
    time_to_first_post:
      "About 20 minutes including onboarding — most data scientists turn one real finding into a first carousel the same day.",
    quick_wins: [
      "Your first insight carousel that proves your analytical judgment, not just your tooling.",
      "A clear explainer that demonstrates the rare combination of rigor and communication skill.",
      "Your first recruiter or speaking enquiry from finally making your thinking visible.",
    ],
  },
  "ai-researchers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Decide how you want to contribute to the AI conversation",
        description:
          "AI discourse is deafening and mostly shallow, so decide the substantive contribution only you can make — your research area, your grounded perspective on capabilities, your view on where the field is actually heading. Anchor your content to genuine expertise rather than hype commentary. In a space where everyone has an AI take, being one of the few with actual research depth is an enormous differentiator that attracts collaborators, opportunities, and serious attention.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content anchored to your research depth, so your feed contributes substance to a conversation drowning in hype.",
      },
      {
        step_number: 2,
        title: "Translate your research into accessible insight",
        description:
          "Your papers and findings are locked behind technical language that most of your potential audience can't parse. Keep a note of the core insights from your work and practice explaining each in plain terms. Translating genuine research into accessible content is rare and valuable — it makes you the researcher whose ideas actually spread, which drives citations, collaborations, and influence far beyond what a paper alone achieves.",
        time_required: "10 min per insight",
        carouselabs_tip:
          "CarouseLabs turns a research insight into an accessible carousel, so your work reaches beyond the people who read papers.",
      },
      {
        step_number: 3,
        title: "Write hooks that cut through AI hype with rigor",
        description:
          "AI hooks land when they bring grounded reality to an overheated conversation: 'This model isn't reasoning. Here's what it's actually doing — and why the distinction matters.' Leading with rigorous clarity in a hype-saturated space is genuinely refreshing and highly shareable. Because so much AI content is breathless speculation, a researcher offering precise, honest framing stands out immediately to the many people hungry for signal over noise.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that bring rigor to AI hype, so your posts deliver the signal a noise-saturated audience is hungry for.",
      },
      {
        step_number: 4,
        title: "Build a carousel that explains a hard idea clearly",
        description:
          "Structure a carousel around one concept from your field: how a technique actually works, why a common assumption is wrong, what a benchmark really measures. Walk through the question, the popular misconception, the actual mechanism, and the implication. Making genuinely hard ideas legible is a rare skill that builds enormous authority — it positions you as a researcher who can bridge the technical and the public, which opens doors most researchers never see.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full explainer carousel from your notes, so your hard research ideas become legible without dumbing them down.",
      },
      {
        step_number: 5,
        title: "Be honest about limitations and uncertainty",
        description:
          "The AI conversation rewards overclaiming, so being the researcher who's honest about what we don't know is both a public service and a differentiator. Share content about limitations, open problems, and appropriate uncertainty. This intellectual honesty builds deep trust with the people who matter — other researchers, thoughtful practitioners, and decision-makers who are tired of hype and desperate for someone credible to tell them the truth.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape honest takes on limitations into posts, so your feed builds trust through rigor rather than overclaiming.",
      },
      {
        step_number: 6,
        title: "Stay consistently present in a fast-moving field",
        description:
          "AI moves weekly, and a researcher who surfaces occasionally gets lost. Batch a week of posts in one session so your voice stays present without derailing your research time. Consistent visibility compounds into the influence that attracts collaborators, funding conversations, and the chance to shape how your field is understood — which, for a researcher, is often as valuable as the research itself.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your voice stays present in a fast-moving field without derailing your research.",
      },
      {
        step_number: 7,
        title: "Present complex ideas with clean, credible visuals",
        description:
          "Research communication lives on clarity, so a clean, consistent visual identity makes your explainers followable and your feed recognizable. Clear presentation signals the same rigor you bring to your work. Lock in your template once so every research insight and explainer carries the same considered polish, letting the substance stay the focus rather than competing with distracting design.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clean and consistent, so your research ideas read as clearly as you reason them.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, AI researchers watched a deafening, mostly shallow public conversation about their own field and had no bandwidth to improve it. Your genuine research insight stayed locked in papers that few outside your subfield read, while confident non-experts shaped public understanding. Writing accessible content took time your research demanded, so you stayed silent — and the influence, collaborations, and opportunities went to researchers who'd learned to communicate publicly. Your rigor was real; the conversation happened without you.",
    after_carouselabs:
      "With CarouseLabs, your research finally reaches beyond the people who read papers. A finding becomes an accessible carousel that spreads your ideas. A rigorous hook cuts through AI hype and delivers the signal people are starved for. A hard concept becomes legible without being dumbed down. Your honesty about limitations builds deep trust with researchers and decision-makers alike. Because you batch a week in one session, your voice stays present in a fast-moving field without derailing your work — compounding into the influence to actually shape how your field is understood.",
    time_to_first_post:
      "About 20 minutes including onboarding — most researchers turn one insight into an accessible first carousel the same day.",
    quick_wins: [
      "Your first accessible carousel that spreads a research insight beyond your subfield.",
      "A rigorous, honest post that delivers signal to an audience drowning in AI hype.",
      "Your first collaboration or speaking enquiry from finally being part of the public conversation.",
    ],
  },
  "ux-designers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define the design problem you want known for solving",
        description:
          "UX spans research, interaction design, systems, and strategy — so pick your focus and anchor your content to it. Whether you're building toward senior roles, freelance clients, or industry standing, a clear specialty makes you memorable. And crucially, as a designer, your content is a live demonstration of your craft, so a well-designed, thoughtful feed is worth more than any portfolio link in proving you can actually do the work.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your design specialty, so your feed builds a memorable identity in a crowded field.",
      },
      {
        step_number: 2,
        title: "Turn design decisions into reasoning content",
        description:
          "Your value isn't pretty screens — it's the reasoning behind them. Keep a note of the design decisions you make and why: the research insight that changed a flow, the trade-off you navigated, the pattern you rejected. Showing your thinking, not just your output, is what separates a designer from a decorator. It's exactly the depth that gets designers hired into senior roles where influence and judgment matter more than pixel-pushing.",
        time_required: "10 min per decision",
        carouselabs_tip:
          "CarouseLabs turns a design decision into a reasoning carousel, so your thinking — not just your visuals — becomes visible proof of your level.",
      },
      {
        step_number: 3,
        title: "Write hooks that reframe how people see design",
        description:
          "UX hooks land when they challenge a common misunderstanding: 'Your users aren't confused by your UI. They're confused by your product's model of the world.' Reframing a design problem at a deeper level signals strategic thinking and separates you from designers who only talk about aesthetics. This attracts the product leaders and founders who need a designer who thinks systemically, not just someone to make things look nice.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that reframe design problems, so your posts signal strategic depth rather than surface aesthetics.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a design principle",
        description:
          "Structure a carousel around one principle: how to run useful research on a budget, why a pattern fails, how to design for the unhappy path. Walk through the problem, the common mistake, your principle, how to apply it, and the outcome. Teaching design thinking demonstrates your substance and — because you're a designer — the carousel's own craft doubles as proof of your ability. The medium is the portfolio.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full design-principle carousel from your notes — and its own craft demonstrates the skill you're teaching.",
      },
      {
        step_number: 5,
        title: "Advocate for users and the value of design",
        description:
          "Design is chronically under-valued in many organizations, and being the voice who articulates its business worth — retention, conversion, trust, reduced support cost — is a powerful angle. Share content that makes the case for design as a business driver, not decoration. This positions you as a strategic partner rather than a service function, which is exactly the framing that earns designers a seat at the table and better opportunities.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape design-as-business-value takes into posts, so your feed elevates design from decoration to strategy.",
      },
      {
        step_number: 6,
        title: "Post consistently without draining your creative energy",
        description:
          "Design work is creatively demanding, so producing personal content on top of it is easy to abandon. Batch a week of posts in one session so your visibility holds without draining the creative energy your client or product work needs. Consistency compounds into the reputation that opens senior roles, freelance clients, and speaking — while equally talented but invisible designers watch those opportunities go to peers who simply showed up.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so building your presence doesn't drain the creative energy your design work needs.",
      },
      {
        step_number: 7,
        title: "Make your feed a flawless demonstration of your craft",
        description:
          "You're a designer — your feed's visual quality is judged mercilessly and is your most direct proof of ability. A polished, distinctive, perfectly consistent visual identity is itself your strongest portfolio piece. Lock in a considered template once so every reasoning and principle carousel exemplifies your craft. For a UX designer, a beautifully executed feed does more selling than any case study, because it proves you can actually do the thing you claim.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel flawlessly designed, so your feed becomes your strongest portfolio piece.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, UX designers faced a painful bind: your feed is judged as a portfolio, but design work drained the exact creative energy needed to produce personal content. So your presence went quiet or looked rushed — a credibility problem for someone selling design craft. The reasoning behind your work, the thing that separates a designer from a decorator, stayed invisible in Figma files and internal reviews. Meanwhile the senior roles and clients went to designers who'd made their thinking visible, and your genuine strategic depth stayed hidden behind pretty screens nobody saw.",
    after_carouselabs:
      "With CarouseLabs, your feed becomes the portfolio piece it should be. A design decision becomes a reasoning carousel that proves you think strategically. A reframe signals depth beyond aesthetics. Your principle becomes a carousel whose own craft demonstrates your skill. Your design-as-business-value takes earn you a seat at the table. Because you batch a week in one session, building your presence doesn't drain the creative energy your real work needs — and your flawlessly designed feed does more selling than any case study, proving you can actually do the thing you claim.",
    time_to_first_post:
      "About 20 minutes including onboarding — most designers turn one design decision into a first carousel the same day.",
    quick_wins: [
      "Your first reasoning carousel that proves you're a strategic designer, not a decorator.",
      "A flawlessly designed feed that becomes your strongest portfolio piece.",
      "Your first senior role or client enquiry from finally making your design thinking visible.",
    ],
  },
  "product-designers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Anchor your identity to product outcomes, not visuals",
        description:
          "Product design is about shipping things that work for users and the business, so anchor your content to outcomes rather than aesthetics. Decide the product-design expertise you own — 0-to-1 design, design systems, complex workflows, growth design. This focus positions you as a designer who thinks in products and outcomes, which is exactly the profile that earns senior roles and equity-worthy positions rather than pixel-execution work.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your product-design specialty, so your feed builds an identity around outcomes, not just visuals.",
      },
      {
        step_number: 2,
        title: "Turn shipped work into outcome stories",
        description:
          "Your best content is the products you've shipped and what happened — the redesign that lifted activation, the flow you simplified, the feature you argued against. Keep a note of these and the outcome behind each. Tying design work to real product results proves you understand that design serves the business, which is what separates senior product designers from portfolio-first designers and gets you into the rooms where decisions are made.",
        time_required: "10 min per project",
        carouselabs_tip:
          "CarouseLabs turns a shipped project into an outcome-led carousel, so your design work reads as business impact, not just visuals.",
      },
      {
        step_number: 3,
        title: "Write hooks about the tensions of product design",
        description:
          "Product design hooks land when they name a real tension: 'The prettiest design we shipped was our worst-performing. Here's what we learned.' Speaking to the hard trade-offs — craft vs speed, user needs vs business goals, saying no to a stakeholder — creates instant resonance with peers and signals maturity. Avoid pure aesthetics takes; the uncomfortable realities of shipping product are what earn respect in this audience.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks around real product-design tensions, so your posts resonate with practitioners rather than sounding like design theory.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a product-design method",
        description:
          "Structure a carousel around one method: how to design a first version worth shipping, how to build a design system that survives, how to validate before building. Walk through the problem, the common mistake, your method, the steps, and the outcome. Teaching a real product-design method demonstrates your substance while the carousel's craft proves your ability — a double demonstration few other professions get from a single post.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full method carousel from your notes — and its own craft demonstrates the design skill you're describing.",
      },
      {
        step_number: 5,
        title: "Share the collaboration side of product work",
        description:
          "Product design is deeply collaborative — with engineers, PMs, and stakeholders — and content about that reality resonates strongly. Share how you influence without authority, how you handle disagreement with a PM, how you partner with engineering. This positions you as a mature product partner rather than a designer who hands off mockups, which is precisely the profile senior product design roles are hired for.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs mixes collaboration and influence angles into your idea feed, so your content reflects the real, cross-functional product-design job.",
      },
      {
        step_number: 6,
        title: "Post consistently without draining creative energy",
        description:
          "Product design work is creatively and emotionally demanding, so personal content is easy to drop. Batch a week of posts in one session so your visibility holds without draining the energy your product work needs. Consistency compounds into the reputation that opens senior and staff design roles, while equally skilled but invisible designers watch those opportunities go to peers who made their thinking public.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so building your presence doesn't drain the creative energy your product work demands.",
      },
      {
        step_number: 7,
        title: "Let your feed prove your craft",
        description:
          "As a product designer, your feed's visual execution is scrutinized as a work sample. A polished, considered, perfectly consistent visual identity is itself a portfolio piece proving you can execute. Lock in a template once so every outcome story and method carousel exemplifies your craft. Because you're judged on both thinking and execution, a feed that demonstrates both is the most complete proof of your ability you can offer.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel beautifully consistent, so your feed proves both your thinking and your execution.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, product designers shipped work that drove real outcomes and told nobody. Design work drained the creative energy needed for personal content, so your feed stayed quiet — a problem when your feed is judged as a work sample. The outcomes you drove and the trade-offs you navigated stayed invisible in Figma and internal reviews, so you were seen as a pixel executor rather than a product partner. Meanwhile senior and staff roles went to designers who'd made their thinking public, and your genuine product judgment stayed hidden.",
    after_carouselabs:
      "With CarouseLabs, your product judgment becomes visible. A shipped project becomes an outcome-led carousel that reads as business impact. A real design tension becomes a hook that resonates with practitioners. Your method becomes a carousel whose craft proves your ability. Your collaboration content positions you as a mature product partner. Because you batch a week in one session, building your presence doesn't drain the energy your product work needs — and your feed proves both your thinking and your execution, the most complete case for the senior roles you want.",
    time_to_first_post:
      "About 20 minutes including onboarding — most product designers turn one shipped project into a first carousel the same day.",
    quick_wins: [
      "Your first outcome-led carousel that reframes your design work as business impact.",
      "A feed that proves both your thinking and your execution — the complete case for senior roles.",
      "Your first inbound from a company that wants a product partner, not a pixel executor.",
    ],
  },
  "developer-advocates": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Remember your feed is your job performance",
        description:
          "For a developer advocate, public presence isn't a side project — it's the core of the role. Decide the technical domain and developer audience you serve, and anchor your content to genuinely helping them. The trap is becoming a marketing mouthpiece; the win is being an actually useful engineer who happens to work for a company. That authenticity is what earns developer trust, and developer trust is the entire product of your job.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content anchored to genuinely helping developers, so your feed builds the trust your role depends on.",
      },
      {
        step_number: 2,
        title: "Turn developer pain into genuinely useful content",
        description:
          "You sit between your product and real developers, hearing their frustrations daily. Keep a note of the problems developers actually hit — the confusing docs, the integration gotcha, the pattern that trips everyone up. Turning real developer pain into helpful content is your highest-leverage work, because it serves the community first and your product second. Developers can smell the difference instantly, and only the first approach earns their trust.",
        time_required: "10 min a day",
        carouselabs_tip:
          "CarouseLabs turns a real developer pain point into a helpful carousel, so your content serves the community rather than reading as marketing.",
      },
      {
        step_number: 3,
        title: "Write hooks that promise developers a real solution",
        description:
          "DevRel hooks land when they promise concrete technical help: 'The auth pattern that breaks in production (and the fix nobody documents).' Leading with a genuine, specific developer problem earns attention from an audience that's ruthless about detecting marketing. Avoid product-first hooks — developers scroll past them instantly. A hook that solves a real problem proves you're an engineer serving the community, not a rep with a quota.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that promise real technical solutions, so your posts earn attention from an audience that instantly detects marketing.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches something genuinely useful",
        description:
          "Structure a carousel around one thing developers need: how a protocol works, how to debug a common failure, an architecture pattern worth knowing. Walk through the problem, the naive approach, the insight, the solution, and the trade-off. Teaching without pitching is the essence of good DevRel — when developers learn something valuable from you for free, they trust you, and that trust is what eventually makes them try your product.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full technical-teaching carousel from your notes, so you deliver genuine developer value without it reading as a pitch.",
      },
      {
        step_number: 5,
        title: "Be honest, including about your own product",
        description:
          "The fastest way to earn developer trust is honesty — acknowledging your product's limitations, recommending a competitor when it's genuinely better, admitting a bug. Developers are deeply cynical about corporate voices, so a advocate who tells the truth stands out enormously. This honesty is counterintuitive to marketing instincts but it's exactly what makes developers actually listen to you when you do recommend your product.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape honest, non-salesy content, so your feed builds the developer trust that makes your advocacy actually work.",
      },
      {
        step_number: 6,
        title: "Stay consistently present — it's the job",
        description:
          "Your impact scales with consistent presence, but conference travel, docs work, and community support eat your time. Batch a week of posts in one session so your visibility never lapses. For a developer advocate, consistent public output isn't just career-building — it's literally the measurable output of your role, and a system that sustains it through a busy travel season is the difference between a good year and a great one.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your public output — the core of your role — stays consistent through conference and travel season.",
      },
      {
        step_number: 7,
        title: "Present technical content cleanly and consistently",
        description:
          "Technical content lives on clarity, and a clean, consistent visual identity makes your explainers easy to follow and your feed recognizable to developers. Clear presentation signals the same care you'd want in documentation. Lock in your template once so every technical teaching carousel carries the same clean polish, letting the substance stay the focus rather than competing with over-designed marketing aesthetics developers distrust.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clean and developer-friendly, so your technical content stays the focus.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, developer advocates were stretched impossibly thin — conference travel, docs, community support, and demos left no time for the consistent public content that is literally the core output of the role. So your presence lapsed between conferences, and the real developer pain you heard daily never became the helpful content that would have earned community trust. When you did post, time pressure pushed it toward product marketing, which developers detect and dismiss instantly. Your job was to build developer trust; the pace of the job kept undermining it.",
    after_carouselabs:
      "With CarouseLabs, your public output finally matches your role. Real developer pain becomes genuinely helpful content that serves the community first. A hook promising a concrete fix earns attention from an audience that detects marketing instantly. Your knowledge becomes technical teaching that builds trust without pitching. Your honesty — even about your product's limits — makes developers actually listen. Because you batch a week in one session, your presence stays consistent through conference season, so the trust you build compounds instead of resetting every time you travel.",
    time_to_first_post:
      "About 15 minutes from signup — appropriately fast for someone whose whole role is public technical content.",
    quick_wins: [
      "Your first genuinely helpful carousel that serves developers rather than reading as marketing.",
      "Consistent public output through conference season — the measurable core of your role, sustained.",
      "Your first developer who says your content actually helped them ship — trust earned, not bought.",
    ],
  },
  "technical-writers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Position around the technical communication you master",
        description:
          "Technical writing spans API docs, developer guides, information architecture, and content strategy for complex products — so pick your focus and anchor your content to it. Whether you're building toward senior roles, freelance clients, or industry standing, a clear specialty makes you findable. And as a writer, your own content is the most direct proof of your ability to make complex things clear — the exact skill you're hired for.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your technical writing specialty, so your feed builds a findable identity in an undervalued field.",
      },
      {
        step_number: 2,
        title: "Show your craft by making hard things clear",
        description:
          "Every day you turn engineering complexity into something a human can follow — that's a rare, valuable skill most people underestimate. Keep a note of the documentation challenges you solve and the decisions behind them. Sharing how you make complexity legible demonstrates your craft far better than describing it, and it elevates the perception of technical writing from 'writing things down' to the information design discipline it actually is.",
        time_required: "10 min per challenge",
        carouselabs_tip:
          "CarouseLabs turns a documentation challenge into a craft carousel, so your information-design skill becomes visible and valued.",
      },
      {
        step_number: 3,
        title: "Write hooks that prove you make complexity simple",
        description:
          "Your hooks are a live demonstration of the clarity you sell: 'Your docs aren't too technical. They're answering the wrong question.' Leading with a sharp, clear reframe proves you understand both the technical substance and the human reading it. Because your entire craft is making hard things graspable quickly, every hook you write is an audition for the exact skill employers and clients are evaluating.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates clear, sharp hook options, so every post demonstrates the make-it-simple skill at the heart of your craft.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a documentation principle",
        description:
          "Structure a carousel around one principle: how to structure docs users actually finish, how to write for the reader's mental model, how to decide what not to document. Walk through the problem, the common mistake, your principle, the steps, and the result. Teaching your craft demonstrates expertise and — because clarity is your product — the carousel's own legibility proves your ability in the very act of explaining.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full principle carousel from your method — and its own clarity demonstrates the skill you're teaching.",
      },
      {
        step_number: 5,
        title: "Make the case for documentation's real value",
        description:
          "Technical writing is chronically undervalued, and being the voice who articulates its worth — reduced support load, faster onboarding, developer adoption, fewer bugs — is a powerful angle. Share content that reframes docs as a product and business asset, not an afterthought. This elevates your field and positions you as a strategic partner rather than a service function, attracting the roles and clients that value the discipline properly.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape docs-as-business-value takes into posts, so your feed elevates an undervalued discipline.",
      },
      {
        step_number: 6,
        title: "Post consistently to build a rare reputation",
        description:
          "Technical writing is a small field where a visible reputation goes a long way — being one of the recognized voices opens roles, freelance work, and speaking. Batch a week of posts in one session so your presence stays steady regardless of documentation deadlines. Because so few technical writers build a public profile, consistency here compounds unusually fast into genuine industry standing.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your reputation compounds steadily in a field where few writers are publicly visible.",
      },
      {
        step_number: 7,
        title: "Let your feed exemplify clarity",
        description:
          "You sell clarity, so your feed must be a model of it — cluttered or confusing visuals would contradict your entire value proposition. A clean, well-structured, consistent visual identity demonstrates the information design sensibility you bring. Lock in your template once so every craft and principle carousel exemplifies the legibility you champion. For a technical writer, a beautifully clear feed is the most fitting proof of your skill.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clean and legible, so your feed exemplifies the clarity you sell.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, technical writers practiced a rare, undervalued craft entirely in private. Your skill at turning engineering complexity into something humans can follow lived in docs sites that nobody credited you for, and documentation deadlines left no time to build a public profile. So the field kept being dismissed as 'writing things down,' and your genuine information-design expertise stayed invisible. Meanwhile the senior roles and freelance work went to the few writers who'd built a reputation, and your ability to make hard things clear — a genuinely scarce skill — went unrecognized.",
    after_carouselabs:
      "With CarouseLabs, your craft finally becomes visible. A documentation challenge becomes a carousel that showcases your information-design skill. Every hook proves you can make complexity graspable. Your principle becomes a carousel whose own clarity demonstrates your ability. Your docs-as-business-value takes elevate an undervalued discipline. Because you batch a week in one session, your reputation compounds unusually fast in a field where almost no writers are publicly visible — turning a scarce, invisible skill into genuine industry standing.",
    time_to_first_post:
      "About 15 minutes from signup — appropriately fast for a professional writer.",
    quick_wins: [
      "Your first craft carousel that makes your information-design skill visible and valued.",
      "A feed whose own clarity proves the exact skill you're hired for.",
      "Your first role or freelance enquiry from finally being one of the few visible voices in your field.",
    ],
  },
  "cto-tech-leaders": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define the technical leadership voice only you have",
        description:
          "As a CTO or tech leader, your content isn't about code — it's about the intersection of technology, teams, and business. Decide the leadership perspective you carry: how you build engineering culture, how you make architecture decisions at scale, how you translate tech to the board. This voice attracts the senior engineers you need to hire and the credibility that matters to investors and peers — both scarce, high-value outcomes for a technical leader.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs helps you develop content around your technical leadership perspective, so your feed carries a leader's voice, not a coder's.",
      },
      {
        step_number: 2,
        title: "Mine your hardest technical and people decisions",
        description:
          "Your best content comes from the decisions only someone in your seat makes — the rewrite you approved or refused, the hire that transformed the team, the technical debt you chose to live with. Keep a note of these and the reasoning. Sharing the real weight of technical leadership builds trust with engineers evaluating you as a leader and demonstrates the judgment that boards and investors want to see in a technical founder or executive.",
        time_required: "5 min a day",
        carouselabs_tip:
          "CarouseLabs turns a hard technical or people decision into a leadership carousel, so the weight of your role becomes trust-building content.",
      },
      {
        step_number: 3,
        title: "Write hooks that take a real technical stand",
        description:
          "Tech leadership hooks work when they take a clear position or admit something honest: 'We chose the boring technology. It was the best decision we made.' or 'I approved a rewrite. It nearly killed us.' Both cut through the cautious, say-nothing content most executives post. Engineers respect leaders with real opinions and real scars, and those are exactly the people you want reading — and eventually joining — your team.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that take a clear technical stand or admit an honest mistake, so your posts sound like a real leader, not a figurehead.",
      },
      {
        step_number: 4,
        title: "Build a carousel around a technical leadership lesson",
        description:
          "Structure a carousel around one hard-won lesson: how you scaled an engineering org, how you decide on build vs buy, how you manage technical debt strategically. Walk through the situation, the decision, the reasoning, the outcome, and the principle. Teaching from real experience — rather than abstract engineering-management theory — makes you a voice engineers actually follow and positions you for board seats, advisory roles, and speaking.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full leadership-lesson carousel from your experience, so your hard-won principle comes wrapped in the story that makes it credible.",
      },
      {
        step_number: 5,
        title: "Champion your engineers and your culture",
        description:
          "Some of your most valuable content isn't about you — it's about your team's wins, your engineering culture in action, the way you support your people. In a market where senior engineering talent is brutally scarce, a CTO who publicly champions their team turns their feed into a recruiting engine. Engineers choose leaders they'd want to work for, and your feed is where they decide whether that's you.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you turn a team win or culture moment into a post, so your feed doubles as a recruiting magnet for scarce engineering talent.",
      },
      {
        step_number: 6,
        title: "Stay visible on a leveraged, delegated system",
        description:
          "Your calendar is brutal — architecture reviews, hiring, board prep, incidents. The answer isn't finding an hour a day; it's a system where 20 focused minutes of your real thinking becomes a week of content. Technical leaders who treat content as leveraged rather than manual stay visible without it competing with running engineering, and that consistency compounds into hiring pipeline and industry influence.",
        time_required: "20 min for a week's raw input",
        carouselabs_tip:
          "CarouseLabs turns your brief raw thinking into a full week of posts, so staying visible costs you 20 minutes, not an hour a day.",
      },
      {
        step_number: 7,
        title: "Present with clean, credible technical polish",
        description:
          "Your feed is read by engineers who judge quality instinctively and by investors who read polish as competence. A clean, consistent, considered visual identity signals the same rigor you bring to your architecture. Lock in your template once so every leadership lesson and technical stand carries that polish automatically, reinforcing the impression of a leader whose standards are as high in public as they are in code review.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clean and consistent, so your feed matches the standards you set for your team.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, technical leadership visibility was something you knew mattered but couldn't fit into a brutal calendar of architecture reviews, hiring, incidents, and board prep. The hard decisions that would have built real trust with engineers — the rewrite you refused, the debt you chose to carry, the culture you built — stayed private. When you posted, it came out cautious and corporate, moving no one. Meanwhile senior engineers chose teams led by CTOs with a visible, opinionated presence, and your hiring pipeline and industry influence suffered for a reputation you never had time to build.",
    after_carouselabs:
      "With CarouseLabs, technical leadership visibility stops competing with running engineering. Twenty focused minutes of your real thinking — a hard decision, a technical stand, a team win worth celebrating — becomes a week of polished posts that sound like you with conviction. Your feed carries a real leader's opinions instead of corporate caution, champions your engineers so it doubles as a recruiting magnet in a brutal talent market, and demonstrates the judgment investors and boards look for. You stay consistently visible without finding an hour a day, and the influence compounds.",
    time_to_first_post:
      "About 20 minutes including onboarding — most tech leaders hand over one hard decision and publish a first carousel the same day.",
    quick_wins: [
      "Your first leadership carousel that takes a real technical stand instead of sounding corporate.",
      "A full week of posts produced from 20 minutes of your raw thinking — visibility without the calendar cost.",
      "Your first inbound from a senior engineer who wants to work for you because of something you wrote.",
    ],
  },
  "cybersecurity-experts": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define your security domain and audience",
        description:
          "Security spans offensive, defensive, GRC, cloud, and application security — and your audience might be practitioners or business decision-makers. Pick your domain and who you're speaking to, then anchor your content there. This clarity matters especially in security, where credibility is everything and generalist claims are treated with suspicion. A focused, demonstrable expertise is what earns respect from a famously skeptical community and attracts serious opportunities.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your security domain, so your feed builds credibility with a famously skeptical audience.",
      },
      {
        step_number: 2,
        title: "Turn real incidents and findings into teaching content",
        description:
          "Your best content comes from real work — the misconfiguration you keep finding, the attack pattern you're seeing, the incident lesson (appropriately sanitized). Keep a note of these with strict care for confidentiality and responsible disclosure. Real, current threat insight is enormously valuable and instantly credible, because security people can tell immediately whether you've actually done the work or are recycling headlines.",
        time_required: "10 min per finding",
        carouselabs_tip:
          "CarouseLabs turns a sanitized finding into a teaching carousel, so your real security work becomes credible content without exposing anything sensitive.",
      },
      {
        step_number: 3,
        title: "Write hooks that cut through security FUD",
        description:
          "Security hooks land when they bring grounded reality to a fear-saturated space: 'That vulnerability everyone's panicking about probably doesn't affect you. Here's how to tell.' The security conversation is drowning in vendor FUD and hype, so a practitioner offering calm, precise assessment stands out immediately. This positions you as a credible signal source rather than another voice amplifying panic for attention or product sales.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that cut through security FUD with grounded assessment, so your posts deliver signal in a fear-saturated space.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a real defensive practice",
        description:
          "Structure a carousel around one practice: how to actually threat-model, how to prioritize vulnerabilities that matter, how to explain risk to executives. Walk through the problem, the common mistake, your approach, the steps, and the outcome. Teaching genuinely useful security practice builds authority with practitioners and demonstrates to business buyers that you can make security tractable rather than terrifying — a rare and valuable combination.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full security-practice carousel from your notes, so your expertise becomes actionable content practitioners actually use.",
      },
      {
        step_number: 5,
        title: "Translate security risk into business language",
        description:
          "The rarest skill in security is explaining risk to non-technical decision-makers without fear-mongering or jargon. Share content that bridges that gap — how to make a business case for security investment, how to communicate risk honestly to a board. This positions you as the security professional who can operate at the executive level, which is exactly the profile that earns CISO roles, consulting engagements, and a seat where decisions are made.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you translate security risk into business language, so your feed proves you can operate at the executive level.",
      },
      {
        step_number: 6,
        title: "Stay consistently visible despite an on-call reality",
        description:
          "Security work is reactive and relentless — incidents don't respect content calendars. Batch a week of posts in one session so your visibility holds through an incident-heavy stretch. Consistent presence compounds into the reputation that opens consulting, speaking, and senior roles in a field where trust is earned slowly and reputation is everything. A system that survives your on-call weeks is what makes that compounding possible.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your visibility holds through incident-heavy stretches and on-call weeks.",
      },
      {
        step_number: 7,
        title: "Present with credible, no-nonsense visuals",
        description:
          "Security audiences distrust flash and marketing gloss, so your visual identity should be clean, professional, and substantive rather than sensational. A consistent, no-nonsense look signals that you're a serious practitioner, not a vendor pushing fear. Lock in your template once so every finding and practice carousel carries the same credible polish — letting the technical substance lead, which is exactly what this audience respects.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clean and no-nonsense, so your feed reads as a serious practitioner, not a vendor.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, cybersecurity experts did critical, high-skill work in near-total silence. Incident response and on-call left no time for content, and the real findings and threat insight you developed — the material that would have proven your credibility — stayed internal. Meanwhile the security conversation got shaped by vendor FUD and headline-chasers, and business leaders formed their understanding of risk from people selling fear rather than practitioners who knew the truth. Your expertise was real and scarce; the loudest, least credible voices owned the conversation.",
    after_carouselabs:
      "With CarouseLabs, your practitioner credibility finally reaches the conversation. A sanitized finding becomes a teaching carousel that proves you've done the work. A grounded hook cuts through FUD and delivers signal in a fear-saturated space. Your approach becomes actionable practice that practitioners use. Your business-language translation proves you can operate at the executive level. Because you batch a week in one session, your visibility holds through incident-heavy stretches — compounding into the reputation that opens CISO roles, consulting, and speaking in a field where trust is everything.",
    time_to_first_post:
      "About 20 minutes including onboarding — most security experts turn one sanitized finding into a first carousel the same day.",
    quick_wins: [
      "Your first teaching carousel that proves you've done the real work, not recycled headlines.",
      "A grounded, FUD-free post that delivers genuine signal to a fear-saturated audience.",
      "Your first consulting or speaking enquiry from finally being a credible visible voice.",
    ],
  },
  "financial-advisors": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Know your compliance boundaries before you write a word",
        description:
          "Financial advice is regulated, so before building any content habit, get clear on what your firm and regulator allow — no performance promises, appropriate disclaimers, records retention, and pre-approval where required. This isn't a blocker; it's the foundation that lets you post confidently for years instead of stopping after one compliance scare. Advisors who understand their guardrails create more freely, because they're never guessing whether a post will cause a problem.",
        time_required: "30 min, once",
        carouselabs_tip:
          "CarouseLabs drafts educational, non-promissory content you can run through your compliance process, so review is a quick check rather than a rewrite.",
      },
      {
        step_number: 2,
        title: "Choose the client you serve and their real worry",
        description:
          "'Financial advisor' means nothing to a prospect. Decide who you serve — pre-retirees, business owners, medical professionals, young families — and the specific financial worry that keeps them up. Anchor your content there. Wealth decisions are deeply personal, so a prospect needs to feel you understand their exact situation. This specificity is what turns you from one of thousands of advisors into the obvious person for a particular kind of client.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your ideal client and their specific worries, so your feed speaks to one person rather than everyone.",
      },
      {
        step_number: 3,
        title: "Write hooks that address money anxiety with calm",
        description:
          "Financial hooks land when they name a real anxiety and offer steadiness: 'Everyone's panicking about the market. Here's what actually matters for your retirement.' Money is emotional, so calm, educational framing beats both fear-mongering and hype. Your prospects have been burned by both, so being the advisor who lowers their heart rate rather than raising it is exactly what builds the trust required before someone hands over their financial life.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates calm, educational hooks that address money anxiety without hype, so your posts build trust instead of triggering alarm.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches one financial concept clearly",
        description:
          "Structure a carousel around one concept: how tax-advantaged accounts actually work, why timing the market fails, what a real retirement number looks like. Walk through the confusion, the common mistake, the clear explanation, and the takeaway. Educational content — free of product pitches — proves your expertise and builds trust. When your free explanation finally makes a concept click for someone, they believe you can guide their whole financial picture.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full educational carousel from your notes, so complex financial concepts become clear content without a writing session.",
      },
      {
        step_number: 5,
        title: "Lead with education, never with product",
        description:
          "The advisors who build real followings give away genuine understanding and let the relationship follow. Resist the urge to pitch; instead consistently help people understand their money better. This educational generosity is both compliance-friendly and enormously effective, because it demonstrates the exact value you provide — clarity and guidance — and attracts prospects who've come to trust you long before any sales conversation.",
        time_required: "ongoing mindset",
        carouselabs_tip:
          "CarouseLabs keeps your content educational rather than promotional, so your feed builds trust and stays inside your compliance guardrails.",
      },
      {
        step_number: 6,
        title: "Stay present through a very long decision window",
        description:
          "People choose a financial advisor slowly — often watching quietly for a year before reaching out, because they're deciding who to trust with their life savings. Batch a week of posts in one session so your calm, educational presence keeps showing up throughout that window. Consistency is what builds the familiarity and trust a decision this personal requires, so you're the advisor they already feel they know when they're finally ready.",
        time_required: "60 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so you stay present through the very long window in which someone chooses who to trust with their money.",
      },
      {
        step_number: 7,
        title: "Look trustworthy and steady, never flashy",
        description:
          "Finance attracts hype and scams, so your visual identity should signal the opposite: calm, professional, steady. A clean, consistent look reassures prospects that you're a fiduciary-minded guide, not a get-rich-quick pitch. Lock in your template once so every educational carousel carries the same reassuring polish. For someone deciding who to trust with their retirement, a considered and calm feed is itself a meaningful trust signal.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel calm and consistent, so your feed reads as a steady fiduciary, not a finance-bro pitch.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, financial advisors knew content would build the trust their business runs on but faced two walls: no time between client meetings, and compliance uncertainty that made every post feel risky. So your feed stayed empty while unregulated finance influencers with terrible advice built huge followings and shaped how people think about money. The clear, calm explanations you gave clients one-on-one — the exact material that would have built trust at scale — never left your office. You competed for clients on referrals alone while the loudest, least qualified voices owned the conversation.",
    after_carouselabs:
      "With CarouseLabs, your calm expertise finally reaches the people who need it. A financial concept becomes a clear educational carousel that makes something finally click. A money anxiety becomes a hook that lowers heart rates instead of raising them. Because the content is educational rather than promissory, compliance review becomes a quick check rather than a rewrite. And because you batch a week in one session, your steady presence holds through the very long window in which someone decides who to trust with their life savings — so you're the advisor they already feel they know when they're finally ready.",
    time_to_first_post:
      "About 20 minutes to draft, plus your firm's compliance review — most advisors publish their first educational carousel within a day or two.",
    quick_wins: [
      "Your first educational carousel that makes a confusing financial concept finally click for someone.",
      "A compliance-friendly content habit that stops feeling risky and starts building trust at scale.",
      "Your first enquiry from a prospect who says your calm explanations are why they trust you with their money.",
    ],
  },
  "wealth-managers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Understand your compliance and privacy guardrails first",
        description:
          "Wealth management is heavily regulated and your clients are private by nature, so establish what you can say before you start. No performance claims, no identifiable client details, appropriate disclaimers, firm pre-approval where needed. Getting this clear upfront lets you build a sustainable content habit rather than one that stalls at the first compliance flag. Advisors who know their boundaries create confidently for years.",
        time_required: "30 min, once",
        carouselabs_tip:
          "CarouseLabs drafts educational, non-promissory content you can run through compliance, so review is a quick check rather than a rewrite.",
      },
      {
        step_number: 2,
        title: "Speak to the specific complexity your clients face",
        description:
          "High-net-worth clients have problems ordinary financial content never addresses — liquidity events, concentrated stock, estate complexity, multi-generational wealth. Choose the complexity you specialize in and anchor your content there. This specificity signals that you operate at their level, which is essential: a wealthy prospect will dismiss generic money advice instantly but will pay attention to someone who clearly understands their actual, unusual situation.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on the specific complexity your clients face, so your feed signals you operate at their level.",
      },
      {
        step_number: 3,
        title: "Write hooks that address sophisticated concerns",
        description:
          "Wealth hooks land when they name a problem only your clients have: 'Your biggest financial risk isn't the market. It's that 70% of your net worth is in one stock.' Speaking to sophisticated, specific concerns immediately separates you from mass-market finance content. Because affluent prospects are used to being marketed to badly, a hook that demonstrates genuine understanding of their complexity earns rare, valuable attention.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks around sophisticated wealth concerns, so your posts reach affluent prospects who dismiss mass-market finance content.",
      },
      {
        step_number: 4,
        title: "Build a carousel that clarifies a complex strategy",
        description:
          "Structure a carousel around one sophisticated topic: how to think about concentrated positions, the mechanics of tax-efficient giving, how to plan around a liquidity event. Walk through the situation, the common mistake, the considerations, and the takeaway. Educational depth on genuinely complex topics demonstrates expertise that generic advisors can't match — and it's exactly what makes a sophisticated prospect think this person actually understands my situation.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full educational carousel from your notes, so complex wealth strategies become clear content without a writing session.",
      },
      {
        step_number: 5,
        title: "Lead with the human side of wealth",
        description:
          "Wealth brings emotional complexity — family dynamics, purpose, legacy, the anxiety that money doesn't solve. Content that acknowledges this human dimension differentiates you profoundly from advisors who only discuss portfolios. It signals that you understand your clients as people navigating something complicated, not just accounts to manage. For a relationship built on deep trust, showing that understanding is what makes a prospect feel genuinely seen.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs mixes the human, emotional side of wealth into your idea feed, so your content shows you understand clients as people, not portfolios.",
      },
      {
        step_number: 6,
        title: "Stay present for an extremely long trust window",
        description:
          "Affluent clients choose a wealth manager over years, not weeks — often watching quietly, gathering impressions, before an inflection point prompts action. Batch a week of posts in one session so your presence stays steady across that long horizon. Consistency is what builds the familiarity and credibility a decision of this magnitude requires, so when their liquidity event or transition arrives, you're the trusted name already in mind.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your presence stays steady across the years-long window in which affluent clients choose an advisor.",
      },
      {
        step_number: 7,
        title: "Present with understated, premium polish",
        description:
          "Your audience operates in a world of quiet quality, so your visual identity should be refined and understated rather than flashy — anything loud reads as a mismatch for wealth. A consistent, elegant look signals discretion and seriousness. Lock in your template once so every educational carousel carries the same understated polish. For a wealth manager, a feed that looks quietly excellent aligns with exactly what affluent clients value.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel understated and refined, so your feed matches the quiet quality affluent clients value.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, wealth managers relied almost entirely on referrals because content felt both impossible and risky. Client meetings consumed your time, compliance made every post feel fraught, and the sophisticated understanding you brought to complex situations never became visible. So affluent prospects — people who research carefully before trusting anyone with generational wealth — found nothing when they looked you up. Meanwhile mass-market finance content shaped the conversation, and your genuine expertise in the complexity your clients actually face stayed entirely private.",
    after_carouselabs:
      "With CarouseLabs, your sophisticated expertise finally becomes visible. A complex strategy becomes a clear educational carousel that proves you operate at your clients' level. A hook naming a sophisticated concern reaches prospects who dismiss generic finance content. Your content about the human side of wealth shows you see clients as people, not portfolios. Because the content is educational, compliance review is a quick check — and because you batch a week in one session, your presence stays steady across the years-long window in which affluent clients decide who to trust.",
    time_to_first_post:
      "About 20 minutes to draft, plus your firm's compliance review — most wealth managers publish their first carousel within a day or two.",
    quick_wins: [
      "Your first carousel on a genuinely complex topic that proves you operate at your clients' level.",
      "A compliance-friendly content habit that finally makes your expertise visible to researching prospects.",
      "Your first enquiry from an affluent prospect who says your content showed you understand their actual situation.",
    ],
  },
  "accountants": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Pick the client type whose numbers you understand best",
        description:
          "'Accountant' is a commodity term, so specialize: freelancers, ecommerce sellers, property investors, agencies, medical practices. Choose the client whose financial reality you know cold and anchor your content there. Business owners want an accountant who understands their specific industry's quirks, not a generalist. This specificity is what turns you from an interchangeable compliance provider into the obvious choice for a particular kind of business.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your client specialty, so your feed speaks to one industry's real financial reality.",
      },
      {
        step_number: 2,
        title: "Turn the questions clients ask into public answers",
        description:
          "Every client meeting surfaces the same questions — what can I claim, how should I structure this, why is my tax bill this size. Those private questions are your public content pipeline, because if one client asks, hundreds of business owners are wondering the same thing. Keep a note of every question you get. This is the content that makes strangers feel you've already advised them before they ever book a call.",
        time_required: "5 min a day",
        carouselabs_tip:
          "CarouseLabs turns a common client question into a clear answer carousel, so the advice you give privately reaches hundreds publicly.",
      },
      {
        step_number: 3,
        title: "Write hooks that reveal costly mistakes",
        description:
          "Accounting hooks land when they name money the reader is losing: 'The expense category most freelancers forget — and it's costing them thousands.' Business owners fear both overpaying tax and getting it wrong, so a hook that promises to fix a specific, costly mistake grabs attention immediately. Avoid dry compliance framing; lead with the money at stake, because that's what makes a busy owner stop scrolling and read.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks around costly financial mistakes, so your posts lead with money at stake rather than dry compliance language.",
      },
      {
        step_number: 4,
        title: "Build a carousel that makes one rule genuinely clear",
        description:
          "Structure a carousel around one concept: how to structure your business for tax, what records actually matter, how to read your own P&L. Walk through the confusion, the common mistake, the clear explanation, and the action to take. Making tax and accounting genuinely understandable is rare and valuable — when your free explanation finally makes something click for an anxious owner, they trust you with their whole financial picture.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full explainer carousel from your notes, so tax and accounting concepts become clear content without a writing session.",
      },
      {
        step_number: 5,
        title: "Be the calm, human voice in a stressful subject",
        description:
          "Accounting triggers anxiety and shame — people avoid their numbers because they feel behind or confused. Content that meets that with calm and zero judgment differentiates you enormously from the profession's stereotype. Share reassuring, human content that makes finance feel manageable. Being the accountant who lowers a business owner's stress rather than adding to it is exactly what makes them want to work with you.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs drafts calm, human, judgment-free content, so your feed makes an anxious business owner feel helped rather than intimidated.",
      },
      {
        step_number: 6,
        title: "Stay visible outside of tax season",
        description:
          "Accountants tend to vanish during busy season and reappear after — right when business owners are forming opinions about who to hire. Batch a week of posts in one session so your presence holds through your busiest periods. Consistency keeps you top of mind for the moment an owner outgrows their current accountant or panics about a deadline, which is when the decision to switch actually happens.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your feed keeps working through tax season instead of going dark when you're busiest.",
      },
      {
        step_number: 7,
        title: "Look modern and approachable, not stuffy",
        description:
          "The profession's reputation is dry and intimidating, so a clean, warm, modern visual identity sets you apart immediately. A consistent, approachable look signals that you're a human advisor rather than a stuffy compliance machine. Lock in your template once so every explainer and answer carousel carries the same friendly professionalism — which quietly tells anxious business owners that working with you won't feel like being told off.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clean and approachable, so your feed feels human rather than stuffy.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, accountants competed on price and proximity because nothing else distinguished them. The clear, calm answers you gave clients every day — the exact material that would have built trust with hundreds of business owners — stayed in private meetings, and busy season left no time to write anyway. So your feed stayed empty while your profession's stuffy stereotype went unchallenged, and business owners chose accountants essentially at random. Your genuine expertise at making finance understandable, one of the most valuable things you offer, was completely invisible.",
    after_carouselabs:
      "With CarouseLabs, the advice you give privately finally reaches hundreds. A common client question becomes a clear answer carousel. A costly mistake becomes a hook that leads with money at stake. A confusing rule becomes an explainer that finally makes something click. Your calm, judgment-free voice sets you apart from the profession's stereotype. Because you batch a week in one session, your feed keeps working through tax season instead of going dark when you're busiest — so you're top of mind at the exact moment an owner decides to switch accountants.",
    time_to_first_post:
      "About 20 minutes including onboarding — most accountants turn a common client question into a first carousel the same day.",
    quick_wins: [
      "Your first answer carousel that takes advice you give privately and puts it in front of hundreds.",
      "A feed that keeps running through tax season instead of going dark when you're busiest.",
      "Your first enquiry from a business owner who says you're the first accountant who made it make sense.",
    ],
  },
  "tax-consultants": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Own a specific tax situation people struggle with",
        description:
          "Tax is vast and terrifying, so specialize: expat tax, crypto, property investors, business structuring, R&D credits. Choose the situation you know deeply and anchor your content there. People with a specific tax problem search desperately for a specialist who understands it, so a clear focus makes you findable and credible. In a field where mistakes are expensive, demonstrated depth in one area beats broad generalist claims every time.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your tax specialty, so your feed reaches the people desperately searching for exactly your expertise.",
      },
      {
        step_number: 2,
        title: "Turn common client confusions into public clarity",
        description:
          "Your clients repeatedly misunderstand the same things, and each misunderstanding is a post that could help thousands. Keep a note of the confusions you correct — the deduction people get wrong, the deadline they miss, the structure that costs them. Because tax anxiety is universal and information is scarce and confusing, clear public answers are enormously valuable and position you as the specialist who makes an intimidating subject tractable.",
        time_required: "5 min a day",
        carouselabs_tip:
          "CarouseLabs turns a common client confusion into a clarity carousel, so the corrections you make privately help thousands publicly.",
      },
      {
        step_number: 3,
        title: "Write hooks about money at stake and deadlines looming",
        description:
          "Tax hooks land when they name a specific financial consequence: 'The tax rule that catches out 80% of property investors — and costs them £4,000.' Leading with the money at stake or a deadline creates urgency that dry compliance language never will. Because tax mistakes are expensive and people know it, a hook promising to prevent a costly error grabs immediate attention from exactly the people who need your help.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks around costly tax mistakes and deadlines, so your posts create urgency instead of reading as dry compliance.",
      },
      {
        step_number: 4,
        title: "Build a carousel that demystifies one tax rule",
        description:
          "Structure a carousel around one rule: how a relief actually works, what triggers a particular liability, how to structure something correctly. Walk through the confusion, the common mistake, the clear explanation, and the action. Making a genuinely intimidating tax rule understandable is rare and valuable — when your free explanation prevents someone from a costly error, you've earned enormous trust and a very likely future client.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full explainer carousel from your notes, so intimidating tax rules become clear content without a writing session.",
      },
      {
        step_number: 5,
        title: "Cut through misinformation with authority",
        description:
          "Tax misinformation is rampant — bad advice on forums, confident nonsense on social media, myths that cost people thousands. Being the specialist who corrects these with clear authority is a powerful angle. Share content debunking common tax myths in your area. This positions you as the credible signal amid dangerous noise and attracts people who realize they need a real expert rather than internet advice.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape myth-correcting tax content into posts, so your feed becomes credible signal amid dangerous misinformation.",
      },
      {
        step_number: 6,
        title: "Stay visible year-round, not just at deadline",
        description:
          "Tax attention spikes around deadlines, but the clients worth having plan ahead — and they're forming opinions about who to trust all year. Batch a week of posts in one session so your presence holds through your busiest filing periods. Consistency means you're the specialist people remember when their situation gets complicated, rather than someone they scramble to find in a panic at the last minute.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your feed keeps working through filing season instead of going dark when you're busiest.",
      },
      {
        step_number: 7,
        title: "Look authoritative and clear, never intimidating",
        description:
          "Tax already feels intimidating, so your visual identity should be clean, clear, and approachable while still authoritative. A consistent, professional-but-warm look reassures anxious readers that you'll make this manageable. Lock in your template once so every explainer and myth-busting carousel carries the same clarity. For a subject people avoid out of fear, a feed that feels calm and legible is itself a reason to engage with you.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clear and approachable, so your feed makes an intimidating subject feel manageable.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, tax consultants watched misinformation cost people thousands while having no time or bandwidth to correct it. The clarity you provided clients privately never reached the many people making expensive mistakes based on forum advice and confident social media nonsense. Filing season consumed you entirely, so your feed went dark exactly when tax was on everyone's mind. Meanwhile people with the specific problems you specialize in couldn't find you, and your genuine, valuable expertise stayed locked in client meetings while bad advice shaped the public conversation.",
    after_carouselabs:
      "With CarouseLabs, your clarity finally reaches the people making expensive mistakes. A common confusion becomes a carousel that helps thousands. A hook about money at stake creates urgency where dry compliance language never could. An intimidating rule becomes an explainer that prevents a costly error. Your myth-correcting content becomes credible signal amid dangerous noise. Because you batch a week in one session, your feed keeps working through filing season — so people with exactly your specialty can finally find you.",
    time_to_first_post:
      "About 20 minutes including onboarding — most tax consultants turn one common client confusion into a first carousel the same day.",
    quick_wins: [
      "Your first clarity carousel that takes a correction you make privately and helps thousands publicly.",
      "A myth-busting post that becomes credible signal amid the misinformation costing people thousands.",
      "Your first enquiry from someone with exactly your specialty who finally found a specialist who gets it.",
    ],
  },
  "investment-advisors": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Establish your compliance guardrails before you post",
        description:
          "Investment advice is tightly regulated, so get clear on what you can and cannot say — no performance promises or predictions, proper disclaimers, firm review where required. Establishing this upfront lets you build a content habit that lasts rather than one that stalls at the first compliance flag. Advisors who know their boundaries create confidently, because they're never wondering whether a post will trigger a problem.",
        time_required: "30 min, once",
        carouselabs_tip:
          "CarouseLabs drafts educational, non-promissory content you can run through compliance, so review is a quick check rather than a rewrite.",
      },
      {
        step_number: 2,
        title: "Define the investor you serve and their real question",
        description:
          "Decide who you advise — first-time investors, business owners with liquidity, pre-retirees, inheritors — and the specific question they're wrestling with. Anchor your content there. Investment decisions are personal and anxiety-laden, so prospects need to feel you understand their exact situation and risk reality. This specificity separates you from generic market commentary and makes the right investor feel you're speaking directly to them.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your specific investor and their real questions, so your feed speaks to one person, not the market.",
      },
      {
        step_number: 3,
        title: "Write hooks that bring calm to market noise",
        description:
          "Investment hooks land when they counter panic with perspective: 'The market dropped 8% this week. Here's why your plan probably shouldn't change.' Financial media manufactures constant alarm, so an advisor offering steady, educational perspective stands out enormously. Being the calm voice when everyone else is shouting is precisely what builds the trust required before someone lets you guide their investments.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates calm, perspective-giving hooks, so your posts counter market panic instead of amplifying it.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches an investing principle",
        description:
          "Structure a carousel around one principle: why diversification actually works, how fees compound against you, why timing the market fails. Walk through the misconception, the evidence, the principle, and the practical takeaway. Educational content free of predictions is both compliance-friendly and deeply valuable, because it gives investors the understanding that financial media never provides — and that understanding builds lasting trust in you.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full educational carousel from your notes, so investing principles become clear content without predictions or promises.",
      },
      {
        step_number: 5,
        title: "Address investor psychology, not just markets",
        description:
          "Investing outcomes are driven more by behavior than by picks — panic selling, chasing returns, letting fear override the plan. Content about investor psychology differentiates you from the endless market commentary and speaks to the real reason people underperform. Being the advisor who understands the emotional side of money proves you'll actually help clients stay the course, which is where your genuine value lies.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs mixes investor-psychology angles into your idea feed, so your content addresses behavior — the real driver of returns.",
      },
      {
        step_number: 6,
        title: "Stay present through a long, cautious decision",
        description:
          "People choose an investment advisor slowly and cautiously, often watching for a year before reaching out because they're deciding who to trust with their savings. Batch a week of posts in one session so your calm, educational presence keeps showing up throughout that window. Consistency builds the familiarity and trust this decision requires, so you're the advisor they already feel they know when they're finally ready to act.",
        time_required: "60 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your steady presence holds through the long window in which someone decides on an advisor.",
      },
      {
        step_number: 7,
        title: "Signal steadiness with calm, credible visuals",
        description:
          "Investing content is full of hype, charts screaming green, and get-rich energy — so a calm, clean, professional visual identity immediately signals that you're different. A consistent, steady look reassures prospects that you're a disciplined fiduciary rather than a speculator. Lock in your template once so every educational carousel carries the same reassuring polish, which for someone choosing who to trust with their savings is a genuine signal.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel calm and consistent, so your feed signals disciplined steadiness, not speculation.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, investment advisors watched unregulated influencers with terrible advice build enormous followings while their own compliance-bound expertise stayed invisible. Client meetings left no time to write, and compliance uncertainty made every post feel risky. So the calm, evidence-based perspective you gave clients — the exact antidote to the panic financial media manufactures — never reached the public. Prospects researching you found nothing, and people made investing decisions based on hype from people with no fiduciary duty and no accountability for the damage.",
    after_carouselabs:
      "With CarouseLabs, your calm expertise finally counters the noise. An investing principle becomes an educational carousel free of predictions or promises. Market panic becomes a hook that offers perspective instead of amplifying alarm. Your investor-psychology content addresses the real driver of returns. Because the content is educational, compliance review is a quick check rather than a rewrite — and because you batch a week in one session, your steady presence holds through the long window in which someone decides who to trust with their savings.",
    time_to_first_post:
      "About 20 minutes to draft, plus your firm's compliance review — most advisors publish their first educational carousel within a day or two.",
    quick_wins: [
      "Your first educational carousel that gives investors the understanding financial media never provides.",
      "A compliance-friendly content habit that stops feeling risky and starts building trust at scale.",
      "Your first enquiry from an investor who says your calm perspective is why they want you guiding them.",
    ],
  },
  "personal-trainers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Decide who you train and what they actually want",
        description:
          "'Personal trainer' is a commodity, so specialize: desk-bound professionals with back pain, new mums, over-50s building strength, athletes returning from injury. Choose your person and the outcome they truly want — which is rarely 'a workout' and usually energy, confidence, or freedom from pain. Anchoring your content to a specific person and outcome makes you the obvious trainer for them rather than one of thousands competing on hourly rate.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your specific client and the outcome they want, so your feed speaks to one person, not everyone.",
      },
      {
        step_number: 2,
        title: "Turn client sessions into teaching content",
        description:
          "Every session surfaces teachable moments — the form correction that fixed someone's knee pain, the exercise swap that made training sustainable, the question everyone asks. Keep a note of these as they happen. This 'work-as-content' habit means you never need a separate creative session, and the material is real and specific rather than generic fitness advice, which is exactly what makes it credible and useful.",
        time_required: "5 min a day",
        carouselabs_tip:
          "CarouseLabs turns a note from a real session into a teaching post, so your daily coaching becomes content without a separate writing block.",
      },
      {
        step_number: 3,
        title: "Write hooks about the outcome, not the exercise",
        description:
          "Fitness hooks fail when they lead with exercises and win when they lead with life: 'The 10-minute fix for the back pain your desk job is causing.' Your clients don't want workouts, they want to feel better, so hooks naming their real-life problem stop the scroll. This also filters correctly — it attracts people who want a solution to a problem, not fitness enthusiasts looking for free workout content.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates outcome-led hooks that name your client's real-life problem, so your posts attract buyers rather than free-content collectors.",
      },
      {
        step_number: 4,
        title: "Build a carousel that gives one genuinely useful fix",
        description:
          "Structure a carousel around one problem you solve: how to fix desk posture, how to train around a bad knee, how to build a habit that survives a busy week. Walk through the problem, the common mistake, your approach, the steps, and the outcome. Giving away a real fix builds trust fast, because when your free advice actually reduces someone's pain or makes training click, they believe your paid coaching will change things.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full fix-it carousel from your method, so your free advice delivers a real result rather than generic fitness tips.",
      },
      {
        step_number: 5,
        title: "Lead with empathy, never with shame",
        description:
          "'No excuses' culture repels the exact people who need a trainer most — those who've failed before and feel bad about it. Content that reframes their struggle as a plan problem rather than a character flaw is magnetic. Being the trainer who makes fitness feel achievable rather than punishing is what makes a nervous, previously-failed client finally reach out. Empathy converts far better than intensity.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs drafts empathetic, shame-free content that reframes failure as a plan problem, which converts far better than 'no excuses' energy.",
      },
      {
        step_number: 6,
        title: "Batch content around your split-shift schedule",
        description:
          "Your day is fragmented — early mornings, evening clients, gaps in between — which makes consistent posting almost impossible without a system. Batch a week of posts in one session so your feed keeps running regardless of your split shifts. Consistency keeps you visible to the people slowly building up the courage to hire a trainer, so you're the familiar, friendly face they finally message.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your feed stays consistent despite the fragmented reality of a trainer's schedule.",
      },
      {
        step_number: 7,
        title: "Look approachable and professional, not intimidating",
        description:
          "Gym aesthetics intimidate the people who most need you. A clean, warm, approachable visual identity signals that you're a supportive coach rather than someone who'll make them feel judged. Lock in your template once so every fix-it and teaching carousel carries the same friendly professionalism — which quietly tells a nervous beginner that training with you won't be the punishing experience they're dreading.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel warm and consistent, so your feed feels welcoming to the nervous beginners you want.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, personal trainers competed on hourly rate and gym proximity because nothing else set them apart. Your split-shift schedule — early mornings, evening clients, fragmented gaps — made consistent content impossible, so your feed sat empty or filled with the same workout clips everyone else posted. The genuinely useful fixes you delivered in sessions stayed private, and the nervous, previously-failed people who needed your empathetic approach couldn't find you beneath the intimidating 'no excuses' content that made them feel worse.",
    after_carouselabs:
      "With CarouseLabs, the real coaching you do every day finally reaches people. A form fix from a session becomes a teaching post. An outcome-led hook names the back pain their desk job causes, attracting buyers rather than free-content collectors. Your method becomes a carousel that delivers a genuine fix. Your empathetic, shame-free voice reaches the people 'no excuses' content drives away. Because you batch a week in one session, your feed stays consistent despite split shifts — so you're the friendly, familiar face a nervous beginner finally messages.",
    time_to_first_post:
      "About 20 minutes including onboarding — most trainers turn a real session moment into a first carousel the same day.",
    quick_wins: [
      "Your first outcome-led carousel that attracts someone with a real problem, not another free-workout collector.",
      "A consistent feed built around your split shifts instead of destroyed by them.",
      "Your first enquiry from a nervous beginner who says your content was the first that didn't intimidate them.",
    ],
  },
  "fitness-coaches": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Get written permission and lead with the behavior, not the body",
        description:
          "Your best content is your clients' real journeys — but only with explicit written permission to share their story, and ideally their photos. Once you have it, resist the urge to open with the before-and-after image. Lead with the behavior change that got them there: the sleep habit, the Sunday meal prep, the mindset shift after a plateau. Transformation photos attract other coaches and window-shoppers; behavior stories attract the stuck professional who needs to believe change is a repeatable process, not genetics.",
        time_required: "10 min per client story",
        carouselabs_tip:
          "CarouseLabs turns a few bullet points about a client's habit change into a full story-driven carousel, so you spend your time coaching, not writing.",
      },
      {
        step_number: 2,
        title: "Write to the professional who keeps quitting generic plans",
        description:
          "On LinkedIn your ideal client isn't a fitness enthusiast — it's a time-poor, well-paid professional who has abandoned five gym plans and blames their own willpower. Every post should speak to that specific person. Before you write, picture one real client who fits that description and write as if you're texting them. This focus is what separates coaches who book premium clients from those who collect likes from other trainers.",
        time_required: "5 min of framing before each post",
        carouselabs_tip:
          "Tell CarouseLabs your ideal client is a busy professional and it drafts hooks around adherence and real-life constraints instead of gym-bro motivation.",
      },
      {
        step_number: 3,
        title: "Bust one fitness myth a week with the actual science",
        description:
          "The feed is drowning in detoxes, fasted-cardio dogma, and 'soreness equals progress.' Picking one myth per week and calmly debunking it with the evidence is the fastest way to become the credible voice above the influencer noise. Structure it simply: state the myth, explain why it's sticky, show what the research actually says, then give the practical takeaway. You're not dunking on anyone — you're giving a stressed reader permission to stop doing the thing that never worked.",
        time_required: "15 min",
        carouselabs_tip:
          "CarouseLabs generates evidence-based angles and turns nuanced science into a simple, trustworthy carousel, so myth-busting doesn't require an evening of research.",
      },
      {
        step_number: 4,
        title: "Reframe failure as a coaching problem, never a willpower problem",
        description:
          "'No excuses' captions shame the reader and age badly. The content that converts does the opposite: it takes the blame off the client and puts it on the plan. When you write about someone quitting, explain the systems reason they quit — a plan built on unsustainable extremes that collapsed the first busy week — and then show the minimum-viable version that survives real life. This empathy is the entire sales pitch for coaching: you're the person who finally makes it not their fault.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs drafts empathetic, systems-based captions that reframe failure as a fixable coaching problem, which converts far better than guilt.",
      },
      {
        step_number: 5,
        title: "Build a carousel around the outcome, not the workout",
        description:
          "Clients don't buy exercises — they buy energy, confidence, and longevity. Structure your carousel to connect the boring habit to the life change: Slide 1 a hook about the outcome, Slide 2 the problem your reader recognizes, Slide 3 the myth or trap, Slide 4 your method, Slide 5 the sustainable habit, Slide 6 a client's real result, Slide 7 an invitation to comment. Leading with the outcome is what makes a busy professional stop scrolling — they don't care about your program, they care about how they'll feel.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs turns your method into outcome-led hooks and builds the full carousel, connecting each exercise to the life change your prospect is actually buying.",
      },
      {
        step_number: 6,
        title: "Batch a week of content on your lightest coaching day",
        description:
          "The single biggest reason coaches stall is that content is the first thing to slip when coaching gets busy — and every silence resets the algorithm's memory of you. Fix this structurally: pick your lightest coaching day, block 90 minutes, and produce an entire week of carousels and captions at once. When you batch, you're in a creative headspace instead of squeezing a post between check-ins, and the quality is visibly higher. Schedule them out and forget about it.",
        time_required: "90 min for a full week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week of carousels and captions in one sitting, so your feed stays alive even during your busiest coaching blocks.",
      },
      {
        step_number: 7,
        title: "Model the sustainable relationship you're selling",
        description:
          "Document your own training honestly — including rest days, off weeks, and the sessions you skipped because life happened. Coaches who only post peak performance quietly sell an image no client can sustain. When you show the boring, consistent, imperfect version of fitness, you become believable, and believability is what turns a follower into a discovery call. Aim for one 'behind the scenes' post a week alongside your client stories and myth-busts.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs keeps a consistent mix of client stories, education, and behind-the-scenes angles in your idea feed, so your content stays varied without you planning a calendar.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, content was the plate a fitness coach always dropped. Your days were full of programming, check-ins, and coaching calls, and by the time you sat down to post, you were fried. You'd default to what was fast — a workout clip, another transformation photo, a 'no excuses' caption — which pulled in other coaches and tire-kickers but rarely a paying client. During busy blocks you'd go silent for two or three weeks, and every time you came back the algorithm had forgotten you and growth reset to zero. You knew your real edge was the coaching philosophy in your head — the adherence stuff, the plateau psychology — but turning that into consistent, well-written posts felt like a second full-time job you never had the energy for.",
    after_carouselabs:
      "With CarouseLabs, your coaching philosophy finally makes it onto the feed. A client's habit change becomes a story-driven carousel from a few bullet points. A fitness myth becomes an evidence-based post without an evening of research. On your lightest coaching day you batch an entire week — client stories, myth-busts, behind-the-scenes — in 90 minutes, then schedule it and get back to coaching. The captions come out empathetic and systems-based instead of shaming, so they speak to the stressed professional who keeps quitting generic plans. The silences end, the algorithm remembers you, and your feed finally reflects the credible, sustainable coach you actually are — which is exactly the person your ideal client is ready to pay.",
    time_to_first_post:
      "Around 20 minutes including onboarding — most coaches publish a client-story carousel the same afternoon they sign up.",
    quick_wins: [
      "Your first behavior-led client story carousel (with permission) that attracts a paying professional instead of another coach.",
      "A full week of content batched on one light coaching day, ending the two-week silences that keep resetting your reach.",
      "Your first discovery-call booking from someone who says a myth-busting post finally made fitness make sense to them.",
    ],
  },
  "nutritionists": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Pick the nutrition confusion you'll clear up",
        description:
          "Nutrition is drowning in contradictory noise, so specialize: gut health, sports nutrition, eating for energy, nutrition for a specific condition, food relationship. Choose your area and anchor your content there. People with a specific nutrition concern are desperate for a credible specialist, not another generalist telling them to eat more vegetables. This focus makes you findable and instantly more trustworthy than the influencer crowd covering everything.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your nutrition specialty, so your feed reaches people searching for exactly your expertise.",
      },
      {
        step_number: 2,
        title: "Turn the science you know into simple, usable answers",
        description:
          "You hold genuine evidence-based knowledge in a field where confident nonsense dominates. Keep a note of the questions clients ask and the misconceptions you correct. Translating nutrition science into simple, practical answers is your highest-leverage content, because it's exactly what the confused, misinformed public needs and exactly what unqualified influencers can't credibly provide. Your credentials become an advantage only when the science becomes accessible.",
        time_required: "10 min per question",
        carouselabs_tip:
          "CarouseLabs turns nuanced nutrition science into a simple, trustworthy carousel, so your evidence-based knowledge finally becomes accessible.",
      },
      {
        step_number: 3,
        title: "Write hooks that debunk without shaming",
        description:
          "Nutrition hooks land when they free the reader from a myth: 'You don't need to detox. Your liver has been doing it this whole time.' Debunking with warmth rather than condescension is key — your audience has been misled, not stupid, and shaming them repels the people you want to help. A hook that offers relief from a rule they've been guiltily failing at is magnetic to anyone exhausted by food confusion.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates warm, myth-busting hooks that free readers from bad rules without shaming them for having believed them.",
      },
      {
        step_number: 4,
        title: "Build a carousel that makes the evidence usable",
        description:
          "Structure a carousel around one evidence-based topic: what actually affects energy levels, how protein needs really work, why restrictive diets backfire. Walk through the myth, why it's sticky, what the research shows, and the practical takeaway. Making genuine nutrition science both accessible and actionable is rare — when your free, evidence-based advice actually helps someone feel better, they trust you far more than the influencer who promised a miracle.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full evidence-based carousel from your notes, so nutrition science becomes clear and usable without an evening of writing.",
      },
      {
        step_number: 5,
        title: "Champion food peace over food rules",
        description:
          "Diet culture has left people anxious and guilty about eating, so content that promotes a calmer, sustainable relationship with food differentiates you profoundly. Share content that rejects restriction and moralizing about food. Being the nutritionist who reduces someone's food anxiety rather than adding another rule is exactly what attracts clients exhausted by cycles of restriction and guilt — and it's what genuinely helps.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs mixes food-peace and anti-diet-culture angles into your idea feed, so your content reduces anxiety instead of adding rules.",
      },
      {
        step_number: 6,
        title: "Stay visible against a very loud influencer feed",
        description:
          "You're competing with supplement sellers and fad-diet influencers who post constantly, so sporadic presence means invisibility. Batch a week of posts in one session so your credible voice keeps showing up. Consistency is how evidence-based nutrition can actually compete with hype — the qualified voice that shows up reliably eventually becomes the one people trust when they're tired of being burned by miracle claims.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your evidence-based voice can actually compete with a constantly-posting influencer feed.",
      },
      {
        step_number: 7,
        title: "Look credible and calm, not like a supplement ad",
        description:
          "Nutrition content is visually dominated by dramatic transformation shots and supplement marketing, so a clean, calm, professional identity immediately signals credibility. A consistent, non-hype look reassures readers you're a qualified professional rather than someone selling a powder. Lock in your template once so every evidence-based carousel carries the same trustworthy polish — a real signal in a space full of visual noise and false promises.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel calm and credible, so your feed reads as a qualified professional, not a supplement ad.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, nutritionists watched unqualified influencers with confident nonsense build huge followings while their genuine, evidence-based expertise stayed invisible. Client sessions left no time to create content, and turning nuanced science into simple posts felt genuinely hard — nuance never competes well with a miracle claim. So the confused, misled public kept following fad diets and supplement sellers, and your credentials, which should have been an advantage, meant nothing because nobody could find or understand you.",
    after_carouselabs:
      "With CarouseLabs, your evidence-based knowledge finally becomes accessible. Nutrition science becomes a simple, trustworthy carousel. A myth becomes a warm hook that frees readers without shaming them. Your food-peace message reduces anxiety instead of adding rules. Because you batch a week in one session, your credible voice can actually compete with a constantly-posting influencer feed — and your calm, professional look signals qualification in a space full of supplement ads. The people exhausted by miracle claims finally find the qualified voice they needed.",
    time_to_first_post:
      "About 20 minutes including onboarding — most nutritionists turn one client question into a first evidence-based carousel the same day.",
    quick_wins: [
      "Your first evidence-based carousel that makes real nutrition science simple and usable.",
      "A myth-busting post that frees someone from a rule they'd been guiltily failing at.",
      "Your first client enquiry from someone who says you're the first nutrition voice that felt trustworthy.",
    ],
  },
  "yoga-instructors": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define your yoga philosophy and who it's for",
        description:
          "Yoga is crowded with aesthetic content, so define what you actually offer — accessible yoga for stiff beginners, yoga for stress and burnout, strength-focused practice, yoga for a specific body reality. Anchor your content there. Most yoga content intimidates the people who'd benefit most, so a clear, welcoming focus makes you the teacher for those the aesthetic crowd excludes — a large, underserved, and grateful audience.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your yoga philosophy and audience, so your feed welcomes the people aesthetic yoga content excludes.",
      },
      {
        step_number: 2,
        title: "Turn class insights into teaching content",
        description:
          "Every class surfaces teachable moments — the modification that unlocked a pose, the breath cue that changed someone's practice, the misconception about flexibility. Keep a note of these. This real teaching material is far more valuable than another advanced-pose photo, because it helps the person struggling rather than impressing the person already practicing. Genuine teaching is what builds a following that actually books your classes.",
        time_required: "5 min a day",
        carouselabs_tip:
          "CarouseLabs turns a real class insight into a teaching carousel, so your actual teaching — not just poses — becomes your content.",
      },
      {
        step_number: 3,
        title: "Write hooks that welcome the intimidated",
        description:
          "Yoga hooks land when they lower the barrier: 'You don't need to touch your toes to start yoga. That's like needing to be fit to go to the gym.' Naming the intimidation and dissolving it speaks directly to the huge audience who believes yoga isn't for them. Because most yoga content unintentionally reinforces that exclusion, being the welcoming voice is both differentiating and genuinely valuable to people who need the practice most.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates welcoming, barrier-lowering hooks, so your posts reach the huge audience who thinks yoga isn't for them.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches something practical",
        description:
          "Structure a carousel around one useful thing: how to modify a pose for tight hips, a 5-minute practice for desk workers, how to breathe through stress. Walk through the problem, the common mistake, your guidance, the steps, and the benefit. Giving away a genuinely practical practice builds trust — when your free guidance actually eases someone's back pain or stress, they want to be in your class or program.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full practical carousel from your teaching, so your guidance delivers a real benefit rather than another pose photo.",
      },
      {
        step_number: 5,
        title: "Share the philosophy beneath the postures",
        description:
          "Yoga is far more than exercise, and sharing the deeper practice — breath, presence, the mental shifts — differentiates you from the fitness-yoga crowd. Share content about what the practice actually offers beyond flexibility. This attracts students seeking genuine depth rather than a workout, which are typically the committed, long-term students and the ones who join teacher trainings and retreats — your most valuable relationships.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs mixes philosophy and depth angles into your idea feed, so your content attracts students seeking real practice, not just a workout.",
      },
      {
        step_number: 6,
        title: "Stay consistent around a fragmented teaching schedule",
        description:
          "Teaching multiple classes across studios leaves fragmented energy and time, so content easily disappears. Batch a week of posts in one session so your presence holds regardless of your teaching load. Consistency keeps you visible to the people slowly gathering courage to try yoga, so you're the welcoming, familiar teacher they finally book — rather than someone they never discovered.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your feed stays consistent despite a fragmented teaching schedule.",
      },
      {
        step_number: 7,
        title: "Create a calm, inclusive visual presence",
        description:
          "Yoga's visual culture is often aspirational to the point of exclusion. A calm, warm, inclusive visual identity signals that your space is genuinely for everyone. Lock in your template once so every teaching carousel carries the same welcoming feel — which quietly tells a stiff, nervous beginner that they'd be comfortable in your class, and that's exactly the student who most needs what you offer.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel calm and welcoming, so your feed signals your space is genuinely for everyone.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, yoga instructors competed in a feed dominated by advanced poses and aesthetic perfection — content that quietly told the stiff, stressed, nervous people who'd benefit most that yoga wasn't for them. Teaching across studios left fragmented time, so your own presence was sporadic, and the genuine teaching insight from your classes never became content. Your welcoming philosophy and real depth stayed invisible while the aesthetic crowd shaped what people believed yoga was.",
    after_carouselabs:
      "With CarouseLabs, your actual teaching becomes your content. A class insight becomes a carousel that helps someone struggling. A welcoming hook reaches the huge audience who thinks yoga isn't for them. Your guidance becomes a practical carousel that eases real pain or stress. Your philosophy content attracts students seeking genuine depth. Because you batch a week in one session, your presence holds despite a fragmented teaching schedule — and your calm, inclusive feed tells nervous beginners they'd be welcome exactly as they are.",
    time_to_first_post:
      "About 20 minutes including onboarding — most instructors turn a real class insight into a first carousel the same day.",
    quick_wins: [
      "Your first teaching carousel that helps a struggling beginner instead of impressing existing practitioners.",
      "A welcoming post that reaches people who'd written off yoga as not for them.",
      "Your first new student who says your content was the first yoga content that didn't intimidate them.",
    ],
  },
  "meditation-coaches": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define who you help and what they're struggling with",
        description:
          "Meditation coaching serves distinct needs — stressed professionals, anxious minds, people who've 'failed' at meditation, sleep struggles. Choose your focus and anchor your content there. Meditation content is often abstract and spiritual in ways that alienate practical people, so a clear, grounded focus on a specific struggle makes you accessible to the large audience who wants the benefits but bounces off the mysticism.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on the specific struggle you help with, so your feed stays grounded rather than abstract.",
      },
      {
        step_number: 2,
        title: "Turn student breakthroughs into relatable stories",
        description:
          "Your students' shifts — the anxiety that eased, the sleep that returned, the person who finally stuck with a practice — are your most persuasive content, with permission. Keep a note of these and the specific thing that unlocked each. Because meditation benefits are internal and easily dismissed, a concrete story of real change makes your work credible to skeptics and lets a struggling person see themselves in the transformation.",
        time_required: "10 min per story",
        carouselabs_tip:
          "CarouseLabs turns a student's breakthrough into a relatable story carousel, so your internal results become credible and tangible.",
      },
      {
        step_number: 3,
        title: "Write hooks that dissolve the 'I can't meditate' belief",
        description:
          "The biggest barrier is the belief that you're bad at meditation: 'You're not bad at meditating. You've been told the goal is an empty mind — it isn't.' Hooks that free people from this misconception are enormously effective, because a huge audience has tried, 'failed,' and given up. Correcting that single misunderstanding gives them permission to try again, and you're the person who gave it to them.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that dissolve the 'I can't meditate' belief, so your posts reach the many people who tried and gave up.",
      },
      {
        step_number: 4,
        title: "Build a carousel that gives a real, doable practice",
        description:
          "Structure a carousel around one practice: a 2-minute reset for a stressful day, how to handle a racing mind, a technique for falling asleep. Walk through the problem, the common mistake, the practice, the steps, and what shifts. Giving away a genuinely doable practice builds trust fast — when a reader tries your technique and actually feels calmer, even briefly, they believe your deeper teaching can change how they live.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full practice carousel from your method, so your free content delivers a real, doable technique rather than abstraction.",
      },
      {
        step_number: 5,
        title: "Keep it grounded and secular where it helps",
        description:
          "Much of your potential audience — stressed professionals, skeptics, practical people — is put off by mystical framing. Sharing grounded, plain-language content about what meditation actually does makes the practice accessible to them. Being the coach who makes meditation feel practical rather than spiritual opens a huge audience that other teachers unintentionally exclude, without diminishing the depth of what you offer.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you frame meditation in grounded, plain language, so your content reaches practical skeptics, not just the already-converted.",
      },
      {
        step_number: 6,
        title: "Stay present through a slow, tentative decision",
        description:
          "People circle meditation for a long time — curious, skeptical, repeatedly starting and stopping — before committing to a teacher. Batch a week of posts in one session so your calm presence keeps showing up throughout that window. Consistency builds the trust and familiarity that make you the teacher they finally choose when stress or sleeplessness pushes them to actually commit.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your calm presence stays with people through the long window before they commit to a practice.",
      },
      {
        step_number: 7,
        title: "Create a calm, uncluttered visual presence",
        description:
          "Your visual identity should embody the calm you teach — uncluttered, gentle, consistent. A serene look reassures an overwhelmed prospect and demonstrates the very stillness you offer, while a busy feed would contradict your message. Lock in your template once so every practice and story carousel reinforces that calm. For a meditation coach, a tranquil feed is a small, fitting demonstration of the state you help people find.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel calm and uncluttered, so your feed embodies the stillness you teach.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, meditation coaches struggled to reach the huge audience who wanted calm but bounced off mystical framing or had already 'failed' at meditating. Between sessions there was no time to create content, and turning internal, subtle experiences into compelling posts was genuinely hard. So your grounded, effective teaching stayed invisible while abstract content reinforced every misconception that keeps people from trying. The stressed, sleepless, anxious people who most needed your practice couldn't find a version of meditation that felt like it was for them.",
    after_carouselabs:
      "With CarouseLabs, your grounded teaching finally reaches practical skeptics. A student's breakthrough becomes a credible story. A hook dissolves the 'I can't meditate' belief that stopped thousands from trying again. Your technique becomes a carousel that delivers real, felt calm. Your plain-language framing opens the practice to people mystical content excludes. Because you batch a week in one session, your calm presence stays with people through the long window before they commit — and your tranquil feed embodies the very stillness you teach.",
    time_to_first_post:
      "About 20 minutes including onboarding — most meditation coaches turn one student breakthrough into a first carousel the same day.",
    quick_wins: [
      "Your first practice carousel that gives a reader real, felt calm in two minutes.",
      "A post that dissolves the 'I'm bad at meditating' belief and gives someone permission to try again.",
      "Your first student who says your grounded framing was the first meditation content that clicked for them.",
    ],
  },
  "mental-health-coaches": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Be clear about your scope and stay inside it",
        description:
          "Mental health coaching sits alongside — not instead of — clinical care, so before posting, get clear on your scope: what you help with, what requires a therapist or doctor, and how you'll signpost people appropriately. Being explicit about this in your content is both ethically essential and a trust signal. Coaches who clearly know their boundaries are more credible, not less, because it shows you put the person's wellbeing above your own client acquisition.",
        time_required: "30 min, once",
        carouselabs_tip:
          "CarouseLabs helps you frame content within your coaching scope, so your posts support people without straying into clinical territory.",
      },
      {
        step_number: 2,
        title: "Choose the struggle you support and speak to it",
        description:
          "Decide who you serve — burnt-out professionals, people rebuilding after a hard season, those managing everyday stress and overwhelm. Anchor your content there. Mental health is deeply personal, so a prospect needs to feel you understand their specific experience. This focus makes your content resonate with the right person and, importantly, helps people self-select accurately into coaching versus clinical support.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on the specific struggle you support, so your feed speaks to the right person clearly.",
      },
      {
        step_number: 3,
        title: "Write hooks that name a feeling with compassion",
        description:
          "Mental health hooks land when they name something the reader feels but can't articulate: 'Burnout doesn't feel like exhaustion. It feels like not caring about things you used to love.' Naming an inner experience with accuracy and warmth creates powerful recognition. Because so many people struggle silently without language for it, giving them that language is a genuine gift — and it's what makes them feel understood enough to reach out.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates compassionate hooks that name inner experiences accurately, so your posts create the recognition that helps people feel seen.",
      },
      {
        step_number: 4,
        title: "Build a carousel that offers a real, safe tool",
        description:
          "Structure a carousel around one supportive tool: a way to interrupt a spiral, how to set a boundary, a grounding practice for overwhelm. Walk through the situation, the common response, your tool, the steps, and what shifts — with clear signposting to professional support where relevant. Giving a real, safe tool builds trust and genuinely helps, which is both good practice and what makes someone want your support.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full supportive-tool carousel from your method, so your free content offers real help within appropriate boundaries.",
      },
      {
        step_number: 5,
        title: "Normalize the struggle and reduce shame",
        description:
          "Shame keeps people stuck and silent, so content that normalizes struggle — 'this is human, common, and workable' — is profoundly valuable. Share content that reduces the isolation people feel. Being the voice that makes someone feel less broken and less alone is exactly what makes them trust you, and it's a genuine public good regardless of whether they ever become a client.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs drafts normalizing, shame-reducing content, so your feed makes struggling people feel less alone rather than more broken.",
      },
      {
        step_number: 6,
        title: "Stay present through a slow, vulnerable decision",
        description:
          "Reaching out for mental health support is a vulnerable, slow decision — people often follow for months before they're ready. Batch a week of posts in one session so your compassionate presence keeps showing up throughout. Consistency builds the safety and familiarity this decision requires, so when someone is finally ready to ask for help, you're the person they already feel safe with.",
        time_required: "60 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your compassionate presence stays steady through the vulnerable, slow decision to seek support.",
      },
      {
        step_number: 7,
        title: "Create a warm, safe-feeling visual presence",
        description:
          "Your visual identity should feel warm, safe, and non-clinical — you're inviting people to consider something vulnerable. A gentle, consistent, approachable look reassures a struggling person that you're a compassionate presence. Lock in your template once so every tool and normalizing carousel carries the same warmth. In a domain where emotional safety is everything, a feed that feels like a gentle space is itself a reason someone might finally reach out.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel warm and consistent, so your feed feels like the safe space your coaching provides.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, mental health coaches wanted to reach struggling people but had no time to create content, and the topic's sensitivity made it daunting to write well. Between sessions, the compassionate language and real tools that could have helped many stayed private. So your feed went quiet or leaned on generic inspirational quotes that helped no one, invisible to the people silently struggling without words for what they were feeling. Your supportive, boundaried approach was exactly what they needed, but they couldn't find it.",
    after_carouselabs:
      "With CarouseLabs, your compassionate support reaches people who need it. A feeling becomes a hook that names an inner experience accurately and makes someone feel seen. Your method becomes a carousel offering a real, safe tool with appropriate signposting. Your normalizing content reduces the shame that keeps people stuck. Because you batch a week in one session, your presence stays steady through the vulnerable, slow decision to ask for help — so you're the person they already feel safe with when they're finally ready.",
    time_to_first_post:
      "About 20 minutes including onboarding — most coaches turn one supportive tool into a first carousel the same day.",
    quick_wins: [
      "Your first carousel that names a feeling accurately and makes someone feel less alone.",
      "A supportive-tool post that offers real help within clear, ethical boundaries.",
      "Your first enquiry from someone who says your content gave words to what they'd been carrying silently.",
    ],
  },
  "therapists": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Ground your content in your ethical obligations first",
        description:
          "Confidentiality is absolute, so before creating anything, establish your rules: never a client story, never an identifiable detail, no advice that mimics treatment, clear signposting to crisis support. Check your professional body's social media guidance. This isn't a limitation on your content — it's the foundation. Therapists who post from a clear ethical frame create confidently and sustainably, because they're never risking the trust their practice depends on.",
        time_required: "30 min, once",
        carouselabs_tip:
          "CarouseLabs drafts general, educational psychoeducation content rather than case material, so your posts stay within your ethical obligations.",
      },
      {
        step_number: 2,
        title: "Teach psychoeducation, never client stories",
        description:
          "Your content should draw on general clinical knowledge and the literature — not your caseload. Keep a note of the concepts you find yourself explaining generally: how anxiety maintains itself, what trauma does to the nervous system, why avoidance backfires. This psychoeducation is enormously valuable to the public and completely safe ethically, because it teaches the framework rather than exposing anyone's private material.",
        time_required: "10 min per concept",
        carouselabs_tip:
          "CarouseLabs turns a general clinical concept into a psychoeducation carousel, so your expertise reaches people without touching client material.",
      },
      {
        step_number: 3,
        title: "Write hooks that name an experience with clinical accuracy",
        description:
          "Therapy hooks land when they name something precisely: 'Anxiety isn't the fear itself. It's the fear of the fear — and that's why avoidance makes it worse.' Clinical accuracy delivered warmly creates powerful recognition in someone struggling without language for their experience. Because self-help content is often imprecise, a therapist's precision is both a genuine public service and a clear signal of your professional depth.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates clinically accurate, warm hooks, so your posts name experiences precisely without straying into personal advice.",
      },
      {
        step_number: 4,
        title: "Build a carousel that explains one psychological concept",
        description:
          "Structure a carousel around one concept: the window of tolerance, how the nervous system responds to threat, why perfectionism is often fear. Walk through the misconception, the mechanism, what it means, and where to get support. Explaining psychological concepts clearly is profoundly useful — it helps people understand themselves, reduces shame, and demonstrates your expertise without ever approaching the boundary of treating someone through a post.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full psychoeducation carousel from your notes, so complex psychology becomes clear and safe public content.",
      },
      {
        step_number: 5,
        title: "Reduce stigma and normalize seeking help",
        description:
          "Many people never seek therapy because of shame or misconceptions about what it is. Content that demystifies therapy — what actually happens, who it's for, why it's not just for crises — is genuinely valuable and reduces a real barrier. Being the therapist who makes the process feel understandable and non-threatening helps people take a step they might have avoided for years, which is meaningful work whether or not they come to you.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape stigma-reducing, demystifying content, so your feed lowers a real barrier to people seeking help.",
      },
      {
        step_number: 6,
        title: "Stay present without it draining your clinical capacity",
        description:
          "Therapeutic work is emotionally demanding, and you must protect your own capacity — content should never come at the cost of your presence with clients. Batch a week of posts in one session so your visibility holds without depleting you. Sustainable content practice models the boundaries you'd encourage in anyone else, and it keeps your practice visible to people slowly gathering courage to reach out.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so building visibility never depletes the emotional capacity your clients need from you.",
      },
      {
        step_number: 7,
        title: "Create a calm, professional, safe visual presence",
        description:
          "Your visual identity should feel calm, professional, and safe — reassuring someone who may be anxious about reaching out. A consistent, warm-but-professional look signals that you're a qualified, steady presence. Lock in your template once so every psychoeducation carousel carries the same reassuring polish. For someone deciding whether to seek help, a feed that feels safe and credible can be the difference between reaching out and staying stuck.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel calm and professional, so your feed feels safe to someone anxious about reaching out.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, therapists watched imprecise self-help content shape how the public understands mental health, while their own clinical knowledge stayed entirely private. Emotionally demanding caseloads left no capacity to create, and ethical caution made many therapists avoid posting at all rather than risk a boundary. So the psychoeducation that could have helped thousands understand themselves never got written, stigma went unchallenged, and people who needed therapy stayed stuck behind misconceptions your expertise could have dissolved.",
    after_carouselabs:
      "With CarouseLabs, your clinical knowledge reaches the public safely. A general concept becomes psychoeducation that helps people understand themselves — never touching client material. A hook names an experience with clinical accuracy that self-help content lacks. Your demystifying content lowers a real barrier to seeking help. Because the content is educational rather than case-based, your ethical frame stays intact — and because you batch a week in one session, visibility never depletes the emotional capacity your clients need from you.",
    time_to_first_post:
      "About 20 minutes including onboarding — most therapists turn one general clinical concept into a first psychoeducation carousel the same day.",
    quick_wins: [
      "Your first psychoeducation carousel that helps people understand themselves — safely, with no client material.",
      "A stigma-reducing post that lowers a real barrier for someone who'd avoided therapy for years.",
      "A sustainable content practice that builds visibility without depleting your clinical capacity.",
    ],
  },
  "psychologists": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Establish your ethical and professional frame",
        description:
          "As a psychologist you carry both confidentiality obligations and a duty to represent the science accurately. Before posting, get clear: no client material ever, no overclaiming beyond the evidence, appropriate signposting, and alignment with your professional body's guidance. This frame is what lets you contribute confidently to public discourse for years, and it's what distinguishes your voice from the pop-psychology content that plays fast and loose with both ethics and evidence.",
        time_required: "30 min, once",
        carouselabs_tip:
          "CarouseLabs drafts evidence-grounded, general content rather than case material, so your posts stay inside your professional obligations.",
      },
      {
        step_number: 2,
        title: "Translate real psychological science for the public",
        description:
          "You understand the actual evidence in a field where pop psychology thrives on myths — learning styles, left/right brain, oversimplified 'trauma' claims. Keep a note of the concepts and misconceptions worth addressing. Translating genuine psychological science accurately is your highest-value contribution, because the public is drowning in confident misinformation and almost nobody with real expertise is making the science accessible.",
        time_required: "10 min per concept",
        carouselabs_tip:
          "CarouseLabs turns psychological science into an accessible carousel, so real evidence competes with the pop-psychology myths dominating feeds.",
      },
      {
        step_number: 3,
        title: "Write hooks that correct myths with evidence",
        description:
          "Psychology hooks land when they overturn a popular myth with real science: 'Learning styles aren't real. Here's what the evidence actually shows about how people learn.' Because pop psychology is riddled with appealing falsehoods, a psychologist offering evidence-based correction is both refreshing and highly shareable. This positions you as credible signal amid noise and attracts people who want truth over comfortable myths.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates evidence-based, myth-correcting hooks, so your posts bring real science to a feed dominated by pop-psychology falsehoods.",
      },
      {
        step_number: 4,
        title: "Build a carousel that explains the evidence clearly",
        description:
          "Structure a carousel around one evidence-based topic: what the research says about habit formation, how memory actually works, why a popular claim doesn't hold up. Walk through the myth, the actual evidence, the nuance, and the practical implication. Making real psychological science accessible without dumbing it down is rare and valuable — it builds enormous credibility and genuinely improves public understanding of your field.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full evidence-based carousel from your notes, so psychological science becomes accessible without losing its nuance.",
      },
      {
        step_number: 5,
        title: "Model appropriate uncertainty and nuance",
        description:
          "Pop psychology overclaims; good science acknowledges limits. Sharing content that models appropriate uncertainty — 'the evidence suggests, but it's more complicated than the headline' — is both intellectually honest and differentiating. This nuance builds deep trust with thoughtful readers who are tired of confident oversimplification, and it demonstrates the scientific rigor that distinguishes a psychologist from an influencer with opinions about the brain.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape nuanced, appropriately-hedged content, so your feed models scientific rigor rather than confident oversimplification.",
      },
      {
        step_number: 6,
        title: "Stay consistently present to compete with the noise",
        description:
          "Pop-psychology accounts post constantly, so sporadic presence means the myths win by default. Batch a week of posts in one session so your evidence-based voice keeps showing up. Consistency is how real science can actually compete for public attention — the qualified voice that shows up reliably eventually becomes the one people trust when they realize the appealing myths didn't hold up.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your evidence-based voice can actually compete with constantly-posting pop-psychology accounts.",
      },
      {
        step_number: 7,
        title: "Present with credible, academic-clean visuals",
        description:
          "Your visual identity should signal scientific credibility — clean, clear, professional rather than sensational. A consistent, considered look reinforces that you represent real evidence, not clickbait. Lock in your template once so every science-translation carousel carries the same credible polish. In a space where the loudest visuals often carry the worst information, looking rigorous and calm is itself a meaningful signal to discerning readers.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clean and credible, so your feed signals real science rather than clickbait.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, psychologists watched pop-psychology myths dominate public understanding of their own field while their genuine expertise stayed locked in journals and clinics. Practice and research left no time to write, and translating science accurately for a general audience took real effort. So learning styles, brain myths, and oversimplified trauma claims spread unchallenged, and the public formed its understanding of the mind from people with no training and no accountability. Your rigor was real; the conversation happened without you.",
    after_carouselabs:
      "With CarouseLabs, real psychological science finally reaches the public. A concept becomes an accessible carousel that keeps its nuance. A myth becomes an evidence-based correction that's both refreshing and shareable. Your modeling of appropriate uncertainty builds deep trust with readers tired of confident oversimplification. Because you batch a week in one session, your evidence-based voice can actually compete with constantly-posting pop-psychology accounts — so real science starts winning some of the attention the myths used to take by default.",
    time_to_first_post:
      "About 20 minutes including onboarding — most psychologists turn one concept into an accessible first carousel the same day.",
    quick_wins: [
      "Your first science-translation carousel that makes real evidence accessible without dumbing it down.",
      "A myth-correcting post that brings rigor to a feed dominated by appealing falsehoods.",
      "Your first reader who says your content changed what they believed about how the mind works.",
    ],
  },
  "online-course-creators": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Build the audience before you build the course",
        description:
          "The single biggest reason courses fail is launching to nobody. Decide the transformation your course delivers and start building an audience around that topic now — ideally before the course exists. Your content is both audience-building and market research: the posts that resonate tell you what people actually want to learn. Creators who build the audience first launch to warm demand; those who build first and market later launch into silence.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your course topic, so every post builds the audience your launch will depend on.",
      },
      {
        step_number: 2,
        title: "Give away your best teaching for free",
        description:
          "Creators fear that free content cannibalizes course sales, but the opposite is true — free teaching proves your ability to teach, which is what people actually buy. Keep a note of your best lessons and share them generously. When someone learns something genuinely valuable from your free content, they conclude your paid course must be excellent. Your free teaching is the demo of the product.",
        time_required: "10 min per lesson",
        carouselabs_tip:
          "CarouseLabs turns one of your lessons into a teaching carousel, so your free content proves the teaching ability people buy courses for.",
      },
      {
        step_number: 3,
        title: "Write hooks that promise a specific transformation",
        description:
          "Course-creator hooks land when they promise a concrete skill or outcome: 'The 3 things separating people who ship courses from people who plan them.' Leading with a specific transformation attracts exactly the people who'd buy that transformation. Avoid vague 'learn and grow' hooks — the person who buys your course wants a specific capability, so speak to that capability directly and they'll self-identify immediately.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that promise specific transformations, so your posts attract the exact people who'd buy your course.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches one complete lesson",
        description:
          "Structure a carousel around one self-contained lesson from your expertise: the framework, the common mistake, the method, the steps, and the result. A carousel that genuinely teaches something end-to-end is your best possible marketing, because it demonstrates your instructional design — the thing that separates a good course from a bad one. Prospects experience your teaching quality directly rather than taking your word for it.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full teaching carousel from your lesson — and its clarity demonstrates the instructional quality your course delivers.",
      },
      {
        step_number: 5,
        title: "Share student results and the journey behind them",
        description:
          "Your students' outcomes — the skill gained, the career change, the thing they built — are your most persuasive proof, with permission. Keep a note of these and the specific part of your course that unlocked each. Because course buyers are rightly skeptical (the market is full of bad courses), real student results demonstrate that your teaching actually produces the transformation you promise, which is the only thing that overcomes that skepticism.",
        time_required: "10 min per result",
        carouselabs_tip:
          "CarouseLabs turns a student result into a proof carousel, so your outcomes answer the skepticism a crowded course market has earned.",
      },
      {
        step_number: 6,
        title: "Post consistently between launches, not just during them",
        description:
          "The classic mistake is going quiet between launches and then shouting when the cart opens — which trains your audience to ignore you. Batch a week of posts in one session so you're consistently giving value regardless of launch cycles. An audience that's been learning from you for months buys instantly when you launch; one that only hears from you during a promotion tunes out. Consistency between launches is what makes launches work.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so you keep giving value between launches instead of only appearing when the cart opens.",
      },
      {
        step_number: 7,
        title: "Let your content quality signal your course quality",
        description:
          "Prospects extrapolate directly from your free content to your paid product — sloppy posts imply a sloppy course. A polished, consistent, well-designed visual identity signals the production quality and care your course delivers. Lock in your template once so every teaching carousel looks the part. For a course creator, your feed is a continuous free sample, and its quality is doing your selling every single day.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel polished and consistent, so your free content signals the quality of your paid course.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, course creators built products and launched them into silence. Building the course consumed everything, so audience-building got postponed until launch week — at which point you were shouting at strangers. You hoarded your best teaching, fearing it would cannibalize sales, so prospects had no way to judge whether you could actually teach. Between launches you went quiet, then reappeared selling, which trained your audience to tune you out. Your course might have been excellent; nobody had any reason to believe it.",
    after_carouselabs:
      "With CarouseLabs, your audience gets built before your launch needs it. Your best lesson becomes a free teaching carousel that proves you can actually teach — the demo of the product. A specific-transformation hook attracts exactly the people who'd buy. Student results become proof that answers a skeptical market. Because you batch a week in one session, you keep giving value between launches instead of only appearing when the cart opens — so when you do launch, you're selling to an audience that's been learning from you for months.",
    time_to_first_post:
      "About 15 minutes from signup — appropriately fast for someone whose whole craft is teaching and content.",
    quick_wins: [
      "Your first free teaching carousel that proves you can teach — the demo prospects need before buying.",
      "A consistent between-launch presence that turns your next launch into a warm sell.",
      "Your first course enquiry from someone who learned something valuable from you for free.",
    ],
  },
  "edtech-founders": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Lead with your conviction about how learning should work",
        description:
          "EdTech is full of undifferentiated products, so lead with your pedagogical conviction — what you believe about how people actually learn and why current approaches fail. Anchor your content to that belief. Educators and buyers are cynical about EdTech that ignores learning science, so a founder with a genuine, informed point of view about pedagogy stands out immediately and attracts the educators, investors, and talent who share that conviction.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs helps you develop content around your pedagogical conviction, so your feed carries a real point of view rather than product marketing.",
      },
      {
        step_number: 2,
        title: "Turn what you learn from educators into content",
        description:
          "You sit between technology and classrooms, hearing what teachers and learners actually struggle with. Keep a note of these insights — the workflow that's broken, the assumption EdTech gets wrong, the thing that genuinely helps. Sharing real insight from the education front line proves you listen to educators rather than building at them, which is exactly the credibility EdTech founders usually lack and educators desperately want to see.",
        time_required: "10 min, weekly",
        carouselabs_tip:
          "CarouseLabs turns an insight from educators into a carousel, so your feed proves you build with teachers rather than at them.",
      },
      {
        step_number: 3,
        title: "Write hooks that challenge EdTech's bad assumptions",
        description:
          "EdTech hooks land when they call out the field's failures honestly: 'Most EdTech fails because it solves a problem teachers don't have.' Educators are exhausted by tools imposed on them, so a founder who names that honestly earns instant credibility. This positions you as the rare EdTech voice who understands the classroom reality, which is precisely what makes educators willing to actually try your product.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that honestly challenge EdTech's failures, so your posts earn credibility with educators tired of imposed tools.",
      },
      {
        step_number: 4,
        title: "Build a carousel grounded in learning science",
        description:
          "Structure a carousel around one evidence-based idea: what the research says about retention, why a popular teaching method doesn't work, how to design for actual learning. Walk through the misconception, the evidence, the implication, and the practical application. Grounding your content in real learning science differentiates you from EdTech that's all technology and no pedagogy, and it earns respect from the educators who are your toughest and most important audience.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full learning-science carousel from your notes, so your content proves pedagogical depth, not just technology.",
      },
      {
        step_number: 5,
        title: "Share the founder journey in a hard market",
        description:
          "EdTech is brutal — long sales cycles, tight budgets, institutional inertia — and honestly documenting that journey builds a following of fellow founders, attracts mission-driven talent, and signals resilience to investors who know the space. Your struggles navigating procurement or winning over skeptical teachers are compelling content few can offer, and they prove you're building for the long haul in a market that punishes tourists.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs turns an EdTech founder struggle into a post, so the hard reality of the market becomes content that builds your reputation.",
      },
      {
        step_number: 6,
        title: "Stay consistent through long institutional sales cycles",
        description:
          "EdTech buying decisions crawl — a district or university might take a year — so the buyer researching you now decides much later. Batch a week of posts in one session so your presence holds throughout that long window. Consistency keeps you credible and top of mind across a sales cycle far longer than most markets, which is exactly when a visible, trusted founder brand does its most valuable work.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your presence holds across EdTech's famously long institutional buying cycles.",
      },
      {
        step_number: 7,
        title: "Present with clean, credible, education-appropriate visuals",
        description:
          "Your audience includes educators and institutional buyers who value substance over flash. A clean, professional, considered visual identity signals seriousness and pedagogical care rather than startup hype. Lock in your template once so every learning-science and insight carousel carries the same credible polish — reinforcing that you're building something thoughtful for education rather than another tool chasing a trend.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clean and credible, so your feed signals pedagogical seriousness, not startup hype.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, EdTech founders built in one of the hardest markets while their conviction stayed invisible. Long sales cycles, institutional inertia, and product demands consumed everything, so the pedagogical insight and educator understanding that would have set you apart never became content. Educators — cynical from years of tools imposed on them — had no way to know you actually listened to them. Your feed, if it existed, looked like every other EdTech product pitch, and the trust that this market runs on went unbuilt across sales cycles that lasted a year.",
    after_carouselabs:
      "With CarouseLabs, your conviction and educator understanding become visible. An insight from teachers becomes a carousel proving you build with them, not at them. An honest hook about EdTech's failures earns credibility with an exhausted audience. Learning science becomes a carousel that proves pedagogical depth. Your founder journey in a brutal market attracts mission-driven talent and investors who know the space. Because you batch a week in one session, your presence holds across the year-long buying cycles where a trusted founder brand matters most.",
    time_to_first_post:
      "About 20 minutes including onboarding — most EdTech founders turn one educator insight into a first carousel the same day.",
    quick_wins: [
      "Your first carousel proving you listen to educators rather than building at them.",
      "A learning-science post that shows pedagogical depth, not just technology.",
      "Your first inbound from an educator or institutional buyer who trusts your conviction.",
    ],
  },
  "corporate-trainers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define the capability you build in organizations",
        description:
          "Corporate training is a crowded, commoditized market, so specialize: leadership development, sales enablement, communication skills, technical upskilling, change readiness. Choose the capability you build and anchor your content there. L&D buyers want a specialist who understands their specific need, and a clear focus lets you command premium fees rather than competing on day rate with generalist training providers.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your training specialty, so your feed commands premium positioning rather than day-rate competition.",
      },
      {
        step_number: 2,
        title: "Turn training-room insights into content",
        description:
          "Every session shows you what actually changes behavior and what doesn't — the exercise that lands, the resistance you meet, the reason training usually fails to stick. Keep a note of these observations. This front-line insight into organizational learning is genuinely valuable to L&D leaders, and it demonstrates that you understand the real challenge: not delivering content, but creating change that survives contact with the workplace.",
        time_required: "10 min per session",
        carouselabs_tip:
          "CarouseLabs turns a training-room insight into a carousel, so your front-line understanding of behavior change becomes visible expertise.",
      },
      {
        step_number: 3,
        title: "Write hooks that name why training fails",
        description:
          "Training hooks land when they address the elephant in the room: 'Your training didn't fail. You sent people back to a system that punishes the new behavior.' L&D leaders know most training doesn't stick and are frustrated by it, so a trainer who names that honestly and offers a real diagnosis earns instant credibility. This positions you as a change expert rather than a content deliverer, which is the difference between a commodity and a premium partner.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that honestly name why training fails, so your posts position you as a change expert, not a content deliverer.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a real behavior-change method",
        description:
          "Structure a carousel around one method: how to make training stick, how to design for transfer, how to get managers to reinforce learning. Walk through the problem, the common mistake, your method, the steps, and the outcome. Teaching a genuine method demonstrates you understand organizational behavior change, not just delivery — exactly the depth L&D buyers need but rarely find in the training market.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full behavior-change carousel from your method, so your expertise proves you create change, not just deliver content.",
      },
      {
        step_number: 5,
        title: "Speak the language of business outcomes",
        description:
          "L&D is under constant pressure to prove ROI, so content connecting training to business results — retention, performance, capability gaps closed — speaks directly to your buyer's problem. Share content that helps L&D leaders make the business case. Being the trainer who helps them justify the investment makes you an ally rather than a vendor, which is precisely the relationship that wins long-term contracts.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you connect training to business outcomes, so your feed speaks to the ROI pressure your L&D buyers actually feel.",
      },
      {
        step_number: 6,
        title: "Stay visible between delivery-heavy periods",
        description:
          "Delivery consumes you in waves, and content disappears during them — right when L&D leaders are planning next year's budget. Batch a week of posts in one session so your presence holds through delivery-heavy stretches. Consistency keeps you top of mind for the budget cycles and capability crises that drive training decisions, so you're the specialist they call rather than the one they forgot about.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your presence holds through delivery-heavy periods and budget-planning cycles.",
      },
      {
        step_number: 7,
        title: "Present with professional, corporate-credible polish",
        description:
          "Your buyers are corporate L&D professionals who judge credibility on polish. A clean, consistent, professional visual identity signals the quality your training delivers and reassures a buyer that you'll represent them well in front of their people. Lock in your template once so every insight and method carousel carries the same corporate-ready polish, quietly supporting the premium positioning your fees depend on.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel polished and consistent, so your feed matches the standards corporate buyers expect.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, corporate trainers competed on day rate in a commoditized market because nothing distinguished them. Delivery consumed you in waves, so content vanished exactly when L&D leaders were planning budgets. The front-line insight from your training rooms — the real understanding of why change sticks or fails — stayed private, so buyers saw you as a content deliverer rather than a change expert. Your genuine expertise in behavior change, the thing that would have justified premium fees, was completely invisible.",
    after_carouselabs:
      "With CarouseLabs, your expertise in real behavior change becomes visible. A training-room insight becomes a carousel proving you understand what makes change stick. An honest hook about why training fails positions you as a change expert, not a vendor. Your method proves depth L&D buyers rarely find. Your business-outcome content makes you an ally in their ROI fight. Because you batch a week in one session, your presence holds through delivery-heavy stretches and budget cycles — so you're the specialist they call, at premium rates.",
    time_to_first_post:
      "About 20 minutes including onboarding — most trainers turn one training-room insight into a first carousel the same day.",
    quick_wins: [
      "Your first carousel proving you're a behavior-change expert, not a content deliverer.",
      "A presence that holds through delivery waves and lands you in budget-planning conversations.",
      "Your first premium enquiry from an L&D leader who found a specialist rather than a day-rate vendor.",
    ],
  },
  "professors": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Decide how your scholarship should reach beyond academia",
        description:
          "Your research is locked behind journals that almost nobody reads, while public understanding of your field gets shaped by people with far less expertise. Decide what your public contribution is — translating your research area, correcting misconceptions, offering rigorous perspective on public debates. This isn't self-promotion; it's the public good your expertise makes possible, and increasingly it's what drives impact, funding, and collaboration.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content anchored to your scholarly expertise, so your feed makes real research accessible beyond the journal.",
      },
      {
        step_number: 2,
        title: "Translate your research into accessible insight",
        description:
          "Your papers contain genuine insight buried under necessary academic language. Keep a note of the core findings and ideas worth sharing, and practice explaining each in plain terms. Translation is rare — most academics can't or won't do it — so a professor who makes real scholarship accessible builds enormous reach and influence, driving citations, collaborations, media requests, and genuine public impact that a paper alone never achieves.",
        time_required: "10 min per insight",
        carouselabs_tip:
          "CarouseLabs turns a research insight into an accessible carousel, so your scholarship reaches beyond the handful who read your papers.",
      },
      {
        step_number: 3,
        title: "Write hooks that make expertise feel relevant",
        description:
          "Academic hooks land when they connect scholarship to something people care about: 'Everyone's arguing about this. Fifty years of research already answered it.' Leading with the relevance of your expertise to a live question earns attention that abstract findings never would. Because public debate so often ignores existing evidence, a scholar who brings it in accessibly is both valuable and genuinely interesting to a wide audience.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that connect your scholarship to live questions, so your expertise feels relevant rather than abstract.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a hard idea clearly",
        description:
          "Structure a carousel around one concept from your field: the mechanism people misunderstand, what the evidence actually shows, why an intuitive belief is wrong. Walk through the misconception, the evidence, the nuance, and the implication. Teaching is your craft — a carousel that makes a genuinely hard idea legible without dumbing it down demonstrates exactly the ability that makes a great professor, and it reaches thousands rather than a lecture hall.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full explainer carousel from your notes, so hard scholarly ideas become legible without losing their rigor.",
      },
      {
        step_number: 5,
        title: "Model intellectual honesty and appropriate uncertainty",
        description:
          "Public discourse rewards confident oversimplification; scholarship demands acknowledging limits. Sharing content that models appropriate uncertainty — what we know, what we don't, where the debate genuinely sits — is both honest and differentiating. This nuance builds deep trust with thoughtful readers exhausted by false certainty, and it demonstrates the scholarly rigor that distinguishes a professor from a pundit with opinions.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape nuanced, appropriately-hedged content, so your feed models scholarly rigor rather than false certainty.",
      },
      {
        step_number: 6,
        title: "Stay present despite teaching and research demands",
        description:
          "Teaching loads, grant writing, and research leave almost no time for public engagement, so it's the first thing dropped. Batch a week of posts in one session so your public voice holds through term and grant season. Consistent visibility compounds into the impact, collaborations, and public influence that increasingly matter for academic careers — and it means the public conversation in your field includes an actual expert.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your public voice holds through teaching loads and grant season.",
      },
      {
        step_number: 7,
        title: "Present with clean, scholarly-credible visuals",
        description:
          "Your visual identity should signal rigor and clarity rather than sensationalism. A clean, consistent, considered look reinforces that you represent real scholarship. Lock in your template once so every research-translation carousel carries the same credible polish, letting the intellectual substance lead — which is exactly what a thoughtful audience wants and what distinguishes you from the confident non-experts dominating the feed.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clean and scholarly, so your feed signals rigor over sensationalism.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, professors watched public debate in their own field proceed without them. Your genuine scholarship sat behind journals read by a handful of specialists, while confident non-experts shaped what the public believed. Teaching loads and grant writing left no time for public engagement, and translating research accessibly took real effort. So the expertise that could have improved public understanding stayed locked away, your impact stayed confined to citations, and the conversation happened without the one person in the room who'd actually studied it.",
    after_carouselabs:
      "With CarouseLabs, your scholarship finally reaches beyond the journal. A research insight becomes an accessible carousel that thousands read rather than a dozen. A hook connects your expertise to a live question people are already arguing about. A hard idea becomes legible without losing rigor. Your intellectual honesty builds trust with readers exhausted by false certainty. Because you batch a week in one session, your public voice holds through term and grant season — so the conversation in your field finally includes an actual expert.",
    time_to_first_post:
      "About 20 minutes including onboarding — most professors turn one research insight into an accessible first carousel the same day.",
    quick_wins: [
      "Your first accessible carousel that takes your scholarship beyond the handful who read your papers.",
      "A post that brings real evidence to a public debate that had been proceeding without it.",
      "Your first collaboration, media, or speaking enquiry from finally being visible outside academia.",
    ],
  },
  "tutors": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define your subject, level, and the parent you serve",
        description:
          "Tutoring is local and word-of-mouth driven, but a visible presence changes that. Decide your subject, level, and — crucially — who actually hires you, usually an anxious parent. Anchor your content to their worry, not just your subject. Parents choosing a tutor for their child's future are making an emotional decision, so content that speaks to their concern rather than listing your qualifications is what makes them reach out.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your subject and the parent who hires you, so your feed speaks to their real worry.",
      },
      {
        step_number: 2,
        title: "Turn teaching moments into useful content",
        description:
          "Every session reveals the misconceptions students share, the explanation that finally clicks, the study habit that changes results. Keep a note of these. Sharing genuinely useful teaching insight helps parents and students immediately and proves your ability far better than any credential list. When your free explanation makes something click for someone's child, that parent wants you teaching them properly.",
        time_required: "5 min a day",
        carouselabs_tip:
          "CarouseLabs turns a real teaching moment into a helpful carousel, so your daily tutoring becomes content that proves your ability.",
      },
      {
        step_number: 3,
        title: "Write hooks that speak to a parent's worry",
        description:
          "Tutoring hooks land when they name a parent's fear or a student's stuck point: 'Your child isn't bad at maths. They missed one concept three years ago and everything since has been built on it.' Naming the real, fixable cause of struggle is enormously reassuring to a worried parent and instantly credible. It reframes their child's difficulty as solvable — which is exactly the hope that makes them hire a tutor.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that speak to a parent's worry and reframe struggle as fixable, so your posts offer the hope that converts.",
      },
      {
        step_number: 4,
        title: "Build a carousel that explains something genuinely well",
        description:
          "Structure a carousel around one concept students struggle with, or one study method that works. Walk through the confusion, the common mistake, the clear explanation, and the practice. A carousel that genuinely teaches demonstrates your explanatory skill — the entire product of tutoring. Parents can directly judge whether you're good at explaining things, which is far more persuasive than a list of your grades.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full teaching carousel from your explanation, so parents can directly judge the explanatory skill they're hiring.",
      },
      {
        step_number: 5,
        title: "Address the confidence side, not just the subject",
        description:
          "Most struggling students have a confidence problem wrapped around a knowledge gap, and parents know it. Content about rebuilding a student's belief in themselves — reducing exam anxiety, recovering after failure — differentiates you from tutors who only talk about grades. Being the tutor who understands the emotional side is exactly what a parent watching their child lose confidence desperately wants to find.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs mixes confidence and anxiety angles into your idea feed, so your content addresses what parents are really worried about.",
      },
      {
        step_number: 6,
        title: "Stay visible through term-time and exam cycles",
        description:
          "Tutoring demand spikes around exams, but parents form opinions all year. Batch a week of posts in one session so your presence holds through your busiest teaching periods. Consistency keeps you top of mind for the moment a parent decides their child needs help — often triggered by a report card or a mock exam — so you're the tutor they already trust rather than a stranger they find in a panic.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your presence holds through term-time teaching and exam-season demand spikes.",
      },
      {
        step_number: 7,
        title: "Look trustworthy and warm to parents",
        description:
          "Parents are handing you their child's education and often their child's confidence, so your visual identity should feel warm, professional, and trustworthy. A clean, consistent, approachable look reassures a cautious parent. Lock in your template once so every teaching carousel carries the same reassuring polish — which quietly signals that you're a careful, credible professional worth trusting with something they care about enormously.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel warm and professional, so your feed reassures parents you're worth trusting.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, tutors depended entirely on word of mouth and agency listings, competing on hourly rate with no way to stand out. Your genuine explanatory skill — the entire product of tutoring — was invisible until someone had already hired you. Teaching all day left no time for content, so the moments where you made something finally click for a struggling student never reached the anxious parents searching for exactly that. Parents chose tutors essentially at random, and your real ability counted for nothing in the decision.",
    after_carouselabs:
      "With CarouseLabs, your explanatory skill becomes visible before anyone hires you. A teaching moment becomes a carousel that makes something click for a stranger's child. A hook names a parent's worry and reframes struggle as fixable — the hope that converts. Your confidence-focused content addresses what parents are really afraid of. Because you batch a week in one session, your presence holds through term-time — so when a report card triggers a parent's decision, you're the tutor they already trust.",
    time_to_first_post:
      "About 20 minutes including onboarding — most tutors turn one teaching moment into a first carousel the same day.",
    quick_wins: [
      "Your first teaching carousel that lets parents directly judge the explanatory skill they'd be hiring.",
      "A post that reframes a child's struggle as fixable and gives a worried parent hope.",
      "Your first enquiry from a parent who found you rather than an agency — at your rate, not theirs.",
    ],
  },
  "video-editors": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define your editing niche and ideal client",
        description:
          "Video editing is globally competitive, so specialize: YouTube retention editing, brand films, documentary, short-form social, corporate. Choose your niche and the client you want, then anchor your content there. A clear specialty commands far higher rates than generalist editing, because a client with a specific need wants the specialist who's solved it a hundred times, not someone who does everything adequately.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your editing niche, so your feed attracts the specific clients who pay premium rates.",
      },
      {
        step_number: 2,
        title: "Turn your editing decisions into visible craft",
        description:
          "Clients see your output but never your thinking — the pacing decision, the cut that saved a scene, the retention technique. Keep a note of these decisions and the reasoning. Showing your craft reasoning proves you're a storyteller rather than a button-pusher, which is exactly what separates a premium editor from a cheap one. Your thinking is the value; make it visible.",
        time_required: "10 min per project",
        carouselabs_tip:
          "CarouseLabs turns an editing decision into a craft carousel, so your storytelling thinking — not just your output — becomes visible.",
      },
      {
        step_number: 3,
        title: "Write hooks that promise a real editing insight",
        description:
          "Editing hooks land when they promise a concrete technique or result: 'The 3-second rule that fixed our client's retention graph.' Leading with a specific, results-backed technique speaks to creators and brands who care about outcomes, not aesthetics for their own sake. This positions you as an editor who understands why the edit matters commercially — which is what clients with real budgets actually want.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that promise concrete editing techniques and results, so your posts attract outcome-focused clients.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches an editing technique",
        description:
          "Structure a carousel around one technique: how to cut for retention, how to pace a story, how to fix a boring interview. Walk through the problem, the common mistake, your technique, the steps, and the result. Teaching your craft proves your expertise — and editors worry this gives away the goods, but it does the opposite: it proves you're the expert while making DIY-ers realize they'd rather hire you.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full technique carousel from your method, so your craft becomes visible expertise that attracts better clients.",
      },
      {
        step_number: 5,
        title: "Connect editing to the outcomes clients care about",
        description:
          "Clients don't buy cuts — they buy retention, engagement, conversions, brand perception. Content that connects editing decisions to business outcomes elevates you from a production cost to a strategic partner. Being the editor who talks about why the edit drives results is what justifies premium rates and attracts clients who understand that editing is where a video succeeds or dies.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you connect editing craft to client outcomes, so your feed positions you as a strategic partner, not a production cost.",
      },
      {
        step_number: 6,
        title: "Post consistently despite deadline-driven project waves",
        description:
          "Editing runs on brutal deadline cycles, so marketing disappears whenever a project lands — then you scramble when it ends. Batch a week of posts in one session so your visibility holds through crunch weeks. Consistent presence means your next client is lined up before the current project wraps, smoothing the freelance income roller coaster that deadline-driven work otherwise guarantees.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your visibility holds through deadline crunches instead of vanishing during them.",
      },
      {
        step_number: 7,
        title: "Let your feed demonstrate your visual eye",
        description:
          "You're a visual professional — a scrappy feed directly contradicts your value proposition. A polished, consistent, well-crafted visual identity demonstrates the eye clients are paying for. Lock in your template once so every craft and technique carousel looks the part. For a video editor, visual quality in your own content isn't vanity; it's the most direct proof that you have the aesthetic judgment they're hiring.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel visually sharp, so your feed proves the eye clients are paying for.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, video editors competed globally on price with nothing but a portfolio link. Your craft reasoning — the pacing decisions, the retention techniques, the storytelling judgment that separates a premium editor from a cheap one — stayed completely invisible, because clients see output but never thinking. Deadline waves meant marketing vanished during projects and panicked after them. So you were judged on rate rather than expertise, and your genuine storytelling ability counted for nothing until someone had already taken a chance on you.",
    after_carouselabs:
      "With CarouseLabs, your craft thinking becomes visible. An editing decision becomes a carousel proving you're a storyteller, not a button-pusher. A results-backed hook attracts outcome-focused clients. Your technique proves expertise while making DIY-ers realize they'd rather hire you. Connecting editing to business outcomes positions you as a strategic partner rather than a production cost. Because you batch a week in one session, your visibility holds through deadline crunches — so your next client is lined up before the current project wraps.",
    time_to_first_post:
      "About 20 minutes including onboarding — most editors turn one craft decision into a first carousel the same day.",
    quick_wins: [
      "Your first craft carousel that proves you're a storyteller, not a button-pusher.",
      "A visually sharp feed that demonstrates the eye clients are paying for.",
      "Your next client lined up before the current project wraps, smoothing the freelance roller coaster.",
    ],
  },
  "photographers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Own your genre and your ideal client",
        description:
          "Photography is saturated, so specialize: brand photography, headshots for executives, product, weddings, editorial. Choose your genre and the client you want, then anchor your content there. A clear specialty commands premium rates because a client with a specific need wants the specialist. And on LinkedIn specifically, brand and corporate photography clients are abundant and underserved compared to the crowded consumer photography market.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your photography genre, so your feed attracts the specific clients who pay premium rates.",
      },
      {
        step_number: 2,
        title: "Show the thinking behind the image",
        description:
          "Clients see beautiful photos everywhere and can't tell why yours are better. Keep a note of the decisions behind your shots — the lighting choice, the direction that relaxed a nervous subject, the composition that made a product sell. Showing your thinking proves you're a professional with judgment rather than someone with a good camera, which is exactly what justifies your rate against cheaper competition.",
        time_required: "10 min per shoot",
        carouselabs_tip:
          "CarouseLabs turns a shoot decision into a craft carousel, so the judgment behind your images — not just the images — becomes visible.",
      },
      {
        step_number: 3,
        title: "Write hooks that speak to a client's real problem",
        description:
          "Photography hooks land when they name a client's actual concern: 'Your headshot is costing you opportunities, and it's not about how you look.' Leading with the business consequence rather than the aesthetics speaks to a professional buyer's real worry. Because most photography content is aimed at other photographers, speaking to clients' problems instead makes you visible to the people who'd actually hire you.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that speak to clients' real problems, so your posts reach buyers rather than other photographers.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches something clients value",
        description:
          "Structure a carousel around one thing your client needs: how to look natural on camera, what makes a brand shoot work, how to prepare for a headshot. Walk through the problem, the common mistake, your guidance, the steps, and the result. Teaching clients rather than photographers builds trust with buyers and demonstrates your expertise — and a nervous client who learns from you already trusts you before the shoot.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full client-focused carousel from your notes, so your expertise reaches buyers rather than fellow photographers.",
      },
      {
        step_number: 5,
        title: "Address the discomfort of being photographed",
        description:
          "Most people hate being photographed and dread the shoot, which is a real barrier to booking. Content that addresses that discomfort — how you make people comfortable, why they hate their photos, what to expect — dissolves the fear that stops people hiring you. Being the photographer who understands the human anxiety, not just the technical craft, is exactly what makes a nervous professional finally book.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs mixes empathetic, anxiety-addressing angles into your idea feed, so your content dissolves the fear that stops people booking.",
      },
      {
        step_number: 6,
        title: "Stay visible through seasonal and project waves",
        description:
          "Photography runs in waves — busy seasons, quiet stretches — and marketing typically vanishes during the busy ones, guaranteeing the quiet ones. Batch a week of posts in one session so your visibility holds through shoot-heavy periods. Consistent presence means bookings keep arriving during your busy season rather than drying up after it, smoothing the feast-or-famine cycle photography is notorious for.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your visibility holds through busy shoot seasons instead of vanishing during them.",
      },
      {
        step_number: 7,
        title: "Let your feed prove your eye",
        description:
          "You're a visual professional, so your feed's design quality is judged as a direct sample of your aesthetic judgment. A polished, consistent, beautifully crafted visual identity is itself a portfolio piece. Lock in your template once so every craft and client-education carousel exemplifies your eye. For a photographer, a visually excellent feed proves the exact judgment clients are paying for, doing your selling continuously.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel visually beautiful, so your feed proves the eye clients are paying for.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, photographers competed in a saturated market where clients couldn't tell why one portfolio was better than another. Your craft judgment stayed invisible — clients saw images but never the thinking that justified your rate. Most photography content spoke to other photographers rather than buyers, so the professionals who'd have hired you never saw you. And shoot seasons meant marketing vanished during busy periods, guaranteeing the quiet stretches that followed. Your expertise was real; the market saw only a price.",
    after_carouselabs:
      "With CarouseLabs, your judgment becomes visible. A shoot decision becomes a carousel proving you're a professional with craft, not someone with a camera. A hook names a client's real business problem rather than aesthetics, reaching buyers instead of photographers. Your client-education content builds trust before the shoot. Your empathy about camera anxiety dissolves the fear that stops people booking. Because you batch a week in one session, your visibility holds through busy seasons — so bookings keep arriving instead of drying up.",
    time_to_first_post:
      "About 20 minutes including onboarding — most photographers turn one shoot decision into a first carousel the same day.",
    quick_wins: [
      "Your first craft carousel that shows the judgment justifying your rate.",
      "A client-focused post that finally reaches buyers instead of other photographers.",
      "Your first booking from a nervous professional who says your content made them feel comfortable choosing you.",
    ],
  },
  "videographers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define your video niche and the client who needs it",
        description:
          "Videography is competitive, so specialize: brand films, corporate storytelling, event coverage, product video, documentary. Choose your niche and ideal client, then anchor your content there. On LinkedIn especially, businesses needing brand and corporate video are abundant and have real budgets — an underserved market compared to the crowded consumer and wedding space where most videographers fight over price.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your video niche, so your feed attracts the business clients with real budgets.",
      },
      {
        step_number: 2,
        title: "Show the strategy behind the production",
        description:
          "Clients see the finished film but never the thinking — the story structure, the interview technique that got a real answer, the choice that made the message land. Keep a note of these decisions. Showing your strategic thinking proves you're a storyteller who understands communication objectives, not a camera operator, which is exactly what separates a premium videographer from a commodity one.",
        time_required: "10 min per project",
        carouselabs_tip:
          "CarouseLabs turns a production decision into a strategy carousel, so your storytelling thinking becomes the visible thing clients pay for.",
      },
      {
        step_number: 3,
        title: "Write hooks about why video succeeds or fails",
        description:
          "Video hooks land when they address a business outcome: 'Your brand video failed because it was about you. Here's the fix.' Leading with why video works or doesn't speaks to businesses who've been burned by expensive videos nobody watched. This positions you as the videographer who understands communication and results, not just production — which is what a burned client is desperately looking for.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks about why video succeeds or fails, so your posts reach businesses burned by videos nobody watched.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches video strategy",
        description:
          "Structure a carousel around one strategic idea: how to plan a brand film that works, what makes an interview compelling, why most corporate video fails. Walk through the problem, the common mistake, your approach, the steps, and the outcome. Teaching video strategy demonstrates that you think about communication objectives, proving you're a partner in making video that works rather than a vendor who films things.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full strategy carousel from your notes, so your expertise proves you think about outcomes, not just production.",
      },
      {
        step_number: 5,
        title: "Speak to the ROI anxiety businesses have about video",
        description:
          "Video is expensive and businesses fear wasting the budget, so content addressing that anxiety — how to know if video is right, how to measure it, how to avoid the common expensive mistakes — speaks directly to their hesitation. Being the videographer who's honest about when video works and when it doesn't builds enormous trust and attracts the clients who want a partner rather than someone who'll take their money regardless.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you address video ROI anxiety honestly, so your feed builds trust with businesses afraid of wasting budget.",
      },
      {
        step_number: 6,
        title: "Stay visible through production-heavy periods",
        description:
          "Production consumes you completely — shoots, edits, deadlines — so marketing vanishes during projects and you scramble after. Batch a week of posts in one session so your visibility holds through production crunches. Consistent presence means your next project is lined up before the current one wraps, smoothing the feast-or-famine cycle that project-based video work otherwise guarantees.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your visibility holds through production crunches instead of vanishing during them.",
      },
      {
        step_number: 7,
        title: "Let your feed demonstrate your visual craft",
        description:
          "You're a visual storyteller, so your feed is judged as a direct sample of your craft. A polished, consistent, beautifully composed visual identity proves the aesthetic and narrative judgment clients pay for. Lock in your template once so every strategy and craft carousel looks the part. For a videographer, visual excellence in your own content is the most direct evidence that you'll deliver it for them.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel visually crafted, so your feed proves the judgment clients are paying for.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, videographers competed on day rate because clients couldn't distinguish strategic storytelling from camera operation. Your thinking — the story structure, the interview craft, the choices that made a message land — stayed invisible behind finished films. Production waves meant marketing vanished during projects and panicked after. Meanwhile businesses burned by expensive videos nobody watched had no way to find the videographer who actually understood communication, so they kept hiring on price and getting the same disappointing result.",
    after_carouselabs:
      "With CarouseLabs, your strategic thinking becomes the visible thing clients pay for. A production decision becomes a carousel proving you're a storyteller, not a camera operator. A hook about why video fails reaches businesses burned by expensive films nobody watched. Your honesty about video ROI builds trust with budget-anxious buyers. Because you batch a week in one session, your visibility holds through production crunches — so your next project is lined up before the current one wraps.",
    time_to_first_post:
      "About 20 minutes including onboarding — most videographers turn one production decision into a first carousel the same day.",
    quick_wins: [
      "Your first strategy carousel that proves you're a storyteller, not a camera operator.",
      "A post that reaches businesses burned by video and looking for someone who understands outcomes.",
      "Your next project lined up before the current one wraps, smoothing the feast-or-famine cycle.",
    ],
  },
  "podcast-producers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define the podcast problem you solve",
        description:
          "Podcast production spans audio engineering, show strategy, guest booking, growth, and full-service management — so pick your focus and the client you serve. Anchor your content there. Because most podcasts fail from strategy problems rather than audio problems, a producer who's clear about solving the growth and positioning side commands far higher fees than one positioned as an editor with a noise gate.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your production specialty, so your feed attracts clients who value strategy, not just editing.",
      },
      {
        step_number: 2,
        title: "Turn your production insight into content",
        description:
          "You know why podcasts succeed and fail — the intro that loses listeners, the structure that keeps them, the reason most shows die at episode seven. Keep a note of these insights. Sharing real production knowledge is enormously valuable to the many people launching podcasts badly, and it proves you understand the medium strategically rather than just technically, which is what justifies premium production fees.",
        time_required: "10 min per insight",
        carouselabs_tip:
          "CarouseLabs turns a production insight into a carousel, so your strategic understanding of podcasting becomes visible expertise.",
      },
      {
        step_number: 3,
        title: "Write hooks about why podcasts fail",
        description:
          "Podcast hooks land when they name the real cause of failure: 'Your podcast doesn't have a growth problem. Your first 30 seconds have a retention problem.' Naming the specific, fixable reason shows expertise and speaks to the frustrated host wondering why nobody listens. Because so many podcasts struggle, a producer who diagnoses precisely becomes instantly credible to exactly the people who need to hire one.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that precisely diagnose why podcasts fail, so your posts reach frustrated hosts who need exactly your help.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a real production method",
        description:
          "Structure a carousel around one method: how to structure an episode for retention, how to book great guests, how to grow beyond your existing network. Walk through the problem, the common mistake, your method, the steps, and the result. Teaching genuine production strategy proves your expertise and helps hosts immediately — and a host who improves using your free advice wants you running their show properly.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full production-method carousel from your notes, so your expertise becomes value that converts frustrated hosts into clients.",
      },
      {
        step_number: 5,
        title: "Make the case for production as strategy, not editing",
        description:
          "Most people think a producer is someone who cleans up audio, which caps your rates. Content that reframes production as show strategy — positioning, structure, growth, guest curation — elevates the entire perception of your role. Being the voice who articulates what production actually is attracts clients who understand they need a partner, not a freelancer with editing software.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you reframe production as strategy in your content, so your feed attracts partners rather than editing gigs.",
      },
      {
        step_number: 6,
        title: "Stay visible through production cycles",
        description:
          "Show production is relentless and weekly, so your own marketing disappears under client deadlines. Batch a week of posts in one session so your visibility holds regardless of episode schedules. Consistent presence keeps you top of mind for the moment a host decides their show needs real help — usually triggered by frustration at flat downloads, which happens unpredictably.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your visibility holds through relentless weekly production schedules.",
      },
      {
        step_number: 7,
        title: "Present with polished, production-quality visuals",
        description:
          "You sell production quality, so a scrappy feed contradicts your value proposition. A polished, consistent visual identity signals the production standards you'd bring to a client's show. Lock in your template once so every insight and method carousel carries the same craft. For a producer, visible quality in your own content is direct evidence of the standards you'd apply to their podcast.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel polished, so your feed signals the production standards you'd bring to a client's show.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, podcast producers were perceived as audio cleanup and paid accordingly. Your genuine strategic understanding — why shows retain listeners, why most die at episode seven, what actually grows a podcast — stayed invisible while you were buried under weekly client deadlines. Frustrated hosts with failing shows had no way to find the producer who could actually diagnose their problem, so they kept hiring editors and staying stuck. Your strategic value was real; the market saw a technician.",
    after_carouselabs:
      "With CarouseLabs, your strategic value becomes visible. A production insight becomes a carousel proving you understand the medium, not just the software. A precise diagnostic hook reaches the frustrated host wondering why nobody listens. Your method converts that host into a client. Your reframing of production as strategy elevates your whole role and your rates. Because you batch a week in one session, your visibility holds through relentless weekly schedules — so you're there when a host finally decides their show needs real help.",
    time_to_first_post:
      "About 20 minutes including onboarding — most producers turn one production insight into a first carousel the same day.",
    quick_wins: [
      "Your first insight carousel that proves you're a strategist, not an audio technician.",
      "A diagnostic post that reaches a frustrated host wondering why their show isn't growing.",
      "Your first client who hires you as a strategic partner rather than an editing gig.",
    ],
  },
  "podcasters": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Use LinkedIn to reach listeners your feed never will",
        description:
          "Podcast discovery is famously broken — the platforms barely help you grow, so your audience comes from outside them. Decide the topic and audience your show serves, and use your content to reach exactly those people where they actually are. For a B2B or professional podcast especially, LinkedIn is where your ideal listeners spend their working hours, making it a far better growth engine than the podcast apps themselves.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your show's topic and audience, so your feed becomes the growth engine podcast apps never provide.",
      },
      {
        step_number: 2,
        title: "Turn every episode into multiple posts",
        description:
          "Each episode contains a dozen shareable insights that die the moment the episode drops. Keep a note of the best moments, arguments, and guest insights from every recording. Repurposing them into standalone posts gives your ideas a life beyond the episode and reaches the enormous audience who'd never press play but will read a carousel — and some of them become listeners.",
        time_required: "10 min per episode",
        carouselabs_tip:
          "CarouseLabs turns one episode's best insights into multiple carousels, so every recording works far harder than a single podcast drop.",
      },
      {
        step_number: 3,
        title: "Write hooks that stand alone without the episode",
        description:
          "The mistake is posting 'new episode out now' — nobody cares. The hooks that work deliver the value directly: 'My guest spent 10 years studying burnout. Here's the one thing he says everyone misses.' Leading with the insight rather than the announcement earns attention from people who've never heard of your show, and the episode becomes something they want rather than something you're pushing.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that deliver an episode's value directly, so your posts earn attention instead of announcing to nobody.",
      },
      {
        step_number: 4,
        title: "Build a carousel from an episode's core argument",
        description:
          "Structure a carousel around one episode's central insight: the argument, the evidence, the counterintuitive turn, the implication. Walk through it so it stands completely alone — a reader should get real value without ever pressing play. Counterintuitively, giving the full value away drives listens, because someone who learns something great from your carousel wants the whole conversation, and they now know your show is worth their time.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full carousel from an episode's core argument, so your ideas stand alone and pull listeners toward the show.",
      },
      {
        step_number: 5,
        title: "Leverage your guests' audiences",
        description:
          "Every guest has a network, and a post that genuinely celebrates their insight is something they'll happily share — putting your show in front of their entire audience. Create content that highlights what your guest said brilliantly rather than promoting your show. This generosity turns each episode into a reach opportunity through your guest's network, which is the most effective podcast growth channel that exists.",
        time_required: "10 min per guest",
        carouselabs_tip:
          "CarouseLabs helps you shape guest-celebrating posts, so each episode reaches your guest's whole network — podcasting's best growth channel.",
      },
      {
        step_number: 6,
        title: "Stay consistent between episodes, not just at drops",
        description:
          "Posting only when an episode drops means your audience hears from you once a week at best, and only when you want something. Batch a week of posts in one session so you're consistently delivering value between drops. This keeps your show top of mind and builds an audience relationship that makes each new episode land with people who are actually waiting for it.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so you deliver value between episodes instead of only appearing when you want a listen.",
      },
      {
        step_number: 7,
        title: "Build a recognizable show identity",
        description:
          "Podcast growth depends on recognition — people need to see your show's identity repeatedly before they try it. A consistent, distinctive visual identity across every carousel builds that familiarity fast. Lock in your template once so every episode-insight carousel reinforces your show's brand. For a podcaster fighting broken discovery, visual recognition in a feed people actually scroll is a genuine growth advantage.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel on-brand, so your show builds recognition in a feed people actually scroll.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, podcasters poured hours into episodes that vanished into broken discovery. You'd record something genuinely great, post 'new episode out now,' and watch it reach nobody — because podcast platforms don't grow shows and announcement posts don't earn attention. The dozen brilliant insights inside each episode died the moment it dropped, never reaching the enormous audience who'd have loved the ideas but would never press play. Your show was good; almost nobody found out.",
    after_carouselabs:
      "With CarouseLabs, every episode works far harder. One recording becomes multiple carousels that reach people who'd never press play. Hooks deliver the insight directly instead of announcing to nobody. Your episode's core argument becomes a carousel that stands alone — and pulls listeners in precisely because it gave value first. Guest-celebrating posts put your show in front of their whole network. Because you batch a week in one session, you're valuable between drops, so each new episode lands with an audience that's actually waiting.",
    time_to_first_post:
      "About 15 minutes from signup — appropriately fast for someone who already creates content weekly.",
    quick_wins: [
      "Your first episode-insight carousel that reaches people who'd never have pressed play.",
      "A guest-celebrating post that puts your show in front of their entire network.",
      "Your first listener who says they found the show through a carousel, not a podcast app.",
    ],
  },
  "authors": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Build the platform publishers and readers both require",
        description:
          "Publishing runs on platform — agents and publishers evaluate your audience before your manuscript, and self-published authors live or die by reach. Decide the ideas your work explores and start building an audience around them now, ideally long before the book exists. Authors with a platform get deals and sell copies; authors without one write into silence regardless of how good the book is.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your book's ideas, so every post builds the platform publishers and sales both depend on.",
      },
      {
        step_number: 2,
        title: "Share the ideas, not just the book",
        description:
          "Authors make the mistake of only posting 'buy my book.' Your ideas are what people connect with — the arguments, insights, and stories that make your book worth reading. Keep a note of the concepts from your work worth sharing standalone. When readers fall in love with your thinking through free content, buying the book is a natural next step rather than a request they'll ignore.",
        time_required: "10 min per idea",
        carouselabs_tip:
          "CarouseLabs turns one of your book's ideas into a standalone carousel, so readers connect with your thinking rather than your sales pitch.",
      },
      {
        step_number: 3,
        title: "Write hooks that make your ideas irresistible",
        description:
          "As an author, your hooks are a demonstration of your writing — if the first line doesn't grab, why would a reader trust 300 pages? Craft hooks that prove your voice and promise a genuine idea: 'The most dangerous advice in business is the one everyone repeats.' Because you're selling your ability to hold attention across a whole book, every hook is a live sample of exactly that skill.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates strong hook options, so every post demonstrates the attention-holding writing skill your book depends on.",
      },
      {
        step_number: 4,
        title: "Build a carousel around one complete idea",
        description:
          "Structure a carousel around a single argument from your work: the premise, the conventional view, your counterpoint, the evidence, and the implication. Give away the idea completely. Authors fear this cannibalizes sales, but it's the opposite — a reader who finds one of your ideas genuinely valuable concludes there must be more where that came from, which is exactly what makes someone buy a book.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full idea carousel from your work — and its own writing quality proves the voice readers would buy.",
      },
      {
        step_number: 5,
        title: "Share the writing life honestly",
        description:
          "Readers connect with authors as people, and the honest reality of writing — the doubt, the rejection, the messy process, the chapter you cut — is compelling content that builds genuine relationship. This humanity turns readers into fans who follow you across books, which is the durable asset an author needs. A following that loves you, not just one book, is what makes a second and third book viable.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs mixes honest writing-life angles into your idea feed, so readers connect with you as a person, not just a product.",
      },
      {
        step_number: 6,
        title: "Post consistently between books, not just at launch",
        description:
          "The classic author mistake is going silent for two years then shouting at launch. Batch a week of posts in one session so you're consistently sharing ideas regardless of where you are in the writing cycle. An audience that's been reading your thinking for months buys on day one; one that only hears from you during a launch has already forgotten you. Consistency between books is what makes launches work.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so you keep sharing ideas between books instead of shouting only at launch.",
      },
      {
        step_number: 7,
        title: "Let your feed reflect your book's identity",
        description:
          "A consistent visual identity that echoes your book's tone builds recognition and makes your ideas memorable. Lock in your template once so every idea carousel reinforces your authorial brand. For an author, a coherent, well-crafted feed signals the care and quality readers can expect between the covers — and it makes your growing body of ideas feel like a body of work rather than scattered posts.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel on-brand, so your posts feel like a body of work rather than scattered ideas.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, authors wrote into silence. Publishers wanted a platform you didn't have time to build, because writing the book consumed everything. Then launch week arrived and you shouted 'buy my book' at an audience that barely knew you, watching sales flatline within days. The ideas inside your work — the very things readers would have fallen in love with — stayed locked between covers nobody had a reason to open. Your writing was good; the platform that would have let people discover it never got built.",
    after_carouselabs:
      "With CarouseLabs, your ideas build the platform your book needs. An argument from your work becomes a standalone carousel readers connect with. Every hook demonstrates the voice that makes your writing worth 300 pages. Giving an idea away completely makes readers conclude there's more where that came from — which is what actually sells books. Your honest writing-life posts turn readers into fans who follow you across books. Because you batch a week in one session, you're present between books, so launches land with an audience already waiting.",
    time_to_first_post:
      "About 15 minutes from signup — appropriately fast for a professional writer.",
    quick_wins: [
      "Your first idea carousel that makes readers fall in love with your thinking, not your pitch.",
      "A consistent presence between books that turns your next launch into a warm sell.",
      "Your first reader who says they bought the book because one of your posts stayed with them.",
    ],
  },
  "speakers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Make your signature idea unmistakable",
        description:
          "Event organizers book speakers with a clear, distinctive message — not generalists. Decide the one idea you're the authority on and anchor everything to it. Your content should hammer that idea from different angles until you're synonymous with it. Organizers searching for someone to speak on that topic should find you immediately, because being the obvious choice for a specific idea is the entire mechanism of getting booked.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content anchored to your signature idea, so you become synonymous with the topic organizers book you for.",
      },
      {
        step_number: 2,
        title: "Turn your keynote content into posts",
        description:
          "Your talk contains stories, frameworks, and insights that sit unused between bookings. Keep a note of these and share them as standalone content. This does double duty: it proves to organizers that you have genuine substance rather than a slick delivery, and it spreads your ideas so audiences arrive already familiar with your work — which makes you a more attractive booking.",
        time_required: "10 min per idea",
        carouselabs_tip:
          "CarouseLabs turns a keynote story or framework into a carousel, so your talk's substance works between bookings rather than sitting idle.",
      },
      {
        step_number: 3,
        title: "Write hooks that prove you can hold a room",
        description:
          "Your hooks demonstrate the exact skill organizers are buying — the ability to grab and hold attention. Craft hooks that prove it: 'I've watched 200 audiences check out at the same moment in every talk. Here's when.' A hook that stops a scroll is a live audition for a speaker's core competency, and organizers evaluating you will notice whether you can actually command attention or just claim to.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates attention-commanding hooks, so every post auditions the core skill organizers are booking you for.",
      },
      {
        step_number: 4,
        title: "Build a carousel around one of your frameworks",
        description:
          "Structure a carousel around a framework from your talk: the problem, the conventional approach, your model, how to apply it, and the outcome. Giving away your framework doesn't reduce your booking value — it proves you have genuine intellectual substance, which is exactly what separates a speaker worth a fee from someone with a nice story. Organizers book substance they can verify.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full framework carousel from your talk, so organizers can verify the substance behind your keynote.",
      },
      {
        step_number: 5,
        title: "Share proof you deliver on stage",
        description:
          "Organizers are risk-averse — a bad speaker ruins their event — so evidence you deliver is crucial. Share content about talks you've given, audience reactions, the impact your message had. This reduces the perceived risk of booking you, which is the main barrier between you and a fee. Being visibly, verifiably good on stage is what turns an interested organizer into a confirmed booking.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape speaking proof into posts, so organizers can see you deliver before they take the risk of booking you.",
      },
      {
        step_number: 6,
        title: "Stay visible between speaking seasons",
        description:
          "Speaking is seasonal and lumpy, and going quiet between gigs means organizers planning next year's events don't find you. Batch a week of posts in one session so your visibility holds year-round. Organizers plan far ahead and search when you're not thinking about it, so consistent presence is what puts you in front of the person building next season's lineup — months before you'd have thought to pitch.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so you stay visible to organizers planning events months before you'd think to pitch.",
      },
      {
        step_number: 7,
        title: "Look like a professional worth a speaking fee",
        description:
          "Organizers judge your professionalism from your feed before they ever email you. A polished, consistent, confident visual identity signals that you're a serious professional who'll represent their event well. Lock in your template once so every framework and proof carousel carries that polish. For a speaker, looking the part in your own content is a direct signal that you'll look the part on their stage.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel polished and confident, so organizers see a professional worth their stage.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, speakers waited for the phone to ring. Your signature idea, your frameworks, the stories that landed brilliantly on stage — all of it sat unused between bookings, invisible to the organizers planning next season's events. You went quiet between gigs, which is exactly when organizers were searching. Without visible substance or proof you could deliver, you were a risk they wouldn't take, so bookings went to speakers who were merely more findable. Your message was strong; nobody was hearing it between stages.",
    after_carouselabs:
      "With CarouseLabs, your ideas work between bookings. A keynote framework becomes a carousel that lets organizers verify your substance. Every hook auditions your ability to command attention — the core skill they're buying. Your speaking proof reduces the risk that stops them booking. Because you batch a week in one session, you stay visible year-round to organizers planning months ahead. Instead of waiting for the phone, you become the obvious, verifiable choice for your signature topic.",
    time_to_first_post:
      "About 20 minutes including onboarding — most speakers turn one keynote framework into a first carousel the same day.",
    quick_wins: [
      "Your first framework carousel that lets organizers verify the substance behind your keynote.",
      "Year-round visibility that reaches organizers planning next season while you'd have been silent.",
      "Your first inbound speaking enquiry from an organizer who found you rather than the other way round.",
    ],
  },
  "newsletter-writers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Use LinkedIn as your subscriber acquisition engine",
        description:
          "Newsletters don't grow themselves — email has no discovery mechanism, so every subscriber comes from somewhere else. Decide your newsletter's topic and audience, then use your content to reach exactly those people. For professional and B2B newsletters, LinkedIn is the highest-quality subscriber source available, because your ideal readers are already there and already reading.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your newsletter's topic, so your feed becomes the subscriber engine email itself can't provide.",
      },
      {
        step_number: 2,
        title: "Repurpose every issue into standalone posts",
        description:
          "Each issue contains ideas that reach only your current subscribers and then die. Keep a note of the best insights from every edition and turn them into posts that reach far beyond your list. This gives your writing a second life in front of people who've never subscribed — and the ones who love the excerpt subscribe for the rest, which is exactly how newsletters compound.",
        time_required: "10 min per issue",
        carouselabs_tip:
          "CarouseLabs turns one issue's best insights into carousels, so every edition reaches far beyond your existing subscriber list.",
      },
      {
        step_number: 3,
        title: "Write hooks that prove your writing is worth an inbox slot",
        description:
          "Asking for someone's email is asking for real trust — inboxes are sacred. Your hooks must demonstrate that your writing justifies that: sharp, distinctive, valuable. A hook that makes someone think 'this person writes well' is what converts a scroller into a subscriber. Because you're selling your voice, every hook is a direct sample of exactly what they'd be signing up to receive.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates sharp, distinctive hooks, so every post proves your writing deserves the inbox slot you're asking for.",
      },
      {
        step_number: 4,
        title: "Build a carousel from one issue's core idea",
        description:
          "Structure a carousel around a single idea from an issue: the observation, the conventional view, your take, the evidence, and the implication. Give the full value. A reader who gets something genuinely useful for free concludes your newsletter must be worth subscribing to — whereas a teaser that withholds value just feels like a bait-and-switch and converts nobody.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full carousel from an issue's core idea, so free value proves your newsletter's worth rather than teasing it.",
      },
      {
        step_number: 5,
        title: "Show your distinct voice and perspective",
        description:
          "Newsletters live and die on voice — people subscribe to a person, not a topic. Let your personality, opinions, and perspective come through clearly rather than writing neutral content. The reader who resonates with your specific voice is the one who'll actually open every issue for years. Being distinctly yourself filters correctly: fewer subscribers, but the right ones who genuinely care.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs drafts in your voice rather than generic neutrality, so your posts attract subscribers who resonate with you specifically.",
      },
      {
        step_number: 6,
        title: "Post consistently to grow between issues",
        description:
          "Writing a newsletter is already demanding, so promotion gets neglected — and then growth stalls. Batch a week of posts in one session so subscriber acquisition runs continuously rather than only on send day. Consistent presence means your list grows steadily in the background while you focus on writing, which is what turns a newsletter from a hobby into an audience worth monetizing.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so subscriber growth runs continuously instead of only on send day.",
      },
      {
        step_number: 7,
        title: "Build a recognizable newsletter identity",
        description:
          "Subscribers need to see your identity repeatedly before they trust you with their inbox. A consistent, distinctive visual identity across every carousel builds that familiarity. Lock in your template once so every idea carousel reinforces your newsletter's brand. For a writer fighting for inbox trust, visual recognition in the feed is what makes your subscribe prompt feel like a natural step rather than a request from a stranger.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel on-brand, so your newsletter builds the recognition that earns inbox trust.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, newsletter writers poured hours into issues that reached only the subscribers they already had — and email offers no discovery, so growth flatlined. Writing consumed everything, leaving nothing for the promotion that would actually build the list. Your best ideas died inside issues that never reached anyone new. Meanwhile the writers who'd figured out audience-building grew steadily, and your genuinely better writing stayed trapped in front of a list that never expanded.",
    after_carouselabs:
      "With CarouseLabs, your list finally grows. One issue's best insights become carousels that reach far beyond your current subscribers. Every hook proves your writing deserves an inbox slot. Giving an idea's full value away converts scrollers into subscribers who trust your writing. Your distinct voice attracts the readers who'll open every issue for years. Because you batch a week in one session, subscriber growth runs continuously in the background while you focus on writing.",
    time_to_first_post:
      "About 15 minutes from signup — appropriately fast for a professional writer.",
    quick_wins: [
      "Your first carousel that takes an issue's best idea to people who've never heard of your newsletter.",
      "Continuous subscriber growth running in the background while you focus on writing.",
      "Your first batch of subscribers who found you through the feed rather than a referral.",
    ],
  },
  "journalists": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Build the personal brand that outlasts any masthead",
        description:
          "Media is brutally unstable — outlets fold, layoffs come without warning — so the journalists who thrive own an audience that follows them, not their employer. Decide your beat and the expertise you're building, then make it visible. A journalist with a personal following has leverage, options, and a foundation for independence; one whose identity is tied to a masthead is one restructuring away from starting over.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content anchored to your beat, so you build an audience that follows you rather than your employer.",
      },
      {
        step_number: 2,
        title: "Give your reporting a second life",
        description:
          "Your stories are read once and buried under the next news cycle, despite the enormous reporting effort behind them. Keep a note of the key findings and context from your work, and turn them into standalone posts. This extends the reach and life of reporting you've already done, getting your journalism in front of people who'd never have found the original piece — which is both good for the story and good for you.",
        time_required: "10 min per story",
        carouselabs_tip:
          "CarouseLabs turns your reporting into a carousel, so stories that would be buried by the next cycle reach a whole new audience.",
      },
      {
        step_number: 3,
        title: "Write hooks that deliver the story's substance",
        description:
          "The mistake is posting a headline and a link — that's an announcement, not a hook. The hooks that work deliver the finding itself: 'We spent six months on this. The documents show the opposite of what they told the public.' Leading with the substance earns attention from people who'd never click a link, and paradoxically drives far more readers to the full piece than a bare link ever would.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that lead with your reporting's substance, so your work earns attention instead of being scrolled past as a link.",
      },
      {
        step_number: 4,
        title: "Build a carousel that explains the story clearly",
        description:
          "Structure a carousel around one story: what people believe, what you found, the evidence, and why it matters. Walk through it so it stands alone. Complex investigations often fail to land because they're hard to grasp quickly — a carousel that makes your reporting immediately legible gets it understood and shared by people who'd never read 3,000 words, dramatically extending its impact.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full explainer carousel from your reporting, so complex investigations become immediately legible and shareable.",
      },
      {
        step_number: 5,
        title: "Show the craft and rigor behind the work",
        description:
          "Public trust in journalism is low, partly because the work is invisible — people see the output, not the verification. Sharing how a story came together, how you verified claims, why you didn't publish something, demystifies the craft and rebuilds trust. Being the journalist who shows their working is both a public good and a powerful way to build an audience that genuinely trusts your reporting.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape behind-the-craft content, so your rigor becomes visible and rebuilds trust in the work.",
      },
      {
        step_number: 6,
        title: "Stay visible through relentless news cycles",
        description:
          "Deadlines are constant and personal brand-building is always the thing that slips. Batch a week of posts in one session so your audience keeps growing regardless of the news cycle. That audience is your career insurance — it's what makes you hireable, gives you leverage in negotiations, and makes independence viable if the masthead disappears. Consistency compounds into genuine security in an insecure industry.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your audience — your career insurance — keeps growing through relentless news cycles.",
      },
      {
        step_number: 7,
        title: "Present with clean, credible, non-sensational visuals",
        description:
          "Journalism's credibility depends on not looking like clickbait. A clean, professional, restrained visual identity signals rigor and seriousness. Lock in your template once so every reporting carousel carries the same credible polish, letting the substance lead. In a feed where the most sensational visuals often carry the worst information, looking measured and rigorous is itself a signal to readers who care about accuracy.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clean and credible, so your reporting reads as rigorous rather than sensational.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, journalists did months of rigorous reporting that got read once and buried by the next cycle. Deadlines left no room to build a personal audience, so your professional identity stayed tied to a masthead in an industry where mastheads fold and layoffs arrive without warning. Your best investigations failed to land because complex work is hard to grasp from a headline and link. And when restructuring came, you'd start from zero — with no audience of your own to fall back on.",
    after_carouselabs:
      "With CarouseLabs, your reporting gets a second life and you build an audience that's yours. A story becomes a carousel that reaches people who'd never find the original. Hooks lead with substance rather than a bare link, driving far more readers to the full piece. A complex investigation becomes immediately legible and shareable. Your behind-the-craft content rebuilds trust in the work. Because you batch a week in one session, your audience keeps growing through relentless cycles — becoming genuine career insurance in an insecure industry.",
    time_to_first_post:
      "About 15 minutes from signup — appropriately fast for a professional writer.",
    quick_wins: [
      "Your first carousel that takes a buried story to a whole new audience.",
      "An audience that follows you rather than your masthead — career insurance in an unstable industry.",
      "Your first reader who says your carousel made a complex investigation finally make sense.",
    ],
  },
  "animators": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define your animation niche and ideal client",
        description:
          "Animation spans explainer video, motion graphics, character work, brand animation, and more — so pick your niche and the client who needs it. Anchor your content there. On LinkedIn especially, businesses needing explainer and brand animation have real budgets and are underserved, unlike the crowded entertainment-animation space where most animators compete. A clear specialty commands premium rates.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your animation niche, so your feed attracts the business clients with real budgets.",
      },
      {
        step_number: 2,
        title: "Show the thinking behind the motion",
        description:
          "Clients see finished animation but never the craft decisions — the timing that made it feel alive, the storytelling structure, the choice that made a complex idea clear. Keep a note of these. Showing your reasoning proves you're a communicator and craftsperson rather than someone who moves shapes, which is exactly what justifies premium rates over cheap template animation.",
        time_required: "10 min per project",
        carouselabs_tip:
          "CarouseLabs turns an animation decision into a craft carousel, so your storytelling thinking becomes the visible thing clients pay for.",
      },
      {
        step_number: 3,
        title: "Write hooks about what animation actually achieves",
        description:
          "Animation hooks land when they connect craft to business outcomes: 'Your explainer video isn't working because it explains. Great animation makes people feel the problem first.' Leading with why animation succeeds or fails speaks to businesses who've paid for animation nobody watched. This positions you as someone who understands communication, not just software — which is what a burned client wants.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks connecting animation to business outcomes, so your posts reach businesses burned by animation that didn't work.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches an animation principle",
        description:
          "Structure a carousel around one principle: how timing creates emotion, why most explainers fail, how to make a complex idea visual. Walk through the problem, the common mistake, your principle, the application, and the result. Teaching animation craft proves your expertise, and — because you're a visual professional — the carousel's own execution demonstrates your ability in the very act of explaining it.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full principle carousel from your craft — and its own visual execution demonstrates the skill you're teaching.",
      },
      {
        step_number: 5,
        title: "Connect animation to communication outcomes",
        description:
          "Clients don't buy motion — they buy comprehension, engagement, and persuasion. Content that connects animation decisions to those outcomes elevates you from a production cost to a communication partner. Being the animator who talks about why animation drives understanding is what justifies premium rates and attracts clients who realize animation is where a complex message succeeds or fails.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you connect animation craft to communication outcomes, so your feed positions you as a partner, not a production cost.",
      },
      {
        step_number: 6,
        title: "Post consistently despite project-driven waves",
        description:
          "Animation projects consume you entirely — long production cycles with brutal deadlines — so marketing vanishes during them and you scramble after. Batch a week of posts in one session so your visibility holds through production. Consistent presence means your next project is lined up before the current one wraps, smoothing the feast-or-famine cycle that project-based creative work otherwise guarantees.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your visibility holds through long production cycles instead of vanishing during them.",
      },
      {
        step_number: 7,
        title: "Let your feed prove your visual craft",
        description:
          "You're a visual craftsperson, so your feed is judged directly as a sample of your ability. A polished, beautifully designed, consistent visual identity is itself a portfolio piece. Lock in your template once so every craft and principle carousel exemplifies your eye. For an animator, visual excellence in your own content is the most direct evidence of the aesthetic judgment clients are paying for.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel visually beautiful, so your feed proves the craft clients are paying for.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, animators competed on price because clients couldn't tell craft from template work. Your storytelling thinking — the timing, the structure, the choices that made complex ideas land — stayed invisible behind finished renders. Long production cycles meant marketing vanished for months at a time, then you scrambled for the next project. Meanwhile businesses who'd paid for explainer videos nobody watched had no way to find the animator who actually understood communication.",
    after_carouselabs:
      "With CarouseLabs, your craft thinking becomes the visible thing clients pay for. An animation decision becomes a carousel proving you're a communicator, not a shape-mover. A hook about why animation fails reaches businesses burned by videos nobody watched. Your principle becomes a carousel whose own execution demonstrates your skill. Connecting craft to communication outcomes justifies premium rates. Because you batch a week in one session, your visibility holds through long production cycles — so your next project is lined up before the current one wraps.",
    time_to_first_post:
      "About 20 minutes including onboarding — most animators turn one craft decision into a first carousel the same day.",
    quick_wins: [
      "Your first craft carousel that proves you're a communicator, not just someone who moves shapes.",
      "A visually beautiful feed that demonstrates the eye clients are paying premium rates for.",
      "Your next project lined up before the current one wraps, smoothing the feast-or-famine cycle.",
    ],
  },
  "real-estate-agents": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Pick your farm area and commit to owning it online",
        description:
          "You can't be the trusted name everywhere, so choose one neighborhood, town, or zip code and decide that's the area you'll dominate on LinkedIn. Every piece of content ties back to it. This focus is what separates you from the hundred other agents posting generic listings — buyers and sellers hire the agent who clearly knows their specific streets, schools, and price trends. Write your farm area at the top of your content note and filter every idea through the question: 'Does this make me look like the local expert here?'",
        time_required: "20 min, once",
        carouselabs_tip:
          "Tell CarouseLabs your farm area and it keeps your idea feed anchored to local, area-specific angles instead of generic real-estate tips.",
      },
      {
        step_number: 2,
        title: "Turn last month's market data into a plain-English story",
        description:
          "The MLS numbers you already pull are content gold — but only if you translate them. Nobody wants a spreadsheet; they want to know what it means for them. Take one real stat from your area last month (median days on market, sale-to-list ratio, inventory) and write the human version: 'Homes in [neighborhood] are selling 11 days faster than in spring — here's what that means if you're thinking of listing.' This positions you as the agent who reads the market, not just lists in it.",
        time_required: "15 min",
        carouselabs_tip:
          "Drop your local stat into CarouseLabs and it drafts a caption that turns the number into a clear takeaway for buyers or sellers, no jargon.",
      },
      {
        step_number: 3,
        title: "Answer the questions clients ask you privately, in public",
        description:
          "Every showing and closing surfaces the same questions: 'Is the highest offer always best?' 'Why is Zillow's estimate wrong?' 'What cheap fixes actually add value?' Those private questions are your public content pipeline — because if one client is asking, hundreds of silent scrollers are wondering the same thing. Keep a note of every question you get asked this week and turn each into a post. This is the content that makes strangers feel you've already advised them before they ever call.",
        time_required: "10 min per question",
        carouselabs_tip:
          "CarouseLabs generates buyer- and seller-tip angles daily, so on weeks with fewer client questions your idea feed still stays full.",
      },
      {
        step_number: 4,
        title: "Move past 'just listed / just sold' to real value",
        description:
          "Listing announcements only matter to people already selling — a tiny slice of your feed. To build trust with the much larger group who'll buy or sell someday, lead with value: the staging change that made buyers fall in love at the door, the three cheap fixes that add the most before listing, the closing cost first-timers never see coming. You can still feature the listing, but wrap it in a lesson. The lesson is what earns the follow; the listing is what they remember when they're finally ready.",
        time_required: "15 min",
        carouselabs_tip:
          "CarouseLabs reframes a listing or sale into a teaching carousel — the home-prep breakdown or negotiation lesson behind it — instead of a generic 'just sold' post.",
      },
      {
        step_number: 5,
        title: "Build a neighborhood-spotlight carousel that shows you live there",
        description:
          "A carousel touring the neighborhood everyone's sleeping on — with the data behind why it's undervalued — does two jobs at once: it proves your local expertise and it's endlessly shareable by residents who love where they live. Structure it as Slide 1 a hook ('The most underrated neighborhood in [town], by the numbers'), then the price trend, the commute, the schools, one hidden gem, and a close inviting people to ask about it. This is the content that gets forwarded in local group chats — the warmest lead source there is.",
        time_required: "25 min",
        carouselabs_tip:
          "CarouseLabs builds the full neighborhood-spotlight carousel from your notes and matches your branding, so it looks polished enough to be shared by locals.",
      },
      {
        step_number: 6,
        title: "Keep the pipeline warm between transactions with a posting rhythm",
        description:
          "The classic agent trap is going quiet between deals — right when you most need the next one incubating. Leads have a long fuzzy timeline; the sellers who'll list in eight months are watching you now. Commit to a steady rhythm (two or three posts a week) regardless of how busy your current transactions are, because consistency is what keeps you top-of-mind for a decision people make slowly. Pick fixed days and protect them the way you'd protect a closing appointment.",
        time_required: "5 min to post, per slot",
        carouselabs_tip:
          "Because CarouseLabs lets you batch multiple carousels at once, your feed keeps running through your busiest showing and closing weeks without you touching it.",
      },
      {
        step_number: 7,
        title: "Make every post look unmistakably like your brand",
        description:
          "In a sea of identical agent posts, visual consistency is how people start recognizing you before they read your name. Lock in your colors, headshot placement, and a simple slide template, then use them every single time. This matters more in real estate than almost any niche, because you're selling trust in a high-stakes decision — a scattered, mismatched feed quietly undercuts the competence you're trying to project. Consistent branding is a silent credibility signal working for you around the clock.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one branded reference image and CarouseLabs applies your colors and style to every future carousel automatically, so your whole feed looks like one polished brand.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, a real estate agent's LinkedIn looked exactly like every other agent's: a stream of 'just listed' and 'just sold' graphics that only mattered to people already in a deal. You knew you should be sharing market insight and local knowledge — the stuff that actually builds trust — but between showings, inspections, and closings there was never time, and translating MLS data into a readable post felt like homework. So the pipeline ran hot during a transaction and went cold the moment it closed, forcing you to start lead generation from scratch every cycle. Meanwhile the market data you pulled every month, the smart answers you gave clients in private, and the neighborhoods you knew street-by-street never made it into content — your best expertise stayed invisible.",
    after_carouselabs:
      "With CarouseLabs, the expertise you already have becomes the content that generates listings. Last month's market stat turns into a plain-English carousel that makes you look like the agent who reads the market. The question a buyer asked at a showing becomes a post that quietly advises hundreds of silent scrollers. A neighborhood you know street-by-street becomes a spotlight carousel that locals forward in their group chats. Because you can batch several posts at once and CarouseLabs keeps your ideas anchored to your farm area, your feed stays alive through your busiest closing weeks — so the pipeline never goes cold between deals. Everything comes out on-brand and polished, and slowly you become the local name people already feel they know before they ever call.",
    time_to_first_post:
      "About 20 minutes including onboarding — most agents turn last month's market data into their first carousel the same day.",
    quick_wins: [
      "Your first market-insight carousel that positions you as the agent who reads the market, not just another 'just listed' post.",
      "A neighborhood-spotlight post that local residents actually share — the warmest lead source in real estate.",
      "A steady posting rhythm that keeps your pipeline warm between transactions instead of restarting from zero after every closing.",
    ],
  },
  "real-estate-investors": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Decide what your visibility is actually for",
        description:
          "Investors build an audience for concrete reasons: attracting private capital, finding off-market deals, building partnerships, or eventually teaching. Decide which, because it shapes everything. An investor known publicly for a specific strategy attracts deal flow and capital that never reaches anonymous operators. In a business where the best opportunities come through relationships, being a known, credible name is a genuine competitive advantage over investors with identical capital.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your investing strategy, so your feed attracts the deal flow and capital your goals require.",
      },
      {
        step_number: 2,
        title: "Turn real deals into transparent breakdowns",
        description:
          "Your deals — the numbers, the mistakes, the returns — are compelling content, shared with appropriate discretion about private details. Keep a note of each deal's lessons. Real estate content is full of gurus with no portfolio, so an actual operator sharing real numbers is instantly credible and rare. Transparent deal breakdowns prove you actually do this, which is exactly what attracts partners, capital, and off-market opportunities.",
        time_required: "10 min per deal",
        carouselabs_tip:
          "CarouseLabs turns a real deal into a transparent breakdown carousel, so your actual operating experience becomes credible, rare content.",
      },
      {
        step_number: 3,
        title: "Write hooks with real numbers and honest lessons",
        description:
          "Investing hooks land when they lead with a specific number or an honest mistake: 'This deal returned 22%. The one before it lost money, and here's the difference.' Because real estate content is saturated with guru fantasy, honesty about real numbers and real losses cuts through instantly. It signals you're an operator rather than someone selling a course about being an operator — a distinction sophisticated readers notice immediately.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates number-led, honest hooks, so your posts read as a real operator rather than another real estate guru.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches your analysis",
        description:
          "Structure a carousel around one part of your process: how you underwrite a deal, how you spot a bad market, how you structure financing. Walk through the situation, the common mistake, your analysis, the steps, and the outcome. Teaching real analysis proves your competence to potential partners and capital, and it attracts the sophisticated relationships that only come to operators who visibly know what they're doing.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full analysis carousel from your process, so your underwriting competence becomes visible to partners and capital.",
      },
      {
        step_number: 5,
        title: "Be honest about the losses and the boring reality",
        description:
          "Real estate content sells a fantasy of passive income and easy wealth. Sharing the unglamorous reality — the bad tenant, the deal that lost money, the years of grinding — differentiates you completely and builds trust with sophisticated people who know the fantasy is nonsense. Being the honest operator in a field full of hype is exactly what attracts serious partners rather than dreamers.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape honest, unglamorous investing content, so your feed attracts serious partners rather than dreamers chasing a fantasy.",
      },
      {
        step_number: 6,
        title: "Stay consistent so opportunities find you",
        description:
          "Deals, capital, and partnerships arrive unpredictably, often from people quietly following you. Batch a week of posts in one session so your visibility holds regardless of how busy your portfolio gets. Consistent presence means that when someone has an off-market deal or capital to place, you're the operator they think of — which in this business is worth more than any amount of outbound effort.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your visibility holds and off-market deals and capital keep finding you.",
      },
      {
        step_number: 7,
        title: "Look like a serious operator, not a guru",
        description:
          "Real estate's visual culture is dominated by rented Lamborghinis and hype. A clean, understated, professional visual identity immediately signals that you're a real operator rather than someone selling a dream. Lock in your template once so every deal breakdown carries the same credible polish — which, to the sophisticated partners and capital you actually want, is a meaningful signal in a space full of noise.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clean and understated, so your feed reads as a serious operator, not a guru.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, real estate investors operated in silence while gurus with no portfolio built huge followings selling courses. Your real deals, real numbers, and hard-won analysis stayed private, so the off-market opportunities and private capital that flow through relationships never found you. Managing a portfolio consumed your time, and the fantasy content dominated the conversation. You were doing the actual work; the people selling the dream owned the attention — and the deal flow that comes with it.",
    after_carouselabs:
      "With CarouseLabs, your real operating experience becomes visible and rare. A deal becomes a transparent breakdown that proves you actually do this. Honest hooks with real numbers cut through guru fantasy instantly. Your analysis becomes a carousel that proves competence to partners and capital. Your honesty about losses attracts serious people rather than dreamers. Because you batch a week in one session, your visibility holds — so off-market deals and capital start finding you instead of the other way around.",
    time_to_first_post:
      "About 20 minutes including onboarding — most investors turn one real deal into a first breakdown carousel the same day.",
    quick_wins: [
      "Your first transparent deal breakdown that proves you're an operator, not a guru.",
      "An honest post about a loss that builds more trust than any highlight reel.",
      "Your first inbound off-market deal or capital enquiry from someone who's been quietly following you.",
    ],
  },
  "real-estate-coaches": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Prove you've actually done what you teach",
        description:
          "Real estate coaching is drowning in people who couldn't succeed at real estate so they teach it instead — and your audience knows this. Decide how you'll make your actual track record visible, because credibility is your entire product. A coach with a demonstrable operating history is instantly differentiated from the fantasy-sellers, and that distinction is the only thing that matters to a serious agent or investor choosing a coach.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content anchored to your real track record, so your feed proves you've done what you teach.",
      },
      {
        step_number: 2,
        title: "Turn client results into credible proof",
        description:
          "Your clients' outcomes — the agent who tripled their listings, the investor who closed their first deal — are your strongest content, with permission. Keep a note of these and the specific coaching that unlocked each. Because the coaching market is full of unverifiable claims, real client results with real specifics are what separate you from the hype. Proof is the only currency that works in a market this saturated with false promises.",
        time_required: "10 min per client win",
        carouselabs_tip:
          "CarouseLabs turns a client win into a proof carousel, so your results answer the skepticism a hype-saturated market has earned.",
      },
      {
        step_number: 3,
        title: "Write hooks that reject the industry's fantasy",
        description:
          "Real estate coaching hooks land when they push back on the hype: 'You don't need a better script. You need to stop calling people who were never going to list.' Naming the real problem, rather than selling a shortcut, differentiates you instantly from the guru crowd. Serious agents are exhausted by fantasy promises, so a coach who's honest about the actual work earns their attention and trust immediately.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates honest hooks that reject industry fantasy, so your posts earn trust from agents exhausted by guru promises.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches something genuinely useful",
        description:
          "Structure a carousel around one real method: how to actually build a referral pipeline, how to price a listing conversation, how to underwrite your first deal. Walk through the problem, the common mistake, your method, the steps, and the result. Giving away genuinely useful methodology proves you have substance rather than motivation — and when an agent applies your free advice and it works, they want your full coaching.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full method carousel from your coaching, so your substance becomes visible in a market full of empty motivation.",
      },
      {
        step_number: 5,
        title: "Be honest about who this business isn't for",
        description:
          "Every real estate guru promises anyone can do it. Being honest that most agents fail, that it's brutally hard, and that it isn't for everyone is enormously differentiating and builds trust. It also filters your clients toward serious people rather than dreamers who'll churn. Being the coach who tells the truth attracts exactly the committed clients who actually succeed and become your case studies.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape honest, filtering content, so your feed attracts committed clients rather than dreamers who'll churn.",
      },
      {
        step_number: 6,
        title: "Stay consistent to build trust in a low-trust market",
        description:
          "Agents have been burned by coaching promises, so trust builds slowly and only through sustained credibility. Batch a week of posts in one session so your honest, substantive presence keeps showing up. Consistency is what eventually convinces a skeptical agent that you're different from the last three coaches who took their money — which, in a low-trust market, is the entire battle.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your credible presence builds the slow trust a burned, skeptical market requires.",
      },
      {
        step_number: 7,
        title: "Look substantive, not like a rented-Lamborghini guru",
        description:
          "The visual language of real estate coaching is hype and flash. A clean, professional, understated identity immediately signals that you're a real coach rather than a fantasy-seller. Lock in your template once so every proof and method carousel carries the same credible polish. In a market where the flashiest visuals carry the emptiest promises, looking substantive is itself a powerful differentiator to serious buyers.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel understated and credible, so your feed reads as substance, not a guru pitch.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, real estate coaches with genuine track records were drowned out by fantasy-sellers with rented Lamborghinis and unverifiable promises. Coaching clients left no time to build a credible presence, so your real results and honest methodology stayed invisible. Serious agents — burned repeatedly by hype — had no way to tell you apart from the last three coaches who took their money. Your substance was real; the market saw only another guru pitch and scrolled past.",
    after_carouselabs:
      "With CarouseLabs, your substance finally cuts through the hype. A client win becomes proof that answers a skeptical market. An honest hook rejecting industry fantasy earns trust from exhausted agents. Your method proves you teach substance, not motivation. Your honesty about who this business isn't for filters toward committed clients who actually succeed. Because you batch a week in one session, your credible presence builds the slow trust a burned market requires — and your understated feed signals you're the real thing.",
    time_to_first_post:
      "About 20 minutes including onboarding — most coaches turn one client win into a first proof carousel the same day.",
    quick_wins: [
      "Your first proof carousel that separates you from the fantasy-sellers with unverifiable claims.",
      "An honest post that earns trust from agents burned by guru promises.",
      "Your first client who says you're the first real estate coach who told them the truth.",
    ],
  },
  "mortgage-brokers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Know your compliance boundaries, then build freely",
        description:
          "Mortgage advice is regulated, so get clear on what you can say — no guaranteed rates or outcomes, appropriate disclaimers, firm approval where required. Establishing this upfront lets you build a content habit that lasts rather than one that stalls at the first compliance flag. Brokers who understand their guardrails create confidently and consistently, which is exactly what this trust-driven business rewards.",
        time_required: "30 min, once",
        carouselabs_tip:
          "CarouseLabs drafts educational, non-promissory content you can run through compliance, so review is a quick check rather than a rewrite.",
      },
      {
        step_number: 2,
        title: "Answer the questions that terrify borrowers",
        description:
          "Every client asks the same anxious questions — will I be approved, how much can I borrow, what does this rate change mean for me. Those private questions are your public content pipeline, because thousands of stressed would-be buyers are wondering exactly the same thing. Keep a note of every question. Answering them publicly makes strangers feel you've already helped them before they ever enquire.",
        time_required: "5 min a day",
        carouselabs_tip:
          "CarouseLabs turns a common borrower question into a clear answer carousel, so the reassurance you give privately reaches thousands.",
      },
      {
        step_number: 3,
        title: "Write hooks that calm mortgage anxiety",
        description:
          "Mortgage hooks land when they reduce fear with clarity: 'Rates went up. Here's what that actually means for your buying power — and it's less than you think.' Because buying a home is terrifying and the news amplifies panic, a broker offering calm, concrete perspective stands out enormously. Being the steady voice in a stressful process is exactly what makes an anxious buyer reach out to you rather than a bank.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates calm, clarifying hooks, so your posts reduce mortgage anxiety instead of amplifying the panic in the news.",
      },
      {
        step_number: 4,
        title: "Build a carousel that demystifies the process",
        description:
          "Structure a carousel around one confusing thing: how affordability is actually assessed, what really affects your rate, what to do before applying. Walk through the confusion, the common mistake, the clear explanation, and the action. Making an intimidating process understandable builds enormous trust — when your free explanation finally makes a first-time buyer feel capable, they want you handling their mortgage.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full explainer carousel from your notes, so the intimidating mortgage process becomes clear and reassuring.",
      },
      {
        step_number: 5,
        title: "Be the honest voice about what people can't afford",
        description:
          "Telling someone they should borrow less than they're approved for is counterintuitive but builds extraordinary trust. Sharing honest content about affordability, hidden costs, and when not to buy differentiates you from brokers optimizing for commission. Being visibly on the borrower's side is exactly what makes people choose you and refer you — because in a high-stakes financial decision, honesty is the rarest and most valuable signal.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape honest, borrower-first content, so your feed proves you're on their side rather than optimizing for commission.",
      },
      {
        step_number: 6,
        title: "Stay present through a long, anxious decision",
        description:
          "People think about buying for a year or more before they act, and they're deciding who to trust throughout. Batch a week of posts in one session so your calm presence keeps showing up across that window. Consistency builds the familiarity that makes you the broker they call when they're finally ready — a decision they make slowly and emotionally, not on a whim.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your calm presence holds across the long window before someone is ready to buy.",
      },
      {
        step_number: 7,
        title: "Look trustworthy and calm, not salesy",
        description:
          "Finance content is full of rate-shouting and urgency tactics. A clean, calm, professional visual identity signals that you're a trustworthy advisor rather than someone chasing a commission. Lock in your template once so every explainer carries the same reassuring polish — which, to a terrified first-time buyer, is itself a reason to feel safe reaching out to you.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel calm and professional, so your feed reassures anxious buyers rather than pressuring them.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, mortgage brokers relied on referrals and portal leads while terrified first-time buyers googled their questions and found panic-inducing headlines instead of help. Client work left no time for content, and compliance uncertainty made posting feel risky. So the calm, clear answers you gave clients daily — exactly what an anxious buyer needed — never reached them. You competed on rate comparison rather than the trust that actually wins mortgage clients, and the reassurance only you could offer stayed locked in appointments.",
    after_carouselabs:
      "With CarouseLabs, the reassurance you give privately finally reaches thousands. A common borrower question becomes a clear answer carousel. A calming hook cuts through rate panic with real perspective. Your explainer makes an intimidating process feel manageable. Your honesty about affordability proves you're on the borrower's side, not the commission's. Because the content is educational, compliance is a quick check — and because you batch a week, your calm presence holds across the long, anxious window before someone is ready to buy.",
    time_to_first_post:
      "About 20 minutes to draft, plus your firm's compliance review — most brokers publish their first carousel within a day or two.",
    quick_wins: [
      "Your first explainer carousel that makes a terrified first-time buyer feel capable.",
      "A compliance-friendly content habit that stops feeling risky and starts building trust.",
      "Your first enquiry from a buyer who says your calm explanations are why they chose you over a bank.",
    ],
  },
  "property-managers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Speak to landlords, not tenants",
        description:
          "Your buyer is the property owner deciding whether to self-manage or hire you, so anchor all content to their concerns: the time drain, the legal risk, the bad tenant, the void periods. Decide the owner you serve — accidental landlords, portfolio investors, HMO operators — and speak to their specific pain. Most property management marketing is generic service listing; content that names an owner's real frustration is what actually converts.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on the landlord you serve, so your feed speaks to their real frustrations rather than listing services.",
      },
      {
        step_number: 2,
        title: "Turn the chaos you handle into content",
        description:
          "You deal with things landlords dread — the emergency repair at midnight, the eviction, the compliance change nobody knew about. Keep a note of these. Sharing what you actually handle makes vividly clear why self-managing is a false economy, which is the entire argument for your service. Nothing sells property management like an owner realizing what they'd have to deal with alone.",
        time_required: "5 min a day",
        carouselabs_tip:
          "CarouseLabs turns a real management situation into a carousel, so the chaos you absorb becomes the argument for hiring you.",
      },
      {
        step_number: 3,
        title: "Write hooks about the risk landlords don't see",
        description:
          "Property hooks land when they surface a hidden risk: 'The compliance rule that changed last month. Most landlords don't know, and the fine is £30,000.' Naming a specific, expensive risk grabs an owner's attention instantly, because the fear of getting something legally wrong is a landlord's constant background anxiety. This positions you as the expert protecting them rather than a cost they're weighing.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks around hidden landlord risks, so your posts grab owners' attention with the fears they actually carry.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches landlords something valuable",
        description:
          "Structure a carousel around one useful thing: how to screen tenants properly, what actually reduces void periods, the compliance checklist for this year. Walk through the problem, the common mistake, your guidance, the steps, and the outcome. Genuinely helping landlords — even those who self-manage — builds trust and demonstrates expertise, so when managing gets overwhelming, you're the obvious person they call.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full landlord-education carousel from your expertise, so your knowledge builds trust with owners before they need you.",
      },
      {
        step_number: 5,
        title: "Make the true cost of self-managing visible",
        description:
          "Landlords compare your fee to zero, forgetting the hours, the risk, and the void periods that self-managing actually costs. Content that makes those hidden costs concrete reframes your fee as savings rather than expense. Being the manager who shows the real math, honestly, is what converts a fee-focused owner into a client who understands the value — which is the fundamental sales challenge in your business.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape true-cost content, so your fee reads as savings rather than expense to a self-managing landlord.",
      },
      {
        step_number: 6,
        title: "Stay visible for the moment self-managing breaks",
        description:
          "Landlords hire a manager at a breaking point — a nightmare tenant, a legal scare, a life change — that arrives unpredictably. Batch a week of posts in one session so your presence holds regardless of how chaotic your portfolio gets. Consistency means that when an owner's self-managing finally collapses, you're the name they already trust rather than a stranger they google in a panic.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so you're top of mind for the unpredictable moment a landlord's self-managing breaks.",
      },
      {
        step_number: 7,
        title: "Look professional and reassuring to owners",
        description:
          "Landlords are trusting you with a major asset, so a clean, professional visual identity signals competence and reliability. A consistent look reassures an owner that you'd handle their property with the same care. Lock in your template once so every risk and education carousel carries the same polish — quietly signalling the organized professionalism that a landlord handing over their investment needs to see.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel professional and consistent, so your feed signals the competence landlords need to see.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, property managers competed on fee percentage because landlords couldn't see the value they'd be buying. The chaos you absorbed daily — the midnight emergencies, the compliance minefield, the eviction you handled — stayed invisible, so owners compared your fee to zero and self-managed. Portfolio chaos left no time for content, so your expertise never reached the landlords who'd have hired you instantly if they understood what they were actually taking on alone.",
    after_carouselabs:
      "With CarouseLabs, the chaos you absorb becomes the argument for hiring you. A real management situation becomes a carousel that shows what self-managing actually means. A hook about a hidden compliance risk grabs an owner's constant anxiety. Your landlord education builds trust before they need you. Your true-cost content reframes your fee as savings. Because you batch a week in one session, you're top of mind for the unpredictable moment a landlord's self-managing finally breaks.",
    time_to_first_post:
      "About 20 minutes including onboarding — most property managers turn one real situation into a first carousel the same day.",
    quick_wins: [
      "Your first carousel that makes a landlord realize what self-managing actually costs them.",
      "A hidden-risk post that grabs the compliance anxiety every owner carries.",
      "Your first enquiry from a landlord at their breaking point who already trusted your name.",
    ],
  },
  "course-creators": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Validate demand with content before you build",
        description:
          "Most courses fail because they're built for an audience that doesn't exist. Use content as market research: post about your topic and watch what resonates. The posts that land tell you exactly what people want to learn and what language they use. Creators who validate with content before building launch to proven demand; those who build first and test later discover the problem after months of wasted work.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your topic, so every post both builds audience and validates what people actually want to learn.",
      },
      {
        step_number: 2,
        title: "Teach freely — it's the demo of your product",
        description:
          "Creators hoard their best material fearing it cannibalizes sales, but people buy courses for teaching ability, not secret information. Keep a note of your best lessons and give them away. When someone learns something genuinely valuable from your free content, they conclude your paid course must be excellent. Your free teaching is literally the product demo, and withholding it means prospects have nothing to judge you on.",
        time_required: "10 min per lesson",
        carouselabs_tip:
          "CarouseLabs turns one of your lessons into a teaching carousel, so your free content demos the teaching ability people actually buy.",
      },
      {
        step_number: 3,
        title: "Write hooks that promise a specific capability",
        description:
          "Course hooks land when they promise a concrete skill: 'The 3 mistakes that make your first course flop — and how to avoid them.' Leading with a specific capability attracts exactly the people who'd buy that capability. Vague 'grow yourself' hooks attract nobody, because the person who buys a course wants one particular thing they can't currently do — so name that thing directly.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks promising specific capabilities, so your posts attract exactly the people who'd buy your course.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a complete lesson",
        description:
          "Structure a carousel around one self-contained lesson: the framework, the common mistake, the method, the steps, and the result. A carousel that genuinely teaches end-to-end is your best marketing, because it demonstrates your instructional design — the thing that separates a course people finish from one they abandon. Prospects get to experience your teaching quality directly rather than taking your word for it.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full teaching carousel from your lesson — and its clarity demonstrates the instructional quality your course delivers.",
      },
      {
        step_number: 5,
        title: "Show student outcomes, not course features",
        description:
          "Nobody cares about your module count or video hours — they care whether they'll actually be able to do the thing afterward. Share student results and the transformation behind them, with permission. Because the course market is full of products people never finish, real evidence that your students actually achieve the outcome is what overcomes justified buyer skepticism and drives sales.",
        time_required: "10 min per result",
        carouselabs_tip:
          "CarouseLabs turns a student outcome into a proof carousel, so your results answer the skepticism a market full of abandoned courses has earned.",
      },
      {
        step_number: 6,
        title: "Stay valuable between launches",
        description:
          "Going quiet between launches then shouting when the cart opens trains your audience to ignore you. Batch a week of posts in one session so you're consistently giving value regardless of launch cycles. An audience that's been learning from you for months buys on day one; one that only hears from you during promotions tunes out. Consistency between launches is precisely what makes launches convert.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so you keep giving value between launches instead of only appearing when the cart opens.",
      },
      {
        step_number: 7,
        title: "Let your content quality signal course quality",
        description:
          "Prospects extrapolate directly from your free content to your paid product — sloppy posts imply a sloppy course. A polished, consistent visual identity signals the production quality and care your course delivers. Lock in your template once so every teaching carousel looks the part. Your feed is a continuous free sample, and its quality is doing your selling every single day, whether you intend it to or not.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel polished, so your free content signals the quality of your paid course.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, course creators built for months and launched into silence. Audience-building got postponed until launch week, when you were suddenly shouting at strangers. You hoarded your best teaching, fearing cannibalized sales, so prospects had no way to judge whether you could actually teach — the only thing they were really buying. Between launches you went quiet, then reappeared selling, training your audience to tune you out. Your course may have been excellent; nobody had a reason to believe it.",
    after_carouselabs:
      "With CarouseLabs, content validates demand and builds audience before your launch needs it. Your best lesson becomes a free teaching carousel that demos the ability people buy. A specific-capability hook attracts exactly the right people. Student outcomes become proof that answers a skeptical market. Because you batch a week in one session, you keep giving value between launches instead of only appearing when the cart opens — so when you launch, you sell to an audience that's been learning from you for months.",
    time_to_first_post:
      "About 15 minutes from signup — appropriately fast for someone whose whole craft is teaching.",
    quick_wins: [
      "Your first free teaching carousel that demos the teaching ability prospects are actually buying.",
      "Real validation data on what your audience wants before you build the course.",
      "A between-launch presence that turns your next launch into a warm sell rather than a cold shout.",
    ],
  },
  "community-builders": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define the community you're building and for whom",
        description:
          "Community building is often vague, so get specific: who belongs, what they get, why it exists. Anchor your content there. Your public presence is how people discover the community and decide whether it's for them, so clarity is essential — a community with a fuzzy identity attracts nobody in particular and dies. Being precise about who it's for is what makes the right people feel it was built for them.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your community's specific identity, so the right people recognize it was built for them.",
      },
      {
        step_number: 2,
        title: "Let your content be the community's front door",
        description:
          "People join communities they can already sample. Keep a note of the best conversations, insights, and moments from your community and share them publicly (with permission). This gives outsiders a taste of the value inside, which is far more compelling than describing it. Showing the actual conversations happening is the most persuasive possible argument for joining — it proves the community is alive rather than another dead Slack.",
        time_required: "10 min, weekly",
        carouselabs_tip:
          "CarouseLabs turns a great community moment into a carousel, so outsiders can taste the value inside rather than take your word for it.",
      },
      {
        step_number: 3,
        title: "Write hooks that name the belonging people want",
        description:
          "Community hooks land when they name an isolation people feel: 'The loneliest part of this job is that nobody around you does it too.' Naming the specific disconnection your community solves creates instant resonance with the exact person who needs it. Because belonging is an emotional need people rarely articulate, giving it language is what makes someone realize they've been looking for what you built.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that name the isolation your community solves, so your posts reach people who didn't know they were looking.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches what you've learned",
        description:
          "Structure a carousel around one lesson from building community: what makes members stick, why most communities die, how to spark real conversation. Walk through the problem, the common mistake, your approach, the steps, and the result. Teaching community-building publicly attracts both members and the founders and companies who might hire you, while proving you understand the craft rather than just hosting a group chat.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full community-craft carousel from your notes, so your expertise attracts both members and professional opportunities.",
      },
      {
        step_number: 5,
        title: "Champion your members publicly",
        description:
          "Celebrating your members' wins and voices is the most on-brand content a community builder can create — it demonstrates the culture you've built and makes members feel seen, which strengthens retention. It also shows prospective members what belonging looks like. A builder who visibly puts members first attracts exactly the generous people who make a community thrive rather than lurkers who extract value.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you turn a member win into a celebration post, so your feed demonstrates the culture that makes people want to join.",
      },
      {
        step_number: 6,
        title: "Stay consistent — community grows on trust over time",
        description:
          "People join communities after watching from a distance, sometimes for months, deciding whether it's genuine and whether they'd belong. Batch a week of posts in one session so your presence holds regardless of how demanding member support gets. Consistency is what builds the trust and familiarity that eventually turns a quiet observer into a member who finally decides these are my people.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your presence holds while you're busy serving members — and outsiders keep watching.",
      },
      {
        step_number: 7,
        title: "Create a warm, human, inviting visual identity",
        description:
          "Your visual identity should feel like the community itself — warm, human, welcoming rather than corporate. A consistent, inviting look signals the atmosphere someone would be joining. Lock in your template once so every member celebration and craft carousel carries the same warmth. For a community builder, a feed that feels genuinely welcoming is the most fitting possible demonstration of what you've created.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel warm and inviting, so your feed feels like the community it represents.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, community builders were consumed by serving members — always on, always responding — with nothing left to tell anyone the community existed. The brilliant conversations happening inside stayed invisible, so outsiders had no way to sample the value or decide it was for them. Your genuine craft in building belonging went unrecognized, and the people who most needed what you'd built kept scrolling past, unaware. You'd created something real; almost nobody could see it.",
    after_carouselabs:
      "With CarouseLabs, your content becomes the community's front door. A great internal conversation becomes a carousel that lets outsiders taste the value. A hook naming a specific isolation reaches people who didn't know they were looking. Your community craft attracts both members and professional opportunities. Celebrating members demonstrates the culture that makes people want in. Because you batch a week in one session, your presence holds while you're busy serving members — and the observers watching from a distance finally decide these are my people.",
    time_to_first_post:
      "About 20 minutes including onboarding — most builders turn one community moment into a first carousel the same day.",
    quick_wins: [
      "Your first carousel that lets outsiders taste what's happening inside your community.",
      "A hook that names an isolation and reaches someone who didn't know they were looking for you.",
      "Your first new member who says a post made them realize these were their people.",
    ],
  },
  "newsletter-founders": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Treat subscriber growth as the whole business",
        description:
          "A newsletter is a media business, and subscriber growth is its only engine — email has no discovery, so every subscriber comes from elsewhere. Decide your newsletter's niche and audience, then treat your content as the acquisition channel it needs to be. Founders who take growth as seriously as writing build real businesses; those who only write build a hobby with a small, static list.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your newsletter's niche, so your feed becomes the growth engine the business runs on.",
      },
      {
        step_number: 2,
        title: "Repurpose every issue into acquisition content",
        description:
          "Each issue reaches only your existing list and then dies, despite the hours it took. Keep a note of the best insights from every edition and turn them into posts that reach far beyond your subscribers. This gives your writing a second life in front of new people — and the ones who love an excerpt subscribe for the rest, which is exactly the compounding loop a newsletter business needs.",
        time_required: "10 min per issue",
        carouselabs_tip:
          "CarouseLabs turns one issue's insights into carousels, so every edition drives acquisition instead of only reaching people you already have.",
      },
      {
        step_number: 3,
        title: "Write hooks that prove your writing earns an inbox",
        description:
          "Asking for an email is asking for real trust. Your hooks must demonstrate that your writing justifies it — sharp, distinctive, valuable. A hook that makes someone think 'this person writes well' converts a scroller into a subscriber. Because you're selling your voice, every hook is a direct sample of exactly what someone would be signing up to receive, which makes hook quality your single highest-leverage growth lever.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates sharp, distinctive hooks, so every post proves your writing deserves the inbox trust you're asking for.",
      },
      {
        step_number: 4,
        title: "Build a carousel that gives away a full idea",
        description:
          "Structure a carousel around one idea from an issue: the observation, the conventional view, your take, the evidence, the implication. Give the complete value rather than teasing. A reader who gets something genuinely useful for free concludes your newsletter is worth subscribing to, whereas a teaser that withholds feels like a bait-and-switch and converts nobody. Generosity is the growth strategy.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full carousel from an issue's idea, so free value proves your newsletter's worth rather than teasing at it.",
      },
      {
        step_number: 5,
        title: "Build the business case, not just the audience",
        description:
          "As a founder you're building an asset, so share content about the business itself — the growth experiments, the monetization decisions, the sponsor relationships, the churn lessons. This attracts fellow operators, potential sponsors, and even acquirers, while establishing you in the creator-economy conversation. Your newsletter's business story is compelling content that pure writers can't offer.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs turns a newsletter business lesson into a post, so your operator story attracts sponsors, peers, and opportunities.",
      },
      {
        step_number: 6,
        title: "Make growth continuous, not just on send day",
        description:
          "Writing consumes your time, so promotion happens only when an issue goes out — and growth stalls. Batch a week of posts in one session so acquisition runs continuously in the background. Steady subscriber growth is what turns a newsletter from a hobby into a business worth monetizing, and it compounds: every week of consistent acquisition makes the next sponsorship conversation stronger.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so subscriber acquisition runs continuously instead of only on send day.",
      },
      {
        step_number: 7,
        title: "Build a recognizable media brand",
        description:
          "A newsletter business is a media brand, and brands need recognition. A consistent, distinctive visual identity across every carousel builds the familiarity that makes people trust you with their inbox and makes sponsors see a real property. Lock in your template once so every idea carousel reinforces your brand — turning scattered posts into a media presence that looks like the business you're building.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel on-brand, so your newsletter looks like the media business you're building.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, newsletter founders wrote brilliant issues that reached only the subscribers they already had. Email offers no discovery, so growth flatlined while writing consumed every hour. Your best ideas died inside issues nobody new ever saw, and promotion happened only on send day — if at all. Sponsors want reach you didn't have, and the business you were trying to build stayed a hobby with a static list, despite writing that deserved far more.",
    after_carouselabs:
      "With CarouseLabs, growth becomes continuous. One issue's insights become carousels that reach far beyond your list. Every hook proves your writing earns inbox trust. Giving an idea's full value away converts scrollers into subscribers. Your operator story attracts sponsors and peers. Because you batch a week in one session, acquisition runs in the background while you focus on writing — and steady, compounding growth turns your newsletter from a hobby into the media business it deserves to be.",
    time_to_first_post:
      "About 15 minutes from signup — appropriately fast for a professional writer.",
    quick_wins: [
      "Your first carousel that takes an issue's best idea to people who've never heard of your newsletter.",
      "Continuous subscriber acquisition running in the background while you focus on writing.",
      "Your first sponsor conversation strengthened by growth you can actually point to.",
    ],
  },
  "content-creators": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Diversify beyond the platform that owns your audience",
        description:
          "Every creator on a single platform is one algorithm change from losing their business. Decide the niche you own and start building on LinkedIn as a second home — particularly valuable because it's where brand deals and B2B opportunities actually originate. Creators who diversify build durable careers; those dependent on one platform are renting an audience they could lose overnight without warning or appeal.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your niche, so you build a second audience home that no single algorithm can take away.",
      },
      {
        step_number: 2,
        title: "Repurpose your existing content to a new audience",
        description:
          "You already create constantly — that work should reach more than one platform's audience. Keep a note of your best-performing ideas and adapt them for a professional audience. This is leverage: no new creative burden, entirely new reach. Because LinkedIn's audience differs from short-form platforms, your existing ideas often land fresh with people who've never encountered them, effectively doubling the return on work you've already done.",
        time_required: "10 min per idea",
        carouselabs_tip:
          "CarouseLabs adapts your existing ideas into carousels for a professional audience, so your work reaches new people without new creative burden.",
      },
      {
        step_number: 3,
        title: "Write hooks that translate to a professional audience",
        description:
          "The hook style that works on short-form doesn't always land here — LinkedIn rewards substance and insight over pure shock. Craft hooks that deliver genuine value with your creator's instinct for attention: 'I've made 400 videos. The thing that actually grew my channel took 10 minutes.' Combining creator attention skills with professional substance is a rare combination that performs exceptionally well.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that pair your attention instincts with the substance a professional audience rewards.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches your craft",
        description:
          "Structure a carousel around one thing you've learned creating: what actually drives growth, how you handle burnout, the tactic that failed. Walk through the problem, the common mistake, your approach, the steps, and the result. Teaching your craft attracts both fellow creators and — crucially — the brands and businesses who want to work with someone who clearly understands audience-building.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full craft carousel from your experience, so your creator expertise attracts brands as well as fellow creators.",
      },
      {
        step_number: 5,
        title: "Show the business behind the content",
        description:
          "LinkedIn's audience is professional, so content about the business of creating — how brand deals work, how you price, the reality of creator income — performs strongly and attracts commercial opportunities. It positions you as an entrepreneur rather than an entertainer, which is exactly the framing that gets brands and businesses taking you seriously as a partner rather than an ad slot.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape the business-of-creating angle, so your feed positions you as an entrepreneur brands want to partner with.",
      },
      {
        step_number: 6,
        title: "Stay consistent without adding to creator burnout",
        description:
          "You're already on a relentless content treadmill, and adding a platform sounds exhausting. Batch a week of posts in one session so your second home grows without adding daily burden. This is the whole point: durable diversification shouldn't cost you the burnout you're already fighting. A system that makes a second platform nearly free is what makes diversification actually happen rather than staying a good intention.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so diversifying to a second platform doesn't add to the burnout you're already fighting.",
      },
      {
        step_number: 7,
        title: "Carry your brand identity across platforms",
        description:
          "Your visual identity is an asset — it should be recognizable wherever your audience finds you. A consistent look across your carousels builds the cross-platform recognition that makes your brand durable rather than platform-dependent. Lock in your template once so every post reinforces the identity people already know you by, turning a second platform into an extension of your brand rather than a separate, unfamiliar presence.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel on-brand, so your identity stays recognizable across every platform you're on.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, content creators built entire businesses on rented land — one algorithm change from losing everything, with no appeal and no warning. Diversifying sounded smart but impossible: you were already on a relentless treadmill and had nothing left for another platform. So your audience stayed concentrated where it was most fragile, the brand deals happening on professional platforms went to other creators, and your existing brilliant ideas reached only the one audience that happened to find them.",
    after_carouselabs:
      "With CarouseLabs, diversification finally costs you almost nothing. Your existing ideas become carousels reaching an entirely new professional audience. Hooks pair your attention instincts with the substance LinkedIn rewards. Your craft content attracts brands, not just fellow creators. Your business-of-creating angle positions you as an entrepreneur worth partnering with. Because you batch a week in one session, a second audience home grows without adding to your burnout — turning rented land into a durable career.",
    time_to_first_post:
      "About 15 minutes from signup — appropriately fast for someone who already creates daily.",
    quick_wins: [
      "Your first carousel that takes an existing idea to an entirely new professional audience.",
      "A second audience home growing without adding to your daily creative burden.",
      "Your first brand or business enquiry from a platform where commercial opportunities actually live.",
    ],
  },
  "influencers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Build the credibility that unlocks better partnerships",
        description:
          "Consumer influence and professional credibility are different currencies, and the second pays better. Decide the expertise beneath your influence — what you actually know — and build a presence around it. Influencers with genuine professional credibility land B2B partnerships, speaking, and advisory work at rates consumer brand deals rarely reach, and those opportunities don't evaporate when a platform's algorithm shifts.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your genuine expertise, so your feed builds the professional credibility better partnerships require.",
      },
      {
        step_number: 2,
        title: "Turn your audience knowledge into professional insight",
        description:
          "You understand attention, audience psychology, and platform mechanics at a level most marketers don't. Keep a note of what you've learned — what actually drives engagement, why a campaign worked, how audiences really behave. Sharing this knowledge professionally repositions you from a promotional channel to a marketing expert, which is exactly what makes brands treat you as a strategic partner rather than an ad slot.",
        time_required: "10 min per insight",
        carouselabs_tip:
          "CarouseLabs turns your audience knowledge into a professional insight carousel, so brands see a marketing expert, not an ad slot.",
      },
      {
        step_number: 3,
        title: "Write hooks that demonstrate substance under the reach",
        description:
          "Professional audiences are skeptical of influencers, so your hooks must prove substance: 'I've run 60 brand campaigns. The ones that fail all make the same mistake.' Leading with real experience and a genuine insight overcomes the assumption that reach means nothing underneath. Your attention skills combined with actual expertise is a genuinely rare combination that performs strongly with professional audiences.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that prove substance under your reach, so professional audiences take you seriously.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches what you know",
        description:
          "Structure a carousel around one thing you understand deeply: how audiences actually decide, why most brand campaigns feel fake, what makes content convert. Walk through the problem, the common mistake, your insight, the application, and the result. Teaching marketers what you know from the front line proves your expertise and attracts the consulting, advisory, and partnership opportunities that outlast any single platform.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full teaching carousel from your front-line knowledge, so your expertise attracts advisory and partnership opportunities.",
      },
      {
        step_number: 5,
        title: "Be honest about the reality of the industry",
        description:
          "Influencer marketing is full of inflated metrics and fake authenticity. Being honest about what actually works, what's theater, and the real economics of the industry differentiates you enormously and builds trust with brands tired of being sold vanity numbers. Being the influencer who tells brands the truth is exactly what makes them want to work with you long-term rather than once.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape honest industry takes, so your feed builds trust with brands tired of inflated metrics and theater.",
      },
      {
        step_number: 6,
        title: "Diversify beyond platform dependence",
        description:
          "Your income depends on platforms that can change the rules overnight. Batch a week of posts in one session so you build a professional presence and network that survives any algorithm shift. Consistent presence here compounds into relationships and opportunities that belong to you rather than to a platform — which is the difference between a career and a lucky run.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so you build a professional presence that survives any algorithm change.",
      },
      {
        step_number: 7,
        title: "Present with professional polish, not consumer aesthetics",
        description:
          "The visual language that works on consumer platforms can undercut you professionally. A clean, credible visual identity signals that you operate as a serious business partner. Lock in your template once so every insight carousel carries that polish — quietly signalling to brands and businesses that you're a professional worth a real contract rather than a personality worth a one-off post.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel professionally polished, so brands see a serious business partner.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, influencers were treated as ad slots rather than experts, and their income depended entirely on platforms that could change the rules overnight. The genuine expertise underneath your reach — your real understanding of attention and audience — stayed invisible, so brands negotiated you down as a channel rather than up as a strategic partner. Higher-value B2B partnerships, advisory work, and speaking all happened on professional platforms where you had no presence.",
    after_carouselabs:
      "With CarouseLabs, the expertise under your reach becomes visible. Your audience knowledge becomes professional insight that repositions you as a marketing expert. Hooks prove substance to a skeptical professional audience. Your teaching attracts advisory and partnership opportunities. Your honesty about industry theater builds trust with brands tired of vanity metrics. Because you batch a week in one session, you build a professional presence and network that survives any algorithm change — turning a lucky run into a career.",
    time_to_first_post:
      "About 15 minutes from signup — appropriately fast for someone who already creates content daily.",
    quick_wins: [
      "Your first insight carousel that repositions you from ad slot to marketing expert.",
      "A professional presence that survives algorithm changes and platform dependence.",
      "Your first B2B partnership or advisory enquiry at rates consumer deals rarely reach.",
    ],
  },
  "brand-ambassadors": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Build a personal brand independent of any brand you represent",
        description:
          "Ambassador relationships end — contracts lapse, brands pivot, budgets get cut. Decide the expertise and identity that's yours regardless of who you represent, and build content around it. An ambassador with an independent personal brand keeps their value when a partnership ends; one whose identity is fused to a brand starts from zero. Your own credibility is the durable asset here.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content anchored to your own expertise, so you build a brand that survives any partnership ending.",
      },
      {
        step_number: 2,
        title: "Show why you genuinely believe in what you represent",
        description:
          "Audiences detect insincere ambassadorship instantly. Keep a note of the real reasons you back the brands you do — the actual product experience, the values alignment, the problem it genuinely solves. Sharing authentic conviction rather than scripted promotion is what makes ambassadorship actually work, and it's what brands increasingly pay premium for because sincerity converts and scripts don't.",
        time_required: "10 min per brand",
        carouselabs_tip:
          "CarouseLabs helps you articulate genuine conviction rather than scripted promotion, so your advocacy actually converts.",
      },
      {
        step_number: 3,
        title: "Write hooks that lead with value, not the brand",
        description:
          "Ambassador hooks fail when they lead with the brand and win when they lead with the audience's problem: 'The gear mistake costing you performance — and it's not what you're using.' Leading with genuine value earns attention that promotional hooks never will, and the brand mention lands naturally afterward. This is the difference between advocacy people engage with and advertising they scroll past.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates value-first hooks, so your advocacy earns attention instead of being scrolled past as an ad.",
      },
      {
        step_number: 4,
        title: "Build a carousel that helps rather than promotes",
        description:
          "Structure a carousel around something genuinely useful to your audience, with the brand appearing as a natural part of the story rather than the subject. Walk through the problem, the common mistake, your guidance, the steps, and the outcome. Genuinely helpful content builds the audience trust that makes your eventual recommendations actually carry weight — which is precisely the value a brand is paying for.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs weaves brands naturally into genuinely helpful content, so your recommendations carry the trust brands are paying for.",
      },
      {
        step_number: 5,
        title: "Demonstrate your value to brands publicly",
        description:
          "Brands choose ambassadors who visibly understand marketing and audience, not just people with followers. Sharing content about what makes brand partnerships work, how you think about authenticity, why some campaigns fail — this positions you as a strategic partner worth premium rates rather than a channel to rent. Being visibly thoughtful about the craft is what attracts better brands and better terms.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape partnership-craft content, so brands see a strategic partner worth premium rates rather than a channel to rent.",
      },
      {
        step_number: 6,
        title: "Stay consistent between campaigns",
        description:
          "Going quiet between brand campaigns and only appearing when you're promoting trains your audience to tune you out — and destroys the trust your partnerships depend on. Batch a week of posts in one session so you're consistently valuable regardless of campaign cycles. An audience that hears from you genuinely between promotions actually listens when you do recommend something.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so you stay genuinely valuable between campaigns rather than only appearing to promote.",
      },
      {
        step_number: 7,
        title: "Maintain your own visual identity",
        description:
          "If your feed looks like a series of different brands' ads, you have no identity of your own. A consistent personal visual identity keeps you recognizable across every partnership and builds the personal brand that outlasts any single contract. Lock in your template once so your presence remains distinctly yours regardless of which brand you're currently representing.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel in your own visual identity, so your brand stays yours across every partnership.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, brand ambassadors lived contract to contract with no identity of their own. Your feed looked like a series of different brands' ads, so when a partnership ended you had nothing durable to show for it. Scripted promotion left audiences cold and conversions weak, which weakened your negotiating position. And going quiet between campaigns meant you only ever appeared when you wanted something — training your audience to ignore exactly the recommendations brands were paying for.",
    after_carouselabs:
      "With CarouseLabs, you build a brand that's yours. Your genuine conviction replaces scripted promotion, and sincerity converts where scripts don't. Value-first hooks earn attention instead of being scrolled past as ads. Brands appear naturally inside genuinely helpful content, so your recommendations carry real trust. Your partnership-craft content attracts better brands at better terms. Because you batch a week in one session, you stay valuable between campaigns — so your audience actually listens when you do recommend something.",
    time_to_first_post:
      "About 15 minutes from signup — appropriately fast for someone already creating brand content.",
    quick_wins: [
      "Your first value-first carousel that earns attention instead of reading as an ad.",
      "A personal brand identity that stays yours regardless of which partnership you're in.",
      "Your first brand enquiry that treats you as a strategic partner rather than a channel to rent.",
    ],
  },
  "cohort-based-course-founders": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Build the audience your cohort model depends on",
        description:
          "Cohort courses live or die on filling each cohort — and unlike evergreen products, an unfilled cohort is a hard deadline you miss publicly. Decide the transformation your cohort delivers and build an audience around it continuously. Founders with a warm audience fill cohorts predictably; those relying on launch pushes scramble every single time and eventually burn out on the stress of it.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your cohort's transformation, so every post feeds the pipeline each cohort depends on.",
      },
      {
        step_number: 2,
        title: "Show the live learning experience, not the curriculum",
        description:
          "Your differentiator versus a recorded course is the live, cohort experience — the peer learning, the accountability, the real-time feedback. Keep a note of the moments that show this: a great cohort discussion, a peer breakthrough, the accountability that made someone finish. Showing the experience proves why your model is worth premium pricing over a $50 recorded course, which is your core sales challenge.",
        time_required: "10 min per cohort moment",
        carouselabs_tip:
          "CarouseLabs turns a live cohort moment into a carousel, so prospects see the experience that justifies your premium over recorded courses.",
      },
      {
        step_number: 3,
        title: "Write hooks that promise transformation and accountability",
        description:
          "Cohort hooks land when they name why self-paced fails: 'You've bought 6 courses and finished none. That's not a discipline problem — it's a format problem.' Naming the real reason people don't finish courses speaks directly to your model's entire value proposition. It reframes your premium price as the solution to the exact problem your prospect has repeatedly experienced.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that name why self-paced learning fails, so your posts make the case for your cohort model directly.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a complete lesson",
        description:
          "Structure a carousel around one lesson from your curriculum: the framework, the common mistake, the method, the steps, and the result. Teaching genuinely proves your instructional quality — the thing cohort buyers pay premium for. And unlike recorded courses, giving content away costs you nothing, because your product is the live experience, not the information.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full teaching carousel from your curriculum, so your instructional quality is visible before anyone enrolls.",
      },
      {
        step_number: 5,
        title: "Let alumni results and community do the selling",
        description:
          "Your alumni — their outcomes, their ongoing community, their testimonials — are your strongest proof, with permission. Cohort courses build genuine community, and showing that alumni network is compelling because prospects aren't just buying a course, they're buying membership in a group. Making that visible is what justifies premium pricing and drives the word-of-mouth that fills cohorts sustainably.",
        time_required: "10 min per alumni story",
        carouselabs_tip:
          "CarouseLabs turns an alumni result into a proof carousel, so prospects see the community and outcomes they'd be joining.",
      },
      {
        step_number: 6,
        title: "Keep the pipeline warm between cohorts",
        description:
          "Cohort models have brutal cycles — teach intensively, then scramble to fill the next one. Batch a week of posts in one session so your audience keeps growing during teaching-heavy weeks. A pipeline that's warm before enrollment opens turns cohort-filling from a stressful scramble into a predictable event, which is the difference between a sustainable business and burnout.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your pipeline keeps warming during teaching-heavy weeks instead of going cold.",
      },
      {
        step_number: 7,
        title: "Signal the premium your model commands",
        description:
          "You charge multiples of a recorded course, so your content must look worth it. A polished, considered, consistent visual identity signals the production quality and care your cohort delivers. Lock in your template once so every teaching and alumni carousel carries that premium polish — because a prospect deciding between your $2,000 cohort and a $50 course is judging partly on whether you look like the difference.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel premium and consistent, so your feed justifies the price gap versus recorded courses.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, cohort founders lived a brutal cycle: teach intensively, then panic-scramble to fill the next cohort with an audience that had gone cold. Teaching consumed everything, so pipeline-building only happened during enrollment pushes — the worst possible time to start. Your live experience, the thing justifying a price ten times a recorded course, stayed invisible to prospects who couldn't see why they shouldn't just buy the $50 alternative. Every cohort was a stressful gamble.",
    after_carouselabs:
      "With CarouseLabs, cohort-filling stops being a scramble. A live cohort moment becomes a carousel showing the experience that justifies your premium. A hook naming why self-paced learning fails makes your model's case directly. Your teaching proves instructional quality before anyone enrolls. Alumni results show the community prospects would be joining. Because you batch a week in one session, your pipeline keeps warming through teaching-heavy weeks — so enrollment opens to a warm audience rather than a cold list.",
    time_to_first_post:
      "About 15 minutes from signup — appropriately fast for someone whose whole craft is teaching.",
    quick_wins: [
      "Your first carousel showing the live experience that justifies your premium over recorded courses.",
      "A pipeline that keeps warming through teaching weeks instead of going cold between cohorts.",
      "Your next cohort filling from a warm audience rather than a stressful launch scramble.",
    ],
  },
  "recruiters": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Build a reputation that makes candidates answer you",
        description:
          "Candidates ignore recruiters because most outreach is spam. A visible, credible presence changes that entirely — when a candidate recognizes your name from genuinely useful content, your message gets opened. Decide the market you specialize in and build authority there. In a business where response rates determine everything, being a known and respected name is worth more than any outreach sequence.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your specialist market, so candidates recognize your name before your message lands.",
      },
      {
        step_number: 2,
        title: "Turn market knowledge into content candidates want",
        description:
          "You know things candidates desperately want to know — what roles actually pay, what companies are really like, what hiring managers screen for. Keep a note of these insights. Sharing genuine market intelligence is enormously valuable and positions you as an ally rather than a spam merchant, which is exactly what makes a passive candidate willing to have a conversation with you.",
        time_required: "10 min per insight",
        carouselabs_tip:
          "CarouseLabs turns your market knowledge into a carousel, so candidates see an ally with real intelligence rather than another spam recruiter.",
      },
      {
        step_number: 3,
        title: "Write hooks that help candidates, not pitch roles",
        description:
          "Recruiter hooks fail when they post job ads and win when they help: 'The CV mistake I see in 80% of senior engineers — and it's costing them interviews.' Leading with genuine value earns attention from an audience conditioned to ignore recruiters entirely. Because the bar for recruiter content is so low, being actually useful makes you stand out immediately with exactly the passive candidates you need.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates candidate-helping hooks, so your posts earn attention from people conditioned to ignore recruiters.",
      },
      {
        step_number: 4,
        title: "Build a carousel that gives real career value",
        description:
          "Structure a carousel around something candidates need: how to negotiate an offer, what hiring managers actually assess, how to evaluate a company. Walk through the problem, the common mistake, your insight, the steps, and the outcome. Giving away genuine career value — even value that doesn't benefit you — builds the trust that makes candidates come to you when they're finally ready to move.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full career-value carousel from your knowledge, so your content builds trust with candidates before they're ready to move.",
      },
      {
        step_number: 5,
        title: "Be honest about the industry's failures",
        description:
          "Recruiting has a deserved reputation problem — ghosting, spam, misrepresentation. Being honest about that and visibly doing it differently is enormously differentiating. Share content about how recruiting should work and what you refuse to do. Being the recruiter who names the industry's failures and operates differently is exactly what earns the trust of a deeply cynical candidate market.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape honest industry takes, so your feed differentiates you from the recruiting practices candidates rightly resent.",
      },
      {
        step_number: 6,
        title: "Stay visible for candidates on a long timeline",
        description:
          "The best candidates are passive — they'll move in a year, not this week — and they're forming impressions of you now. Batch a week of posts in one session so your presence holds through busy placement periods. Consistency means that when a passive candidate finally decides to move, you're the recruiter they already trust, which is how the best placements actually happen.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so you stay visible to passive candidates across the long window before they decide to move.",
      },
      {
        step_number: 7,
        title: "Look credible to senior candidates and clients",
        description:
          "Both candidates and hiring clients judge your professionalism from your feed. A clean, consistent, professional visual identity signals that you're a serious specialist rather than a volume spammer. Lock in your template once so every insight and career-value carousel carries that polish — quietly supporting the credibility that gets your messages opened and your client pitches taken seriously.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel professional and consistent, so candidates and clients read you as a serious specialist.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, recruiters fought a losing battle against an industry reputation for spam and ghosting. Your outreach got ignored because candidates couldn't distinguish you from the hundred other recruiters in their inbox. The genuine market intelligence you held — what roles really pay, what companies are actually like — stayed private, so passive candidates had no reason to trust you. Placement work consumed your time, and you competed purely on outreach volume in a market that had stopped listening.",
    after_carouselabs:
      "With CarouseLabs, candidates start recognizing your name before your message lands. Your market knowledge becomes a carousel that positions you as an ally with real intelligence. Candidate-helping hooks earn attention from people conditioned to ignore recruiters. Your career-value content builds trust before they're ready to move. Your honesty about the industry's failures differentiates you from practices candidates resent. Because you batch a week in one session, you stay visible across the long window before a passive candidate decides to move.",
    time_to_first_post:
      "About 20 minutes including onboarding — most recruiters turn one market insight into a first carousel the same day.",
    quick_wins: [
      "Your first career-value carousel that earns attention from candidates who ignore recruiters.",
      "A batched week that keeps you visible to passive candidates on a year-long timeline.",
      "Your first candidate who replies warm because they've been reading your content — outreach that isn't spam.",
    ],
  },
  "hr-professionals": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Position HR as strategy, not administration",
        description:
          "HR is chronically misperceived as policy and paperwork, which caps careers and influence. Decide the strategic expertise you own — talent strategy, culture, org design, employee experience — and build content around it. HR professionals who make their strategic thinking visible become the ones invited into business decisions, while those who stay invisible remain administrators regardless of how strategic their actual work is.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your strategic HR expertise, so your feed positions you as a business partner, not an administrator.",
      },
      {
        step_number: 2,
        title: "Turn workplace insight into content",
        description:
          "You see what actually makes organizations work and fail — why people really leave, what culture initiatives don't work, how managers get it wrong. Keep a note of these observations (never identifiable). Sharing genuine organizational insight is valuable to leaders and peers, and it demonstrates that you understand business dynamics rather than just enforcing policy, which is the perception shift your career depends on.",
        time_required: "10 min per insight",
        carouselabs_tip:
          "CarouseLabs turns a workplace insight into a carousel, so your organizational understanding becomes visible strategic credibility.",
      },
      {
        step_number: 3,
        title: "Write hooks that name workplace truths",
        description:
          "HR hooks land when they name something everyone feels but nobody says: 'People don't leave managers. They leave the systems that made their manager act that way.' Naming an uncomfortable organizational truth signals depth and sparks the discussion that builds reach. This positions you as a thinker about work rather than an enforcer of policy — precisely the repositioning that changes how leaders treat you.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that name uncomfortable workplace truths, so your posts signal strategic depth rather than policy enforcement.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches an organizational method",
        description:
          "Structure a carousel around one method: how to actually reduce turnover, how to run a fair promotion process, how to build feedback culture. Walk through the problem, the common mistake, your method, the steps, and the result. Teaching real organizational method demonstrates strategic capability and attracts both peers and the senior roles and consulting opportunities that go to visibly strategic HR professionals.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full organizational-method carousel from your expertise, so your strategic capability becomes visible.",
      },
      {
        step_number: 5,
        title: "Advocate for people and business at once",
        description:
          "The best HR professionals hold both — genuine care for people and genuine business rigor. Content that bridges those, showing how good people practice drives business outcomes, is powerful. It counters both the 'HR is the fun police' and 'HR is management's tool' perceptions, positioning you as the rare professional who serves the organization and its people simultaneously — which is exactly what earns real influence.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you bridge people and business outcomes, so your feed positions you as strategic without losing your people-first credibility.",
      },
      {
        step_number: 6,
        title: "Stay visible despite constant demands",
        description:
          "HR work is relentlessly reactive — the escalation, the hiring push, the crisis — so personal content slips. Batch a week of posts in one session so your strategic brand keeps building regardless. Consistent visibility compounds into the reputation that opens senior HR roles, consulting, and speaking, while equally capable but invisible professionals stay stuck in the administrator perception.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your strategic brand keeps building through relentless reactive demands.",
      },
      {
        step_number: 7,
        title: "Present with credible, business-caliber polish",
        description:
          "To be seen as a business partner, your content must look like it. A clean, professional, considered visual identity signals the strategic rigor you bring. Lock in your template once so every insight and method carousel carries that polish — quietly reinforcing that you operate at the business level you're claiming rather than the administrative one you're trying to escape.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel professional and consistent, so your feed matches the strategic level you operate at.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, HR professionals did genuinely strategic work that nobody saw, so the administrator perception stuck. Relentless reactive demands — escalations, hiring pushes, crises — left no time to build a strategic brand. The organizational insight you developed daily stayed private, so leaders kept treating HR as policy enforcement and the senior roles went to people who'd made their thinking visible. Your strategic capability was real; the perception of your function was stuck decades behind it.",
    after_carouselabs:
      "With CarouseLabs, your strategic thinking finally becomes visible. A workplace insight becomes a carousel that proves you understand business dynamics. A hook naming an uncomfortable truth signals depth rather than policy enforcement. Your method demonstrates real organizational capability. Your bridging of people and business outcomes earns influence without losing credibility. Because you batch a week in one session, your strategic brand keeps building through reactive chaos — and the administrator perception finally starts to shift.",
    time_to_first_post:
      "About 20 minutes including onboarding — most HR professionals turn one workplace insight into a first carousel the same day.",
    quick_wins: [
      "Your first insight carousel that positions you as a business partner rather than an administrator.",
      "A post naming a workplace truth that sparks real discussion and builds your reach.",
      "Your first senior role or consulting enquiry from finally making your strategic thinking visible.",
    ],
  },
  "project-managers": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define the delivery expertise you want known",
        description:
          "Project management spans methodologies, industries, and scales — so pick your focus: complex programme delivery, agile transformation, recovery of failing projects, a specific industry. Anchor your content there. A PM known for a specific delivery capability attracts far better roles and consulting than a generalist with certifications, because organizations hire for the specific problem they have, not for a credential.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your delivery specialty, so your feed builds a reputation for solving a specific problem.",
      },
      {
        step_number: 2,
        title: "Turn delivery reality into teaching content",
        description:
          "You navigate things textbooks never cover — the stakeholder who won't engage, the scope that crept, the project you rescued. Keep a note of these real situations and your reasoning. Practitioner stories are far more valuable than methodology summaries, because everyone knows the framework and nobody knows how to handle the messy politics. Real delivery wisdom is what marks you as genuinely senior.",
        time_required: "5 min a day",
        carouselabs_tip:
          "CarouseLabs turns a real delivery situation into a teaching carousel, so your practitioner wisdom becomes visible seniority.",
      },
      {
        step_number: 3,
        title: "Write hooks about why projects really fail",
        description:
          "PM hooks land when they name the real cause: 'Your project isn't late because of scope creep. It's late because nobody would say the deadline was always fake.' Naming the political and human truths behind project failure resonates instantly with peers living those exact dynamics. Avoid methodology hooks — everyone's read the manual; nobody talks honestly about why delivery actually breaks.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that name the real, political reasons projects fail, so your posts resonate rather than recite methodology.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches a delivery method",
        description:
          "Structure a carousel around one practical method: how to run a status meeting people don't dread, how to surface risk early, how to recover a failing project. Walk through the problem, the common mistake, your method, the steps, and the result. Teaching real, practical delivery method demonstrates hard-won capability that separates a senior PM from someone with a certification and a Gantt chart.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full delivery-method carousel from your experience, so your practical capability becomes visible expertise.",
      },
      {
        step_number: 5,
        title: "Share the people side of delivery",
        description:
          "Projects fail on politics and communication far more than on process, and content about that reality resonates deeply. Share how you influence without authority, handle a difficult stakeholder, deliver bad news well. This positions you as a PM who understands that delivery is fundamentally about people — exactly the maturity that senior programme roles are hired for and that no certification tests.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs mixes the people-and-politics side of delivery into your idea feed, so your content reflects what actually determines project success.",
      },
      {
        step_number: 6,
        title: "Stay visible through delivery pressure",
        description:
          "Delivery is relentless — deadlines, escalations, stakeholder demands — so personal content is the first thing dropped. Batch a week of posts in one session so your reputation keeps building regardless of project pressure. Consistency compounds into the recruiter interest and consulting opportunities that follow visible PMs, while equally capable but invisible ones watch those opportunities go elsewhere.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your reputation keeps building through delivery pressure and escalations.",
      },
      {
        step_number: 7,
        title: "Present clearly — it's your core competency",
        description:
          "Clear communication of complex things is literally the PM job, so your carousels should demonstrate it. A clean, consistent, well-structured visual identity makes your methods easy to follow and proves the communication skill you're hired for. Lock in your template once so every teaching carousel carries that clarity — because a feed that communicates complexity cleanly is a live demonstration of exactly your competency.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clear and consistent, so your feed demonstrates the communication skill PMs are hired for.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, project managers accumulated genuinely hard-won delivery wisdom that stayed entirely invisible. Delivery pressure — deadlines, escalations, stakeholder chaos — left nothing for building a reputation. The real situations you navigated, the politics you handled, the projects you rescued, all stayed in status reports. When you posted, it was methodology summaries indistinguishable from a textbook. Meanwhile senior programme roles and consulting went to PMs who'd made their practitioner thinking visible.",
    after_carouselabs:
      "With CarouseLabs, your delivery wisdom becomes visible seniority. A real situation becomes a teaching carousel that marks you as a practitioner, not a certificate holder. A hook naming why projects really fail resonates with peers living those dynamics. Your method demonstrates hard-won capability. Your people-and-politics content reflects what actually determines delivery success. Because you batch a week in one session, your reputation keeps building through delivery pressure — compounding into the roles and consulting you'd been watching go elsewhere.",
    time_to_first_post:
      "About 20 minutes including onboarding — most PMs turn one delivery situation into a first carousel the same day.",
    quick_wins: [
      "Your first practitioner carousel that marks you as senior, not just certified.",
      "A post naming why projects really fail that resonates with peers living it.",
      "Your first recruiter or consulting enquiry from finally making your delivery wisdom visible.",
    ],
  },
  "business-analysts": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Define the analysis expertise you want known for",
        description:
          "Business analysis is broad and often misunderstood, so pick your focus: requirements and discovery, process improvement, data-driven decision support, a specific domain. Anchor your content there. A BA known for a specific analytical capability attracts better roles than one seen as a requirements scribe — and in a field fighting a documentation-clerk perception, visible strategic thinking is what changes your trajectory.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content focused on your analysis specialty, so your feed builds a reputation for strategic thinking, not documentation.",
      },
      {
        step_number: 2,
        title: "Show the thinking, not the deliverables",
        description:
          "Your value isn't the requirements document — it's the questioning that revealed what the business actually needed. Keep a note of the moments where your analysis changed a decision: the assumption you challenged, the real problem you uncovered, the solution nobody had considered. Showing that reasoning proves you're a strategic partner rather than a note-taker, which is exactly the perception shift your career depends on.",
        time_required: "10 min per insight",
        carouselabs_tip:
          "CarouseLabs turns an analysis insight into a carousel, so your strategic thinking — not your documents — becomes visible.",
      },
      {
        step_number: 3,
        title: "Write hooks that reframe how people see problems",
        description:
          "BA hooks land when they demonstrate diagnostic skill: 'They asked for a new dashboard. The real problem was that nobody trusted the data — a dashboard would have made it worse.' Showing how you find the actual problem behind the stated request is exactly what a great BA does, and naming it publicly proves your value far better than any description of your role could.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that demonstrate diagnostic reframing, so your posts prove the analytical skill that defines a great BA.",
      },
      {
        step_number: 4,
        title: "Build a carousel that teaches an analysis method",
        description:
          "Structure a carousel around one method: how to run discovery that surfaces real needs, how to challenge a stakeholder's assumption diplomatically, how to map a process honestly. Walk through the problem, the common mistake, your method, the steps, and the outcome. Teaching real analytical method demonstrates capability that separates a strategic BA from someone transcribing requirements into a template.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full analysis-method carousel from your expertise, so your capability becomes visible strategic credibility.",
      },
      {
        step_number: 5,
        title: "Share the stakeholder and politics reality",
        description:
          "Analysis fails on politics far more than on technique — the stakeholder with a pet solution, the department protecting its process, the requirement that's really a power play. Content about navigating that reality resonates deeply with peers and demonstrates the maturity senior BA and product roles require. It shows you understand that analysis is a human discipline, not a documentation exercise.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs mixes stakeholder-politics angles into your idea feed, so your content reflects what actually determines whether analysis succeeds.",
      },
      {
        step_number: 6,
        title: "Stay visible despite project demands",
        description:
          "Project work is relentless, so personal content is the first thing dropped. Batch a week of posts in one session so your reputation keeps building regardless of workload. Consistency compounds into the recruiter interest and senior opportunities that follow visible BAs, while equally capable but invisible analysts stay stuck in the requirements-clerk perception their actual work has long outgrown.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your reputation keeps building through relentless project demands.",
      },
      {
        step_number: 7,
        title: "Present complex ideas with clean, clear visuals",
        description:
          "Making complexity clear is core to the BA job, so your carousels should demonstrate it. A clean, consistent, well-structured visual identity makes your methods easy to follow and proves the communication skill you're hired for. Lock in your template once so every insight carousel carries that clarity — a live demonstration of exactly the competency that makes a BA valuable.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clear and consistent, so your feed demonstrates the clarity BAs are hired for.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, business analysts did genuinely strategic work and were perceived as documentation clerks. The questioning that uncovered real problems, the assumptions you challenged, the decisions your analysis changed — all of it stayed inside requirements documents nobody credited you for. Project demands left no time to build a reputation, so senior roles went to analysts who'd made their thinking visible. Your strategic value was real; the perception of your role never caught up to it.",
    after_carouselabs:
      "With CarouseLabs, your strategic thinking becomes visible. An analysis insight becomes a carousel proving you're a partner, not a note-taker. A diagnostic-reframing hook proves the skill that defines a great BA. Your method demonstrates capability beyond templates. Your stakeholder-politics content shows you understand analysis as a human discipline. Because you batch a week in one session, your reputation keeps building through project demands — and the requirements-clerk perception finally starts to shift.",
    time_to_first_post:
      "About 20 minutes including onboarding — most BAs turn one analysis insight into a first carousel the same day.",
    quick_wins: [
      "Your first insight carousel that proves you're a strategic partner, not a requirements scribe.",
      "A diagnostic post that demonstrates the reframing skill defining a great analyst.",
      "Your first recruiter or senior-role enquiry from finally making your thinking visible.",
    ],
  },
  "biotech-founders": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Decide how to tell a decade-long science story",
        description:
          "Biotech timelines are brutal — years of research before anything visible — so decide the narrative that carries through them: the problem you exist to solve, the science that makes it possible, the milestones that mark real progress. Investors and talent in this space understand long timelines but need to see momentum. A founder who narrates the science journey compellingly keeps believers engaged across years when nothing is shippable.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs helps you build a narrative arc around your science, so your feed shows momentum across biotech's decade-long timelines.",
      },
      {
        step_number: 2,
        title: "Translate your science without dumbing it down",
        description:
          "Your research is genuinely complex, and most people — including generalist investors and potential hires — can't parse it. Keep a note of the core concepts and practice explaining each accessibly while keeping the rigor. This translation skill is rare in biotech founders and enormously valuable: it's what turns impenetrable science into a story investors fund and scientists want to join.",
        time_required: "10 min per concept",
        carouselabs_tip:
          "CarouseLabs turns complex science into an accessible carousel that keeps its rigor, so your research becomes a story people can back.",
      },
      {
        step_number: 3,
        title: "Write hooks that make the mission feel urgent",
        description:
          "Biotech hooks land when they connect science to human stakes: 'This disease affects 30 million people. The reason there's no treatment isn't money — it's a technical problem we think we've solved.' Leading with the human stake and the specific technical insight makes years of lab work feel urgent and fundable, which is exactly what sustains attention across a long, invisible development timeline.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks connecting your science to human stakes, so years of lab work feel urgent and worth following.",
      },
      {
        step_number: 4,
        title: "Build a carousel that explains why this is hard",
        description:
          "Structure a carousel around one scientific challenge: why this problem resisted solutions, what previous approaches missed, why your approach might work. Walk through the problem, the failed approaches, your insight, and the implication. Explaining the difficulty honestly builds credibility with sophisticated investors and scientists, who are deeply skeptical of biotech that oversells — and it makes your progress meaningful rather than abstract.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full science-explainer carousel from your notes, so your technical depth becomes credible content investors and scientists respect.",
      },
      {
        step_number: 5,
        title: "Be rigorous about what you haven't proven",
        description:
          "Biotech has a hype problem and a corresponding credibility crisis. Being scrupulously honest about what's proven, what's promising, and what's still uncertain differentiates you profoundly with the sophisticated investors and scientists who matter. Overclaiming might attract attention, but it repels exactly the people whose belief you need — and in a field where results eventually speak, integrity compounds.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape rigorous, appropriately-hedged content, so your feed builds credibility in a field with a hype problem.",
      },
      {
        step_number: 6,
        title: "Sustain visibility across capital-heavy timelines",
        description:
          "You're building for a decade with long stretches of invisible progress, and going quiet lets believers drift away. Batch a week of posts in one session so momentum stays visible regardless of where you are in the research cycle. Consistency across years is what keeps patient investors engaged, mission-driven scientists interested, and your narrative alive through the long middle where nothing is shippable.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your momentum stays visible through the long, invisible middle of a biotech timeline.",
      },
      {
        step_number: 7,
        title: "Present science with clean, credible visuals",
        description:
          "Your audience includes scientists and sophisticated investors who read polish as rigor and flash as a warning sign. A clean, professional, understated visual identity signals scientific seriousness. Lock in your template once so every science explainer carries that credible polish — letting the substance lead, which is exactly what a technically sophisticated audience requires before they'll take you seriously.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clean and credible, so your feed signals scientific rigor rather than hype.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, biotech founders built for a decade in near-total silence. The science was genuinely complex, so translating it took real effort you didn't have while running experiments and chasing capital. Long invisible stretches meant believers drifted away, and the mission that could have attracted patient investors and mission-driven scientists stayed locked in papers and pitch decks. Meanwhile hype-driven biotech shaped the public narrative, and your rigorous work went unnoticed through the years it most needed support.",
    after_carouselabs:
      "With CarouseLabs, your science becomes a story people can back. A complex concept becomes an accessible carousel that keeps its rigor. A hook connecting science to human stakes makes years of lab work feel urgent. Your explanation of why the problem is hard builds credibility with sophisticated audiences. Your rigor about what's unproven differentiates you in a field with a hype problem. Because you batch a week in one session, momentum stays visible through the long, invisible middle — keeping believers engaged across a decade.",
    time_to_first_post:
      "About 20 minutes including onboarding — most biotech founders turn one science concept into an accessible first carousel the same day.",
    quick_wins: [
      "Your first science carousel that makes complex research accessible without losing rigor.",
      "Visible momentum through a stretch where nothing is shippable — keeping believers engaged.",
      "Your first inbound from a patient investor or scientist who says your mission made them care.",
    ],
  },
  "medtech-founders": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Lead with the clinical problem, not the device",
        description:
          "MedTech founders default to describing their technology, but clinicians and investors care about the clinical problem and outcome. Decide the patient or clinician problem you solve and anchor everything there. In a field where adoption depends on clinical credibility, a founder who leads with the problem — and demonstrates they understand clinical reality — earns the trust that technology descriptions never will.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content anchored to the clinical problem you solve, so your feed earns clinical credibility rather than describing a device.",
      },
      {
        step_number: 2,
        title: "Turn clinical insight into content",
        description:
          "You sit between engineering and clinical reality, learning what clinicians actually need versus what technologists assume. Keep a note of these insights — the workflow that breaks, the assumption MedTech gets wrong, the thing that genuinely helps. Sharing real clinical understanding proves you build with clinicians rather than at them, which is exactly the credibility that determines whether a hospital will ever adopt your product.",
        time_required: "10 min, weekly",
        carouselabs_tip:
          "CarouseLabs turns a clinical insight into a carousel, so your feed proves you build with clinicians rather than at them.",
      },
      {
        step_number: 3,
        title: "Write hooks about the clinical stakes",
        description:
          "MedTech hooks land when they name a real clinical consequence: 'This diagnostic delay costs lives, and the reason it happens has nothing to do with doctors.' Leading with patient impact and a specific systemic insight speaks to clinicians and investors alike. Because MedTech content is usually device specs, leading with clinical stakes and real understanding stands out immediately to the people who actually decide adoption.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks leading with clinical stakes, so your posts reach clinicians rather than reading as device marketing.",
      },
      {
        step_number: 4,
        title: "Build a carousel that demonstrates clinical rigor",
        description:
          "Structure a carousel around one clinical or regulatory reality: what your evidence actually shows, why the regulatory pathway matters, how you validated safety. Walk through the question, the standard, your approach, and the implication. Demonstrating rigor rather than making claims is what earns clinical trust — and in a field where overclaiming is both common and dangerous, visible rigor is a genuine differentiator.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full clinical-rigor carousel from your notes, so your evidence and process become visible credibility.",
      },
      {
        step_number: 5,
        title: "Share the reality of building in a regulated, high-stakes field",
        description:
          "MedTech is uniquely hard — regulatory pathways, clinical validation, hospital procurement, patient safety. Honestly documenting that journey builds a following of fellow founders, attracts mission-driven talent, and signals to investors that you understand what you've taken on. Your regulatory battle scars prove you can build where most startups can't survive, which is exactly what sophisticated MedTech investors look for.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs turns a regulatory or clinical war story into a post, so the hardest parts of MedTech become content that builds your reputation.",
      },
      {
        step_number: 6,
        title: "Stay consistent through long clinical and sales cycles",
        description:
          "MedTech timelines are brutal — validation, regulatory approval, hospital procurement can take years. Batch a week of posts in one session so your presence and credibility hold across those cycles. The clinician or investor forming an impression of you now may act two years from now, so consistency across that window is exactly when a visible, trusted founder brand does its most valuable work.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your credibility holds across MedTech's multi-year validation and procurement cycles.",
      },
      {
        step_number: 7,
        title: "Present with clinical-grade credibility",
        description:
          "Your audience is clinicians and sophisticated investors who read polish as rigor and flash as a red flag. A clean, professional, restrained visual identity signals the seriousness that patient-safety work demands. Lock in your template once so every clinical carousel carries that credible polish — quietly reinforcing that you approach your product with the same rigor you show in your content.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clean and credible, so your feed signals the rigor patient-safety work demands.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, MedTech founders built in one of the hardest markets while their clinical credibility stayed invisible. Regulatory work, validation, and product demands consumed everything, so the clinical understanding that would have won clinician trust never became content. Hospitals and clinicians — deeply skeptical of technologists who don't understand their reality — had no way to know you did. Your feed, if it existed, read as device marketing, and trust went unbuilt across procurement cycles that lasted years.",
    after_carouselabs:
      "With CarouseLabs, your clinical credibility becomes visible. An insight from clinicians becomes a carousel proving you build with them, not at them. A hook leading with clinical stakes reaches the people who decide adoption. Your evidence becomes a rigor carousel that earns trust in a field where overclaiming is dangerous. Your regulatory journey proves you can build where most startups can't survive. Because you batch a week in one session, your credibility holds across multi-year validation and procurement cycles.",
    time_to_first_post:
      "About 20 minutes including onboarding — most MedTech founders turn one clinical insight into a first carousel the same day.",
    quick_wins: [
      "Your first carousel proving you understand clinical reality rather than just building devices.",
      "Visible credibility that holds across years-long validation and procurement cycles.",
      "Your first inbound from a clinician or investor who trusts your clinical rigor.",
    ],
  },
  "legaltech-founders": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Lead with the legal problem, not the technology",
        description:
          "Lawyers are famously skeptical of technology sold at them, so lead with the legal work problem you solve and demonstrate you actually understand practice. Decide the specific pain — document review time, client communication, matter management, access to justice — and anchor content there. A founder who visibly understands legal practice earns credibility that no feature list will, and credibility is what unlocks a conservative market.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content anchored to the legal problem you solve, so your feed earns credibility with a skeptical profession.",
      },
      {
        step_number: 2,
        title: "Turn what lawyers tell you into content",
        description:
          "You hear what actually frustrates legal professionals — the workflow that wastes hours, the assumption LegalTech gets wrong, the thing that genuinely helps. Keep a note of these insights. Sharing real understanding of legal practice proves you build with lawyers rather than at them, which matters enormously in a profession that has been sold ill-fitting technology for decades and has learned to distrust it.",
        time_required: "10 min, weekly",
        carouselabs_tip:
          "CarouseLabs turns an insight from lawyers into a carousel, so your feed proves you build with the profession rather than at it.",
      },
      {
        step_number: 3,
        title: "Write hooks that name legal work's real frustrations",
        description:
          "LegalTech hooks land when they name a frustration lawyers feel daily: 'Associates spend 40% of their time on work that shouldn't require a law degree.' Naming the real waste in legal practice earns instant recognition from the profession and signals you understand their world. Because most LegalTech content is feature marketing, speaking to actual practice frustration stands out immediately to the people who'd buy.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks naming legal practice's real frustrations, so your posts reach lawyers rather than reading as feature marketing.",
      },
      {
        step_number: 4,
        title: "Build a carousel that respects the profession's rigor",
        description:
          "Structure a carousel around one substantive idea: how a legal workflow could work better, what technology can and can't responsibly do in legal work, where the profession's caution is justified. Walk through the problem, the naive tech answer, the nuance, and the realistic path. Respecting legal rigor — rather than promising to disrupt lawyers — is exactly what earns a conservative profession's trust.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full carousel from your notes, so your content respects legal rigor rather than promising to disrupt the profession.",
      },
      {
        step_number: 5,
        title: "Be honest about technology's limits in legal work",
        description:
          "LegalTech overpromises constantly, and lawyers — trained to spot overclaiming — find it disqualifying. Being honest about what your technology can't do, where human judgment is irreplaceable, and where caution is warranted builds extraordinary trust. In a profession where the cost of being wrong is enormous, a founder who acknowledges limits is far more credible than one promising to replace judgment.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape honest, appropriately-limited claims, so your feed earns trust from a profession trained to spot overclaiming.",
      },
      {
        step_number: 6,
        title: "Stay consistent through slow, conservative buying",
        description:
          "Legal buying is famously slow — firms are risk-averse and decisions crawl through committees. Batch a week of posts in one session so your credibility holds across that long window. The partner forming an impression of you now might buy in eighteen months, so sustained visibility is exactly when a trusted founder brand does its most valuable work in this market.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your credibility holds across legal's famously slow, conservative buying cycles.",
      },
      {
        step_number: 7,
        title: "Present with the professionalism the profession expects",
        description:
          "Lawyers judge professionalism instinctively and read sloppiness as a warning. A clean, restrained, credible visual identity signals that you understand their world's standards. Lock in your template once so every carousel carries that polish — quietly signalling that you'd bring the same rigor to a product handling matters where the cost of error is enormous.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clean and professional, so your feed meets the standards lawyers expect.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, LegalTech founders faced a profession that had been sold ill-fitting technology for decades and had learned to distrust all of it. Product and slow enterprise sales consumed everything, so the genuine understanding of legal practice that would have earned credibility never became content. Lawyers saw another founder promising to disrupt them with feature marketing, and the trust this conservative market runs on went unbuilt across buying cycles that crawled for eighteen months.",
    after_carouselabs:
      "With CarouseLabs, your understanding of legal practice becomes visible. An insight from lawyers becomes a carousel proving you build with the profession, not at it. A hook naming real practice frustration earns instant recognition. Your content respects legal rigor rather than promising disruption. Your honesty about technology's limits earns trust from people trained to spot overclaiming. Because you batch a week in one session, your credibility holds across the slow, conservative buying cycles where trust decides everything.",
    time_to_first_post:
      "About 20 minutes including onboarding — most LegalTech founders turn one practice insight into a first carousel the same day.",
    quick_wins: [
      "Your first carousel proving you understand legal practice rather than promising to disrupt it.",
      "Credibility that holds across the eighteen-month buying cycles legal firms actually run on.",
      "Your first inbound from a lawyer or firm who trusts that you get their world.",
    ],
  },
  "proptech-founders": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Lead with the property problem, not the platform",
        description:
          "Real estate is a relationship-driven, technology-resistant industry, so lead with the problem you solve for people in it — agents, landlords, buyers, property managers — rather than your platform. Decide that specific pain and anchor content there. A founder who visibly understands how the industry actually works earns credibility that feature marketing never will, and credibility is what opens a notoriously change-averse market.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content anchored to the property problem you solve, so your feed earns credibility with a change-averse industry.",
      },
      {
        step_number: 2,
        title: "Turn industry insight into content",
        description:
          "You sit between technology and an old, relationship-driven industry, learning what practitioners actually need versus what technologists assume. Keep a note of these insights — the workflow that's genuinely broken, the assumption PropTech gets wrong, where the industry's resistance is actually justified. Sharing this proves you build with the industry rather than at it, which is exactly the credibility PropTech founders usually lack.",
        time_required: "10 min, weekly",
        carouselabs_tip:
          "CarouseLabs turns an industry insight into a carousel, so your feed proves you understand property rather than just building software for it.",
      },
      {
        step_number: 3,
        title: "Write hooks that name real industry pain",
        description:
          "PropTech hooks land when they name a frustration practitioners feel: 'Agents spend more time on admin than with clients, and every tool sold to fix it added more admin.' Naming the real, lived pain — including PropTech's own failures — earns instant recognition and signals you're different. Because the industry has been disappointed repeatedly, honest acknowledgment is a genuine differentiator.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks naming the industry's real pain, so your posts reach practitioners rather than reading as another platform pitch.",
      },
      {
        step_number: 4,
        title: "Build a carousel that respects how the industry works",
        description:
          "Structure a carousel around one substantive idea: why a workflow persists, what technology can realistically change, where relationships will always matter more than software. Walk through the problem, the naive tech answer, the industry reality, and the realistic path. Respecting how property actually works — rather than promising to disrupt it — is exactly what earns a skeptical industry's trust.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full carousel from your notes, so your content respects industry reality rather than promising to disrupt it.",
      },
      {
        step_number: 5,
        title: "Be honest about what technology won't change",
        description:
          "PropTech has overpromised disruption for a decade while real estate remained stubbornly relationship-driven. Being honest that technology augments rather than replaces relationships, and that some resistance is rational, builds real trust. In an industry tired of founders who've never done a deal telling them they're obsolete, honest humility is remarkably differentiating and opens doors that hype closes.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape honest, realistic claims, so your feed earns trust from an industry tired of disruption promises.",
      },
      {
        step_number: 6,
        title: "Stay consistent through slow industry adoption",
        description:
          "Real estate adopts slowly and buys on relationships built over time. Batch a week of posts in one session so your presence and credibility hold across that long window. The broker or portfolio owner forming an impression now might adopt a year later, so sustained visibility is precisely when a trusted founder brand does its most valuable work in a relationship-driven market.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your credibility holds across real estate's slow, relationship-driven adoption cycles.",
      },
      {
        step_number: 7,
        title: "Present with credible, industry-appropriate polish",
        description:
          "Your audience mixes property professionals and investors, both of whom read polish as competence. A clean, professional visual identity signals seriousness without the startup flash that makes traditional industry people suspicious. Lock in your template once so every insight carousel carries credible polish — signalling you're building something durable for the industry rather than chasing a trend.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clean and credible, so your feed signals durability rather than startup hype.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, PropTech founders faced an industry that had heard 'we're disrupting real estate' for a decade and watched it not happen. Product and slow enterprise sales consumed everything, so the genuine industry understanding that would have earned credibility never became content. Agents and owners saw another technologist who'd never done a deal telling them they were obsolete, and the relationship-based trust this industry runs on went completely unbuilt.",
    after_carouselabs:
      "With CarouseLabs, your industry understanding becomes visible. An insight from practitioners becomes a carousel proving you build with the industry, not at it. A hook naming real pain — including PropTech's own failures — earns instant recognition. Your content respects how property actually works rather than promising disruption. Your honesty about technology's limits differentiates you from a decade of hype. Because you batch a week in one session, your credibility holds across the slow, relationship-driven adoption this market runs on.",
    time_to_first_post:
      "About 20 minutes including onboarding — most PropTech founders turn one industry insight into a first carousel the same day.",
    quick_wins: [
      "Your first carousel proving you understand property rather than promising to disrupt it.",
      "Credibility that holds across the slow, relationship-driven adoption real estate runs on.",
      "Your first inbound from an agent, broker, or owner who trusts that you get their world.",
    ],
  },
  "hrtech-founders": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Lead with the people problem, not the platform",
        description:
          "HR buyers have been sold endless tools that added admin instead of removing it, so lead with the human and organizational problem you solve. Decide the specific pain — hiring bias, turnover, onboarding, engagement measurement — and anchor content there. A founder who visibly understands both the people reality and the HR buyer's world earns credibility that feature marketing never will in a market with genuine tool fatigue.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs keeps your content anchored to the people problem you solve, so your feed earns credibility with tool-fatigued HR buyers.",
      },
      {
        step_number: 2,
        title: "Turn what HR leaders tell you into content",
        description:
          "You hear what actually frustrates HR teams — the tool that created more work, the metric that measures nothing, the process everyone hates. Keep a note of these insights. Sharing real understanding of HR reality proves you build with practitioners rather than at them, which matters enormously to buyers who've been burned by vendors who clearly never sat in an HR seat.",
        time_required: "10 min, weekly",
        carouselabs_tip:
          "CarouseLabs turns an insight from HR leaders into a carousel, so your feed proves you build with practitioners rather than at them.",
      },
      {
        step_number: 3,
        title: "Write hooks that name organizational truths",
        description:
          "HRTech hooks land when they name something everyone in HR feels: 'Your engagement survey isn't measuring engagement. It's measuring who feels safe answering honestly.' Naming an uncomfortable organizational truth signals genuine understanding and sparks discussion. Because most HRTech content is feature marketing, speaking to the real dynamics of work stands out immediately to the buyers you need.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that name uncomfortable organizational truths, so your posts reach HR leaders rather than reading as vendor marketing.",
      },
      {
        step_number: 4,
        title: "Build a carousel that demonstrates real understanding",
        description:
          "Structure a carousel around one substantive idea: why turnover actually happens, what a hiring process really screens for, where technology helps and where it makes things worse. Walk through the problem, the naive answer, the reality, and the realistic path. Demonstrating genuine organizational understanding earns HR buyers' trust far better than any product claim.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full carousel from your notes, so your organizational understanding becomes visible credibility with HR buyers.",
      },
      {
        step_number: 5,
        title: "Be honest about where technology makes things worse",
        description:
          "HRTech has a real credibility problem — tools that surveil rather than support, algorithms that encode bias, dashboards that measure the wrong things. Being honest about these failures, including where your own category can do harm, builds extraordinary trust with thoughtful HR leaders. In a market this cynical, a founder who acknowledges the field's genuine problems is far more credible than one selling optimism.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape honest takes on HRTech's failures, so your feed earns trust from a deeply cynical buyer market.",
      },
      {
        step_number: 6,
        title: "Stay consistent through long HR buying cycles",
        description:
          "HR software decisions are slow — budget cycles, committee approval, procurement. Batch a week of posts in one session so your credibility holds across that window. The HR leader forming an impression now might buy next budget year, so sustained visibility across a long cycle is exactly when a trusted founder brand does its most valuable work in this market.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your credibility holds across HR's long budget and procurement cycles.",
      },
      {
        step_number: 7,
        title: "Present with professional, people-first polish",
        description:
          "Your buyers are HR professionals who value both rigor and humanity. A clean, warm-but-professional visual identity signals that you understand both the business and the people dimension. Lock in your template once so every insight carousel carries that polish — quietly signalling that you'd bring the same thoughtfulness to a product that affects how people experience their work.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel professional and human, so your feed reflects both rigor and people-first values.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, HRTech founders sold into a market with genuine tool fatigue — HR leaders had been given endless platforms that added admin instead of removing it. Product and slow enterprise sales consumed everything, so the real organizational understanding that would have earned credibility never became content. Buyers saw another vendor who'd clearly never sat in an HR seat, and the trust this cynical market runs on went unbuilt across budget cycles that lasted a year.",
    after_carouselabs:
      "With CarouseLabs, your organizational understanding becomes visible. An insight from HR leaders becomes a carousel proving you build with practitioners, not at them. A hook naming an uncomfortable workplace truth reaches buyers rather than reading as vendor marketing. Your content demonstrates genuine understanding of why turnover and hiring actually work the way they do. Your honesty about HRTech's failures earns trust in a cynical market. Because you batch a week in one session, your credibility holds across long budget cycles.",
    time_to_first_post:
      "About 20 minutes including onboarding — most HRTech founders turn one organizational insight into a first carousel the same day.",
    quick_wins: [
      "Your first carousel proving you understand HR reality rather than selling another tool.",
      "An honest post about HRTech's failures that earns trust in a deeply cynical market.",
      "Your first inbound from an HR leader who trusts that you actually get their world.",
    ],
  },
  "cleantech-founders": {
    how_to_steps: [
      {
        step_number: 1,
        title: "Decide how to tell a decade-long climate story",
        description:
          "CleanTech timelines are brutal — capital-intensive, slow, with years between visible milestones. Decide the narrative that carries through: the climate problem you exist to solve, why now is the moment, and what real progress looks like. Investors and talent in this space understand long timelines but need to see momentum and conviction. A founder who narrates the mission compellingly keeps believers engaged across years when nothing ships.",
        time_required: "20 min, once",
        carouselabs_tip:
          "CarouseLabs helps you build a narrative arc around your mission, so your feed shows momentum across CleanTech's decade-long timelines.",
      },
      {
        step_number: 2,
        title: "Translate your science and engineering accessibly",
        description:
          "Your technology is genuinely complex, and most people — including generalist investors and potential hires — can't parse it. Keep a note of the core concepts and practice explaining each clearly while keeping the rigor. This translation is rare among deep-tech founders and enormously valuable: it turns impenetrable engineering into a mission investors fund and mission-driven engineers want to join.",
        time_required: "10 min per concept",
        carouselabs_tip:
          "CarouseLabs turns complex climate tech into an accessible carousel that keeps its rigor, so your work becomes a mission people can back.",
      },
      {
        step_number: 3,
        title: "Write hooks that make the climate stake concrete",
        description:
          "CleanTech hooks land when they make abstract climate urgency specific: 'This one industrial process emits more than all aviation. Almost nobody is working on it.' Leading with a concrete, surprising stake and a specific technical insight makes years of hard engineering feel urgent and fundable — which is exactly what sustains attention across a long, capital-heavy development timeline.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs generates hooks that make climate stakes concrete and specific, so your engineering work feels urgent and worth following.",
      },
      {
        step_number: 4,
        title: "Build a carousel that explains why this is hard",
        description:
          "Structure a carousel around one technical or economic challenge: why this problem resisted solutions, what previous approaches missed, why yours might work, what the unit economics require. Walk through the problem, the failed approaches, your insight, and the implication. Explaining the difficulty honestly builds credibility with sophisticated climate investors, who are deeply skeptical of CleanTech that oversells and has burned them before.",
        time_required: "20 min",
        carouselabs_tip:
          "CarouseLabs builds the full technical-explainer carousel from your notes, so your depth becomes content sophisticated climate investors respect.",
      },
      {
        step_number: 5,
        title: "Be honest about timelines and what's unproven",
        description:
          "CleanTech has a history of overpromising and a corresponding credibility problem with investors who've been burned. Being scrupulously honest about what's proven, what's promising, and how long things actually take differentiates you profoundly with the patient capital that matters. In a field where physics doesn't care about your pitch deck, rigor and honesty compound into the trust that funds decade-long bets.",
        time_required: "10 min",
        carouselabs_tip:
          "CarouseLabs helps you shape rigorous, honest content about timelines and uncertainty, so your feed attracts patient capital rather than hype.",
      },
      {
        step_number: 6,
        title: "Sustain momentum across capital-heavy timelines",
        description:
          "You're building for a decade with long stretches of invisible progress, and going quiet lets believers drift. Batch a week of posts in one session so momentum stays visible regardless of where you are in the build cycle. Consistency across years is what keeps patient investors engaged, mission-driven engineers interested, and your narrative alive through the long middle where nothing is demonstrable.",
        time_required: "50 min for a week",
        carouselabs_tip:
          "CarouseLabs lets you batch a week at once, so your momentum stays visible through the long, invisible middle of a CleanTech timeline.",
      },
      {
        step_number: 7,
        title: "Present with clean, serious, credible visuals",
        description:
          "Your audience includes engineers and sophisticated climate investors who read polish as rigor and flash as a warning. A clean, professional, understated visual identity signals technical seriousness. Lock in your template once so every explainer carries that credible polish — letting the substance lead, which is exactly what a technically sophisticated, previously-burned audience requires before they'll believe you.",
        time_required: "15 min first time, automatic after",
        carouselabs_tip:
          "Upload one reference and CarouseLabs keeps every carousel clean and credible, so your feed signals technical rigor rather than climate hype.",
      },
    ],
    before_carouselabs:
      "Before CarouseLabs, CleanTech founders built for a decade in near-silence. The technology was genuinely complex, so translating it took effort you didn't have while running a capital-intensive build. Long invisible stretches meant believers drifted away, and the mission that could have attracted patient investors and mission-driven engineers stayed locked in technical docs and pitch decks. Meanwhile hype-driven climate narratives shaped the conversation, and your rigorous work went unnoticed through the years it most needed support.",
    after_carouselabs:
      "With CarouseLabs, your mission becomes a story people can back. Complex climate tech becomes an accessible carousel that keeps its rigor. A hook making the climate stake concrete turns hard engineering into something urgent and fundable. Your explanation of why the problem is hard builds credibility with investors burned by overpromising. Your honesty about timelines attracts patient capital rather than hype. Because you batch a week in one session, momentum stays visible through the long, invisible middle — keeping believers engaged across a decade.",
    time_to_first_post:
      "About 20 minutes including onboarding — most CleanTech founders turn one technical concept into an accessible first carousel the same day.",
    quick_wins: [
      "Your first carousel that makes complex climate tech accessible without losing rigor.",
      "Visible momentum through a stretch where nothing is demonstrable — keeping believers engaged.",
      "Your first inbound from patient capital or a mission-driven engineer who says your mission made them care.",
    ],
  },
}
