import type { PostingDay, StrategyPillar } from "./data"

/**
 * Per-niche content that powers the /strategy/[slug] pages. Kept in its own
 * module so the large body of strategy content stays separate from the base
 * niche records in ./data.ts, where it is merged into the exported `niches`
 * array by slug.
 *
 * Every slug in data.ts must have a matching entry here — the merge throws at
 * build time if one is missing.
 *
 * Note on posting_schedule: schedules are intentionally realistic per niche
 * (3–5 real posts a week plus engagement / planning days) rather than forcing
 * seven daily posts, which would contradict the cadence advice on the how-to
 * pages. The `format` field uses the product's real surfaces — Carousel,
 * Caption, Image — plus Engagement / Planning / Rest for non-posting days.
 */
export interface StrategyContent {
  strategy_pillars: StrategyPillar[]
  posting_schedule: PostingDay[]
  growth_tactics: string[]
  common_strategy_mistakes: string[]
  ideal_audience: string
}

export const strategyContent: Record<string, StrategyContent> = {
  "saas-founders": {
    ideal_audience:
      "The people who can move your business: other founders who become peers and amplifiers, the B2B buyers you sell to (heads of ops, engineering, and growth), and the operators and investors who fund and join great companies. On LinkedIn these decision-makers are reachable in the same scroll — so you are not building a generic following, you are building an audience of people who can buy, hire you, work for you, or write about you.",
    strategy_pillars: [
      {
        pillar: "Metrics & Traction",
        description:
          "Post the exact number that moved and the single change behind it — MRR, churn, activation, payback. Specific numbers build more credibility than any claim because they prove you actually operate the business, and they give other founders something concrete to reverse-engineer. This is your highest-trust, most-saved content.",
        post_frequency: "1x per week",
        example_topic:
          "\"We cut churn from 6% to 3.6% in 60 days. It wasn't a feature — it was a 3-step activation checklist.\"",
      },
      {
        pillar: "Build-in-Public Decisions",
        description:
          "Narrate the product and business decisions as they happen — the feature you killed, the pricing you changed, the bet you're making. This gives prospects a reason to root for you long before they buy and lets investors watch your judgment develop in public, which is the thing they're actually evaluating.",
        post_frequency: "1x per week",
        example_topic:
          "\"We killed our most-requested feature. Here's the retention data that made the call.\"",
      },
      {
        pillar: "Technical Made Simple",
        description:
          "Explain one technical concept per week in plain English for a non-technical buyer. This is what makes founders memorable to the ops leaders, journalists, and investors who can't follow jargon — you become the person who makes the complicated clear, which is a durable positioning advantage.",
        post_frequency: "1x per week",
        example_topic:
          "\"What 'activation rate' actually means for your business — and why it predicts churn better than NPS.\"",
      },
      {
        pillar: "Customer & Churn Lessons",
        description:
          "Turn support tickets, churn calls, and sales objections into teaching posts. The confusions your customers voice are the exact questions your future buyers are Googling right now, so this pillar quietly doubles as bottom-of-funnel content that pulls in demand.",
        post_frequency: "1x per week",
        example_topic:
          "\"The #1 reason customers churned last quarter wasn't price. It was a broken onboarding email.\"",
      },
      {
        pillar: "Founder POV & Contrarian Takes",
        description:
          "Stake out a clear, sometimes contrarian position on how SaaS should be built. Opinion sparks the comment debate the algorithm rewards and attracts the founders and operators who share your worldview — the ones who become your champions, hires, and referrals.",
        post_frequency: "1x per week",
        example_topic:
          "\"Most SaaS content is dry changelogs or hustle-porn. Here's the gap nobody's filling.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Founder POV", topic_idea: "A contrarian take on a SaaS norm to open the week and spark debate", format: "Caption" },
      { day: "Tuesday", content_type: "Metrics & Traction", topic_idea: "The number that moved this month and the one change behind it", format: "Carousel" },
      { day: "Wednesday", content_type: "Technical Made Simple", topic_idea: "One technical concept explained for a non-technical buyer", format: "Carousel" },
      { day: "Thursday", content_type: "Build-in-Public", topic_idea: "A real product or pricing decision and your reasoning", format: "Caption" },
      { day: "Friday", content_type: "Customer & Churn Lesson", topic_idea: "A support or churn insight reframed as a buyer lesson", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply to comments and comment on 5 other founders' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week's posts in one sitting; no publishing", format: "Planning" },
    ],
    growth_tactics: [
      "Spend the first 60 minutes after every post replying to every comment — early comment velocity is what pushes a B2B post into second-degree feeds, and founders under-do this.",
      "Comment substantively on 5 posts from other founders and your ideal buyers each morning; thoughtful comments on bigger accounts are the fastest way to borrow their audience.",
      "Pin your best traction carousel to your profile so the ~30% of profile visitors who arrive from comments immediately see proof, not a generic bio.",
      "Turn your highest-performing post each month into a slightly different carousel and repost it 6 weeks later — your best ideas deserve more than one impression window.",
      "End metric posts with a specific question ('Which of these is your weakest?') to manufacture the comments that signal relevance to the algorithm.",
    ],
    common_strategy_mistakes: [
      "Posting product changelogs as content — feature announcements only matter to existing users, not the buyers you're trying to reach. Fix: reframe every update as a customer-outcome story.",
      "Hiding behind the company brand account when people follow and trust founders, not logos. Fix: post from your personal profile in your own voice, face-forward.",
      "Waiting for a big milestone and going silent for weeks — consistency beats magnitude, and silence resets your reach. Fix: batch a week of small, real posts so you always ship.",
      "Stripping the specific numbers out of posts to look polished, which kills the exact credibility founder content runs on. Fix: keep the real metric front and center, even when it's unflattering.",
    ],
  },
  "fitness-coaches": {
    ideal_audience:
      "Time-poor, well-paid professionals who have the income to invest in coaching but keep abandoning generic gym plans and blaming their own willpower. They are not other coaches or fitness enthusiasts — they are the stressed manager, the founder, the parent who wants energy and confidence back and has failed five programs already. Your entire strategy should speak to that specific, warm, underserved person.",
    strategy_pillars: [
      {
        pillar: "Adherence & Psychology",
        description:
          "The core of your positioning: why people quit and how to build a plan that survives a real week. This reframes failure as a design problem rather than a willpower flaw, which is the exact message that reaches the professional who's failed before — and it's the conversation almost no other coach is having.",
        post_frequency: "2x per week",
        example_topic:
          "\"You didn't fall off because you're lazy. Your plan assumed a week that never happens.\"",
      },
      {
        pillar: "Myth-Busting with Science",
        description:
          "Debunk one fitness myth per week with the actual evidence — detoxes, fasted cardio, soreness-equals-progress. This positions you as the credible voice above the influencer noise and gives a discouraged reader permission to stop doing the thing that never worked.",
        post_frequency: "1x per week",
        example_topic:
          "\"Soreness isn't a sign of a good workout. Here's what the research actually says about DOMS.\"",
      },
      {
        pillar: "Client Transformation Stories",
        description:
          "Share client wins (with permission) but lead with the behavior change — the sleep habit, the 20-minute workout — not the before/after photo. Behavior-led stories prove a repeatable process, which is what a prospect needs to believe before they'll pay, whereas photos just attract other fitness people.",
        post_frequency: "1x per week",
        example_topic:
          "\"She restarted 5 times in a year. The fix wasn't discipline — it was a 20-minute workout that fit her life.\"",
      },
      {
        pillar: "Sustainable Systems",
        description:
          "Teach the boring, keepable habits you start every client with. This counters extreme-transformation content and attracts people who want a plan they can actually sustain — the clients who stay, get results, and become case studies.",
        post_frequency: "1x per week",
        example_topic:
          "\"The minimum viable workout: 20 minutes, 3x a week, that survives a stressful month.\"",
      },
      {
        pillar: "Behind-the-Scenes Coaching",
        description:
          "Document your own training honestly — including rest days and off weeks. Modeling the sustainable relationship with fitness you sell makes you believable and human, and believability is what turns a follower into a discovery call.",
        post_frequency: "1x per week",
        example_topic:
          "\"I skipped 3 sessions this week. Here's why that's part of the plan, not a failure.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Adherence & Psychology", topic_idea: "Why people quit in week two and the systems fix", format: "Carousel" },
      { day: "Tuesday", content_type: "Myth-Busting", topic_idea: "Debunk one common fitness myth with the science", format: "Carousel" },
      { day: "Wednesday", content_type: "Sustainable Systems", topic_idea: "A keepable habit that survives a busy week", format: "Caption" },
      { day: "Thursday", content_type: "Client Transformation", topic_idea: "A behavior-led client win (with permission)", format: "Image" },
      { day: "Friday", content_type: "Adherence & Psychology", topic_idea: "Reframe a common 'failure' as a coaching problem", format: "Caption" },
      { day: "Saturday", content_type: "Behind-the-Scenes", topic_idea: "Your own honest training/rest — light, human post", format: "Image" },
      { day: "Sunday", content_type: "Engage / plan", topic_idea: "Reply to comments, answer DMs, batch next week — no new post", format: "Engagement" },
    ],
    growth_tactics: [
      "Answer every comment with a follow-up question to extend the conversation — long comment threads on adherence posts are what the algorithm reads as genuine value.",
      "Spend 20 minutes a day commenting empathetically on posts from stressed professionals (not other coaches) in your target industries — that's where your buyers actually are.",
      "Reframe your best-performing myth-bust as a carousel each month and re-run it — myths are evergreen and your newer followers never saw the original.",
      "Put a soft CTA on transformation posts ('What's stopped you before?') to surface the exact objections you can address in the next post and in DMs.",
      "Pin a 'start here' carousel of your coaching philosophy so the professional who lands on your profile immediately understands you're different from the shame-and-hustle crowd.",
    ],
    common_strategy_mistakes: [
      "Posting only workout clips and transformation photos, which attract other fitness people and window-shoppers instead of buyers. Fix: lead with psychology and adherence angles.",
      "Using 'no excuses' motivation that shames the reader and ages badly. Fix: write empathetic, systems-based content that takes the blame off the client.",
      "Going silent during busy coaching blocks, so growth resets every time. Fix: batch a week of content on your lightest day so the feed never goes dark.",
      "Making every post about the workout instead of the outcome the client actually wants — energy, confidence, longevity. Fix: lead with the life change, not the exercise.",
    ],
  },
  "real-estate-agents": {
    ideal_audience:
      "People in your specific farm area who will buy or sell within the next 6–18 months, plus the much larger group of local homeowners who will move someday and are quietly deciding now which agent they already feel they know. You're not building a national following — you're becoming the recognized local name, so every follower in your zip code is worth more than a thousand strangers.",
    strategy_pillars: [
      {
        pillar: "Local Market Data",
        description:
          "Translate the MLS numbers you already pull into plain-English takeaways for real people. Nobody wants median-days-on-market; they want to know what it means for them. This positions you as the agent who reads the market rather than one who just lists in it — the single strongest trust signal you have.",
        post_frequency: "1x per week",
        example_topic:
          "\"Homes in [neighborhood] are selling 11 days faster than spring. Here's what that means if you're thinking of listing.\"",
      },
      {
        pillar: "Buyer & Seller Education",
        description:
          "Answer the questions clients ask you privately, in public — closing costs, why the highest offer isn't always best, Zillow's estimate. If one client is asking, hundreds of silent scrollers are wondering the same thing, and answering makes strangers feel you've already advised them.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"First-time buyers: the closing cost nobody warns you about — and the number to have ready.\"",
      },
      {
        pillar: "Neighborhood Spotlights",
        description:
          "Tour the areas you serve with the data behind why they're worth attention. These prove your street-level expertise and are endlessly shareable by residents who love where they live — the content that gets forwarded in local group chats, the warmest lead source there is.",
        post_frequency: "1x per week",
        example_topic:
          "\"The most underrated neighborhood in [town], by the numbers — commute, schools, and one hidden gem.\"",
      },
      {
        pillar: "Home Prep & Staging",
        description:
          "Show the cheap fixes and staging changes that add the most value before listing. This delivers concrete value to future sellers and demonstrates the expertise that makes an owner choose you to list their home over the agent who only posts listings.",
        post_frequency: "1x per week",
        example_topic:
          "\"The 3 sub-$500 fixes that added the most value before we listed this home.\"",
      },
      {
        pillar: "Client Stories",
        description:
          "Wrap a real transaction in the lesson behind it — the negotiation that protected a seller, the home sold in 9 days in a slow market. The story humanizes you and the lesson earns the follow; the listing is just the backdrop, not the point.",
        post_frequency: "1x per week",
        example_topic:
          "\"How we sold this home in 9 days in a slow market — the one staging change that did it.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Local Market Data", topic_idea: "Last month's market stat translated into a takeaway for buyers/sellers", format: "Carousel" },
      { day: "Tuesday", content_type: "Buyer & Seller Education", topic_idea: "Answer a real question a client asked you at a showing", format: "Caption" },
      { day: "Wednesday", content_type: "Neighborhood Spotlight", topic_idea: "A data-backed tour of an area you serve", format: "Carousel" },
      { day: "Thursday", content_type: "Home Prep & Staging", topic_idea: "A cheap pre-listing fix that adds real value", format: "Image" },
      { day: "Friday", content_type: "Client Story", topic_idea: "A recent win wrapped in the lesson behind it", format: "Caption" },
      { day: "Saturday", content_type: "Community / engage", topic_idea: "Highlight a local business or event; reply to comments — light post", format: "Image" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Pull next week's market data and batch posts — no publishing", format: "Planning" },
    ],
    growth_tactics: [
      "Comment on and share local community posts, businesses, and events — being visibly part of the neighborhood is what makes residents see you as their agent, not an outsider.",
      "Build one neighborhood-spotlight carousel a month designed to be forwarded in local group chats; shareability inside a farm area beats broad reach every time.",
      "Reply to every comment on market posts with a specific local detail, so the algorithm and the reader both see you as the genuine area expert.",
      "Pin a market-update carousel to your profile so anyone who finds you sees proof you read the market before they see a listing.",
      "Turn every showing question into a post and tag the theme to your farm area, compounding your local relevance with each one.",
    ],
    common_strategy_mistakes: [
      "Posting only 'just listed' and 'just sold' graphics, which only matter to people already in a deal — a tiny slice of your audience. Fix: lead with market insight and education that builds trust with future clients.",
      "Trying to cover an entire city instead of owning one farm area, so you're a generalist to everyone and the expert to no one. Fix: anchor every post to a specific area you want to dominate.",
      "Going quiet between transactions, right when the sellers who'll list in 8 months are watching. Fix: keep a steady rhythm so you stay top-of-mind for a slow decision.",
      "Using a scattered, inconsistent visual look that undercuts the trust a six-figure decision requires. Fix: lock in consistent branding so people recognize you before they read your name.",
    ],
  },
  "startup-founders": {
    ideal_audience:
      "Fellow founders who become your peer network and amplifiers, the early customers who buy from people they believe in, and the investors and future hires quietly evaluating whether to bet on you. Your build-in-public audience is really a distribution list for your next launch, raise, and recruiting push — so every follower who's rooting for the journey is future leverage.",
    strategy_pillars: [
      {
        pillar: "The Journey Arc",
        description:
          "Give people one continuous thread to follow — the problem you're solving, the market you're betting on, the outcome you're chasing. A clear narrative spine is what turns scattered updates into a story people subscribe to, and it's why investors keep watching a founder's feed.",
        post_frequency: "1x per week",
        example_topic:
          "\"18 months ago this was a Notion doc. Here's where we are now and the one bet the whole thing rests on.\"",
      },
      {
        pillar: "Honest Failures",
        description:
          "Lead with what went wrong before what went right. Vulnerable posts travel furthest on LinkedIn because everyone else is faking certainty, and the failure earns the trust while the lesson earns the follow.",
        post_frequency: "1x per week",
        example_topic:
          "\"I spent six months building the wrong thing. Here's the customer signal I ignored.\"",
      },
      {
        pillar: "Milestones as Stories",
        description:
          "Frame every win as a narrative — where you were, the obstacle, the decision, the result — not a brag. This lets investors watch your judgment develop, which is the thing they're actually evaluating.",
        post_frequency: "1x per week",
        example_topic:
          "\"We hit our first 1,000 users. The channel that got us there completely surprised me.\"",
      },
      {
        pillar: "Traction Framed as Lessons",
        description:
          "Share real numbers wrapped in a takeaway so it reads as generosity, not a humblebrag. This keeps you credible while proving the momentum that opens hire and investor conversations.",
        post_frequency: "1x per week",
        example_topic:
          "\"We 3x'd signups in a month. Here's the exact experiment — steal it.\"",
      },
      {
        pillar: "Founder Lessons & POV",
        description:
          "Tie every hard-won lesson to a concrete moment — a lost deal, a hard hire, a 2am bug — so your feed reads like a story people follow, not a lecture they scroll past.",
        post_frequency: "1x per week",
        example_topic:
          "\"The hardest part of the first year wasn't the product. It was learning to say no.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Journey Arc", topic_idea: "A weekly progress post that advances your ongoing narrative", format: "Caption" },
      { day: "Tuesday", content_type: "Milestone as Story", topic_idea: "A recent win told as an arc, not a brag", format: "Carousel" },
      { day: "Wednesday", content_type: "Founder Lesson", topic_idea: "A lesson tied to a concrete moment this week", format: "Caption" },
      { day: "Thursday", content_type: "Traction as Lesson", topic_idea: "A real metric wrapped in a steal-this takeaway", format: "Carousel" },
      { day: "Friday", content_type: "Honest Failure", topic_idea: "Something that went wrong and what it taught you", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Support other founders in comments — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Log the week's real moments and batch next week", format: "Planning" },
    ],
    growth_tactics: [
      "Keep a running weekly log of real moments — the lost deal, the hard hire — so you never face a blank page and never lose the best material by Friday.",
      "Engage genuinely in other founders' comments daily; the build-in-public community reshares each other's launches, and that's distribution you can't buy.",
      "Reply to every comment in the first hour — early engagement is what carries a vulnerable post beyond your existing network.",
      "Batch a week of posts in one reflective sitting so momentum survives the sprint that usually kills it around week three.",
      "Pin your clearest 'what we're building and why' post so profile visitors instantly grasp the journey they'd be following.",
    ],
    common_strategy_mistakes: [
      "Only posting milestones and staying silent in between, so momentum dies by week three. Fix: batch small honest posts so the arc never breaks.",
      "Performing certainty instead of sharing the real mess, which reads as generic and forgettable. Fix: lead with the specific, awkward truth of the week.",
      "Bragging about traction with no lesson attached, which repels more than it attracts. Fix: frame every number as a takeaway others can use.",
      "Treating LinkedIn as a broadcast stage instead of a community, so relationships never form. Fix: spend as much time in others' comments as on your own posts.",
    ],
  },
  "solopreneurs": {
    ideal_audience:
      "The specific ideal client your business of one exists to serve — defined tightly enough that one person reading a post feels it was written for them. Beyond buyers, you're building trust with the referrers and peers who send work your way. Because you have no sales team, your audience is your pipeline, so every follower who fits your niche is a potential client or introduction.",
    strategy_pillars: [
      {
        pillar: "Teach What You Do",
        description:
          "Give away genuine lessons from your actual work. Generosity is a solopreneur's growth engine — when you consistently hand people something usable, they follow, share, and remember you when they're ready to buy the deeper version.",
        post_frequency: "2x per week",
        example_topic:
          "\"The exact process I use to onboard a new client without a single meeting.\"",
      },
      {
        pillar: "Positioning & Niche",
        description:
          "Reinforce the one problem you solve for the one person you solve it for. Sharp positioning is what turns a scattered feed into a business asset that tells the right person, in one line, why to hire you.",
        post_frequency: "1x per week",
        example_topic:
          "\"I only work with [specific client] on [specific problem]. Here's why the narrower I get, the more I earn.\"",
      },
      {
        pillar: "The Human Behind It",
        description:
          "Show the person, not just the expertise — why you went solo, the slow month, the boundary you learned the hard way. This is your biggest edge over faceless competitors, because people buy from solopreneurs they trust and like.",
        post_frequency: "1x per week",
        example_topic:
          "\"I fired my biggest client last month. Here's what it taught me about my own business.\"",
      },
      {
        pillar: "Client Wins & Proof",
        description:
          "Turn results into quiet proof (with permission). For a business of one, a specific outcome you delivered is more persuasive than any credentials list and reassures prospects that you deliver alone.",
        post_frequency: "1x per week",
        example_topic:
          "\"A client came to me stuck at the same revenue for two years. Here's the one shift that unblocked it.\"",
      },
      {
        pillar: "Behind-the-Business",
        description:
          "Share how you actually run a one-person business — tools, systems, decisions. This is relatable, useful content for other solopreneurs (who become your amplifiers) and proves you have your act together to prospects.",
        post_frequency: "1x per week",
        example_topic:
          "\"How I run a six-figure business solo with 3 tools and a two-hour Monday.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Teach What You Do", topic_idea: "A usable lesson from last week's client work", format: "Carousel" },
      { day: "Tuesday", content_type: "Positioning", topic_idea: "Reinforce your niche and who you're for", format: "Caption" },
      { day: "Wednesday", content_type: "The Human Behind It", topic_idea: "An honest story from the solo journey", format: "Caption" },
      { day: "Thursday", content_type: "Teach What You Do", topic_idea: "A second teaching post — your highest-value pillar", format: "Carousel" },
      { day: "Friday", content_type: "Client Win", topic_idea: "A result you delivered, told as a story", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply to comments; comment in your niche — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Capture the week's lessons and batch next week", format: "Planning" },
    ],
    growth_tactics: [
      "Capture one lesson a day as it happens in your work, so content comes from the job itself rather than a separate block of time you don't have.",
      "Comment daily on posts from your exact ideal client, not other solopreneurs — visibility to buyers beats applause from peers.",
      "Batch a full week in one session so your pipeline keeps warming during heads-down client sprints.",
      "Pin a value-first teaching carousel so profile visitors sample your expertise before they read your offer.",
      "End teaching posts with an invitation to DM for the deeper version, converting free value into conversations.",
    ],
    common_strategy_mistakes: [
      "Trying to appeal to everyone, so your feed is memorable to no one. Fix: pick one lane and reinforce it relentlessly.",
      "Only posting when you have spare time, so marketing stops the moment you get busy and leads dry up a month later. Fix: batch and schedule so it runs in the background.",
      "Hiding the human and posting like a faceless agency, throwing away your biggest advantage. Fix: mix in personal, honest stories.",
      "Giving vague tips instead of your actual method, which proves nothing. Fix: teach the real process so DIY-ers realize they'd rather hire you.",
    ],
  },
  "agency-owners": {
    ideal_audience:
      "The specific type of client your agency is built to serve brilliantly — and, just as importantly, the talent you want to hire. Your strategy attracts dream clients who share your philosophy while repelling the bad-fit ones who'd fight you on everything. You're building a reputation that makes prospects arrive pre-sold and makes great people want to work for you.",
    strategy_pillars: [
      {
        pillar: "Client Results as Proof",
        description:
          "Turn the outcomes you generate every week into content. Prospects hire agencies on proof, and a specific result — anonymized if needed — is worth more than any 'full-service' claim your competitors make.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"We cut a client's cost-per-lead 40% by killing three of their five campaigns.\"",
      },
      {
        pillar: "Point of View",
        description:
          "Defend a strong opinion about how the work should be done. A clear POV attracts the clients who agree with you (a joy to work with) and filters out the ones who'll be a nightmare — exactly the filtering a busy owner needs.",
        post_frequency: "1x per week",
        example_topic:
          "\"Most brands post too much and say too little. Here's the ratio we actually use.\"",
      },
      {
        pillar: "Teach Your Process",
        description:
          "Show how you think — the audit, the framework, the mistake you fix on every account. Giving away your thinking wins the clients who realize they'd rather hire the expert than DIY it badly.",
        post_frequency: "1x per week",
        example_topic:
          "\"The 15-minute audit we run on every new account — and what it always reveals.\"",
      },
      {
        pillar: "The Owner's Voice",
        description:
          "Post from your personal profile, not the brand page — people follow founders, not logos. This builds the inbound engine and doubles as your recruiting magnet.",
        post_frequency: "1x per week",
        example_topic:
          "\"Why I turned down a $50k client last week — and what it taught my team.\"",
      },
      {
        pillar: "Behind the Agency",
        description:
          "Share how you build the team, the culture, and the systems. This attracts talent who want to work for a leader they admire and reassures clients that there's real infrastructure behind the work.",
        post_frequency: "1x per week",
        example_topic:
          "\"How we onboard a new client so the first 30 days actually deliver results.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Point of View", topic_idea: "A strong take on how the work should be done", format: "Caption" },
      { day: "Tuesday", content_type: "Client Result", topic_idea: "A recent win told as a proof story", format: "Carousel" },
      { day: "Wednesday", content_type: "Teach Your Process", topic_idea: "One part of your methodology, given away", format: "Carousel" },
      { day: "Thursday", content_type: "The Owner's Voice", topic_idea: "A personal leadership decision or lesson", format: "Caption" },
      { day: "Friday", content_type: "Behind the Agency", topic_idea: "A culture or systems moment", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on prospects' and peers' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week from this week's client wins", format: "Planning" },
    ],
    growth_tactics: [
      "Treat your own content like a client account — batch, schedule, and protect the time, so delivery never kills your own marketing.",
      "Comment on posts from your ideal-client profile daily; your next lead is likely already in someone else's audience.",
      "Turn every notable client result into a proof post while the numbers are fresh, building a library of credibility.",
      "Pin your sharpest POV post so prospects immediately know whether they align with how you work.",
      "Use your feed as a talent funnel — culture posts attract applicants who already believe in your approach.",
    ],
    common_strategy_mistakes: [
      "Neglecting your own marketing because delivery comes first, creating a feast-or-famine pipeline. Fix: systematize your content like any other account.",
      "Posting generic 'services we offer' content that blends in with every other agency. Fix: lead with a sharp, filtering point of view.",
      "Broadcasting from the faceless brand page instead of the owner's profile. Fix: put your face and perspective forward.",
      "Never showing your thinking, so prospects can't tell you apart from cheaper competitors. Fix: teach your process openly.",
    ],
  },
  "freelancers": {
    ideal_audience:
      "The specific, well-budgeted clients who value expertise over the cheapest rate — not bargain hunters. You're building recognition as the go-to specialist for one problem in one industry, so the right buyer arrives already convinced and willing to pay. Every follower who fits that profile is a potential premium client or referral.",
    strategy_pillars: [
      {
        pillar: "Proof of Skill",
        description:
          "Turn finished projects (with permission) into evidence of your ability. Showing your actual work in action lets prospects pre-judge your quality and reach out already convinced, instead of you chasing them.",
        post_frequency: "1x per week",
        example_topic:
          "\"They came for a redesign. The real problem was an 11-field signup form. We cut it to 3.\"",
      },
      {
        pillar: "Teach Your Craft",
        description:
          "Break down one technique per week. Teaching builds the authority that lets you raise rates — and it makes DIY-ers realize they'd rather hire the expert than fumble it.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The 3-line fix for the onboarding email mistake costing SaaS companies 20% of signups.\"",
      },
      {
        pillar: "Specialism Signal",
        description:
          "Keep signaling the one thing you want to be hired for. Specialists command premium rates; generalists compete on price, so every post should reinforce your niche.",
        post_frequency: "1x per week",
        example_topic:
          "\"I only write onboarding emails for B2B SaaS. Here's why narrowing 10x'd my rate.\"",
      },
      {
        pillar: "Freelance-Life Honesty",
        description:
          "Share the real side — a boundary set, a client fired, a lesson learned. Clients hire freelancers they'd enjoy working with, so the personality behind the portfolio is what makes them choose you over an equally-skilled stranger.",
        post_frequency: "1x per week",
        example_topic:
          "\"I raised my rates 40% and lost two clients. Both were the ones draining me anyway.\"",
      },
      {
        pillar: "Client Outcomes",
        description:
          "Frame results around the stakes a premium buyer cares about, not just the deliverable. This attracts budgets rather than lowballs.",
        post_frequency: "1x per week",
        example_topic:
          "\"The landing page copy that took a client from 1.2% to 3.8% conversion.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Teach Your Craft", topic_idea: "One technique, broken down", format: "Carousel" },
      { day: "Tuesday", content_type: "Proof of Skill", topic_idea: "A recent project as evidence", format: "Image" },
      { day: "Wednesday", content_type: "Specialism Signal", topic_idea: "Reinforce your niche and rate positioning", format: "Caption" },
      { day: "Thursday", content_type: "Client Outcome", topic_idea: "A result framed around the stakes", format: "Carousel" },
      { day: "Friday", content_type: "Freelance-Life Honesty", topic_idea: "An honest story from the freelance life", format: "Caption" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on ideal clients' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week from finished projects", format: "Planning" },
    ],
    growth_tactics: [
      "Turn every finished project into a proof post so your portfolio grows automatically as you work.",
      "Comment on posts from the specific clients you want, pitched at their level so your expertise is visible to budgets, not bargain hunters.",
      "Batch a week of content so visibility keeps running during heads-down projects — the fix for the feast-or-famine cycle.",
      "Pin a 'what I do and who for' post so profile visitors instantly self-qualify.",
      "Teach openly to build the authority that justifies a rate rise; expertise on display is what lets you stop competing on price.",
    ],
    common_strategy_mistakes: [
      "Marketing as a generalist, which forces you to compete on price. Fix: signal one specialism relentlessly.",
      "Going silent whenever a project lands, then scrambling for work when it ends. Fix: batch content so marketing never stops.",
      "Only posting deliverables, not outcomes, so premium buyers can't see the value. Fix: frame work around the stakes.",
      "Hiding your personality, when clients hire freelancers they like. Fix: mix in honest freelance-life stories.",
    ],
  },
  "ecommerce-founders": {
    ideal_audience:
      "Fellow founders and operators who follow the messy reality of building a product brand, plus the retail partners, wholesale buyers, and investors who live on LinkedIn and can open doors. You're not selling to consumers here — you're building a founder brand that attracts partnerships, press, and capital, so your audience is the business side of ecommerce, not shoppers.",
    strategy_pillars: [
      {
        pillar: "Operational Reality",
        description:
          "Share the parts nobody sees — sourcing, a shipping disaster, a packaging redesign. This is your unfair advantage: polished brand accounts can't share the mess and pure influencers don't have it, but on LinkedIn it's exactly what founders and partners want to read.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"Our return rate was 3% until we changed one product photo — to an honest one.\"",
      },
      {
        pillar: "Numbers & Hard Decisions",
        description:
          "Lead with the metric that moved or the counterintuitive call you made. Specific numbers stop the scroll and get saved by other founders reverse-engineering their own businesses.",
        post_frequency: "1x per week",
        example_topic:
          "\"We raised prices 22%, lost 4% of customers, and revenue went up 17%.\"",
      },
      {
        pillar: "Lessons Learned",
        description:
          "Turn a real decision — a channel, a fulfillment change, a pricing test — into a story with a proper arc. This proves you actually operate the business, earning credibility with the buyers and investors watching.",
        post_frequency: "1x per week",
        example_topic:
          "\"We killed our bestseller. Here's the margin math that made it obvious.\"",
      },
      {
        pillar: "Product in a Story",
        description:
          "Feature the product as the payoff to a genuine story — the customer problem, the design choice, the surprising review — never as a straight ad. Woven into a narrative, the product gets seen and remembered.",
        post_frequency: "1x per week",
        example_topic:
          "\"A customer emailed to say our packaging made her cry. Here's the design decision behind it.\"",
      },
      {
        pillar: "Founder Journey",
        description:
          "Document why you started and what you're learning. This personal thread is what makes your ecommerce content stand out in a feed that assumes DTC only lives on Instagram.",
        post_frequency: "1x per week",
        example_topic:
          "\"Two years ago I was packing orders on my kitchen floor. Here's what changed.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Operational Reality", topic_idea: "A behind-the-brand moment from the week", format: "Caption" },
      { day: "Tuesday", content_type: "Numbers & Decisions", topic_idea: "A metric that moved and the call behind it", format: "Carousel" },
      { day: "Wednesday", content_type: "Lessons Learned", topic_idea: "A real decision told as a story", format: "Carousel" },
      { day: "Thursday", content_type: "Product in a Story", topic_idea: "The product as the payoff to a genuine story", format: "Image" },
      { day: "Friday", content_type: "Founder Journey", topic_idea: "A reflection on the build so far", format: "Caption" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on founder and partner posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch ahead so launches don't reset your feed", format: "Planning" },
    ],
    growth_tactics: [
      "Keep a running note of operational moments — the supplier drama, the fire — so your unfair-advantage content never runs dry.",
      "Batch a week ahead of every launch or restock so a fulfillment crisis never means a silent feed.",
      "Comment on posts from potential retail partners and wholesale buyers, who live on LinkedIn and won't find you on Instagram.",
      "Lead with numbers on your highest-effort posts; specific figures are what other founders save and share.",
      "Pin your best behind-the-brand carousel so partners and investors see the operator, not a catalogue.",
    ],
    common_strategy_mistakes: [
      "Assuming LinkedIn isn't for ecommerce and only posting on Instagram, missing the partners and investors who live here. Fix: build a founder brand on LinkedIn.",
      "Posting flat product shots that get ignored. Fix: weave the product into a real story.",
      "Letting launches reset your visibility to zero when the feed goes dark. Fix: batch ahead so it survives the crunch.",
      "Hiding the operational mess, when the mess is exactly the content that stands out. Fix: share the reality other accounts can't.",
    ],
  },
  "product-managers": {
    ideal_audience:
      "Other PMs who learn from your practitioner perspective and become your professional network, plus the hiring managers, founders, and leaders who notice sharp product thinking and offer roles, speaking slots, and influence. You're building a reputation as someone who thinks in trade-offs and ships judgment — the profile that gets promoted and headhunted.",
    strategy_pillars: [
      {
        pillar: "Real Decisions",
        description:
          "Turn your everyday prioritization calls, killed features, and stakeholder negotiations into teaching posts. Lived examples beat recycled framework summaries because people want to see how a real practitioner thinks.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"Stakeholders wanted 10 features. We shipped 2. Here's how I chose.\"",
      },
      {
        pillar: "Frameworks from Stories",
        description:
          "Extract a repeatable framework from a real decision you made, grounded in the story. This positions you as a practitioner-thinker — the profile that gets promoted, not a book-summarizer.",
        post_frequency: "1x per week",
        example_topic:
          "\"The 3-question framework I use to say no to my CEO without losing the room.\"",
      },
      {
        pillar: "Honest Misses",
        description:
          "Share the feature that flopped or the research you ignored and regretted. Reflecting on a miss signals the maturity senior and staff roles are hired for.",
        post_frequency: "1x per week",
        example_topic:
          "\"We shipped the wrong thing for a quarter. Here's the user signal I dismissed.\"",
      },
      {
        pillar: "Craft Tensions",
        description:
          "Name the trade-offs every PM lives — scope vs deadline, data vs intuition, saying no. Recognition is what earns the follow, because every PM feels these tensions.",
        post_frequency: "1x per week",
        example_topic:
          "\"'Data-driven' is a trap when you have no data. Here's what I do instead.\"",
      },
      {
        pillar: "Product POV",
        description:
          "Stake out a clear opinion on how product should be done. A distinct point of view is what makes you memorable and quotable in a sea of generic PM content.",
        post_frequency: "1x per week",
        example_topic:
          "\"Most roadmaps are fiction. Here's what we replaced ours with.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Product POV", topic_idea: "A clear opinion on how product should work", format: "Caption" },
      { day: "Tuesday", content_type: "Real Decision", topic_idea: "A prioritization call from your week, taught", format: "Carousel" },
      { day: "Wednesday", content_type: "Framework from Story", topic_idea: "A reusable framework grounded in a real example", format: "Carousel" },
      { day: "Thursday", content_type: "Craft Tension", topic_idea: "A trade-off every PM recognizes", format: "Caption" },
      { day: "Friday", content_type: "Honest Miss", topic_idea: "A flop and what it taught you", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on PM and founder posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week from this week's decisions", format: "Planning" },
    ],
    growth_tactics: [
      "Keep a running note of the real decisions you make so your feed draws on lived material, not recycled theory.",
      "Comment thoughtfully on posts from senior PMs and product leaders; that's where the promotion-makers and recruiters are watching.",
      "Ground every framework in a story you actually lived so it reads as credible practitioner judgment.",
      "Batch a week in one session so your reputation-building survives launch crunches.",
      "Pin a framework carousel so profile visitors immediately see how you think.",
    ],
    common_strategy_mistakes: [
      "Posting recycled framework summaries that sound like everyone else's. Fix: lead with real decisions from your own work.",
      "Only sharing wins, never misses, which reads as inexperienced. Fix: reflect on a flop to signal senior judgment.",
      "Dropping the feed during launches, killing the consistency reputation needs. Fix: batch ahead.",
      "Staying safely generic with no point of view, so you're forgettable. Fix: stake out a clear product opinion.",
    ],
  },
  "ceos-executives": {
    ideal_audience:
      "The senior talent you want to recruit, the investors and partners evaluating your leadership, and the industry peers and press who shape your reputation. People follow leaders with conviction, not officials reciting the company line — so you're building a personal voice that attracts believers, hires, and opportunities that outlast any single quarter.",
    strategy_pillars: [
      {
        pillar: "Leadership POV",
        description:
          "Carry the message only you can — the shift you see coming, the philosophy you live by, the contrarian bet you're making. Conviction is what attracts talent, investors, and partners.",
        post_frequency: "1x per week",
        example_topic:
          "\"We stopped doing annual reviews two years ago. Here's what replaced them.\"",
      },
      {
        pillar: "Real Leadership Moments",
        description:
          "Share the weight of the chair — the hard decision, the owned mistake, the hire that transformed the team. Leaders who share the reality build the trust that recruits senior talent.",
        post_frequency: "1x per week",
        example_topic:
          "\"I made the wrong call on our biggest hire. Here's what it taught me.\"",
      },
      {
        pillar: "Culture & People",
        description:
          "Champion your team's wins and your culture's values in action. Sharing credit makes you a leader people want to work for and turns your feed into a recruiting engine.",
        post_frequency: "1x per week",
        example_topic:
          "\"My VP of Eng made a call I disagreed with. She was right. Here's what I learned.\"",
      },
      {
        pillar: "Industry Vision",
        description:
          "Take a clear stand on where your industry is heading. A considered point of view positions you as a leader worth following, not a cautious figurehead.",
        post_frequency: "1x per week",
        example_topic:
          "\"The next five years in [industry] will be defined by one shift most are ignoring.\"",
      },
      {
        pillar: "Hard-Won Lessons",
        description:
          "Teach from real experience rather than abstract platitudes. This is the content that earns board seats, keynote invitations, and inbound talent who joined because of something you wrote.",
        post_frequency: "1x per week",
        example_topic:
          "\"The layoff I handled badly, and the principle I'd pass to any first-time CEO.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Leadership POV", topic_idea: "A conviction-led take to open the week", format: "Caption" },
      { day: "Tuesday", content_type: "Hard-Won Lesson", topic_idea: "A leadership lesson wrapped in a real story", format: "Carousel" },
      { day: "Wednesday", content_type: "Industry Vision", topic_idea: "A stand on where the industry is heading", format: "Carousel" },
      { day: "Thursday", content_type: "Culture & People", topic_idea: "A team win or culture moment worth celebrating", format: "Image" },
      { day: "Friday", content_type: "Real Leadership Moment", topic_idea: "An honest reflection on a hard decision", format: "Caption" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply and comment thoughtfully — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Hand 20 min of raw thinking to your batching process", format: "Planning" },
    ],
    growth_tactics: [
      "Treat content as a leveraged activity — spend 20 focused minutes providing raw thinking and delegate production, so visibility never costs an hour a day.",
      "Reply personally to comments from senior people; an executive who engages directly builds outsized goodwill.",
      "Champion your team publicly so your feed doubles as a recruiting magnet in a scarce talent market.",
      "Pin a leadership-lesson carousel so anyone evaluating you sees conviction, not a press release.",
      "Take one clear stand a week; the vulnerability and the spine are what make a leader worth following.",
    ],
    common_strategy_mistakes: [
      "Posting cautious, ghostwritten corporate-speak that says nothing and moves no one. Fix: write in your own voice with real conviction.",
      "Keeping the hard moments private, so no genuine trust forms. Fix: share the owned mistakes and hard calls.",
      "Making it all about you, never your people. Fix: champion the team to build a talent magnet.",
      "Trying to find an hour a day and giving up. Fix: treat it as a high-input, delegated, batched activity.",
    ],
  },
  "serial-entrepreneurs": {
    ideal_audience:
      "Aspiring and current founders who want to learn from someone who's done it multiple times, plus the investors, operators, and future co-founders who track proven builders. You're building a durable personal audience that follows you across every venture — distribution you'll own for your next launch, raise, and hire, no matter what you're building now.",
    strategy_pillars: [
      {
        pillar: "Cross-Venture Patterns",
        description:
          "Share what worked in one venture and failed in another, and why. This pattern-recognition is content no first-time founder can produce — it requires having lived multiple full cycles — and it positions you as a mentor-level voice.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"I've started 4 companies. I made the same hiring mistake in the first 3.\"",
      },
      {
        pillar: "Loud Failures",
        description:
          "Dissect a venture that didn't work with real honesty. Everyone posts wins; almost nobody breaks down a loss usefully, which makes this your most trusted and shareable content.",
        post_frequency: "1x per week",
        example_topic:
          "\"My second company died with $400k in the bank. Here's exactly what went wrong.\"",
      },
      {
        pillar: "Earned Frameworks",
        description:
          "Package the hard-won models you now swear by. Frameworks backed by multiple ventures carry authority a theory-only guru can never match.",
        post_frequency: "1x per week",
        example_topic:
          "\"The 3-question test I now run before starting anything new.\"",
      },
      {
        pillar: "Current Build",
        description:
          "Document whatever you're building now as an ongoing story. This keeps your durable audience engaged and gives your latest venture warm distribution from day one.",
        post_frequency: "1x per week",
        example_topic:
          "\"Starting again from zero — here's what I'm doing differently this time.\"",
      },
      {
        pillar: "Founder POV",
        description:
          "Take strong, experience-backed positions on how to build. Your battle scars make contrarian takes credible where a first-timer's would sound naive.",
        post_frequency: "1x per week",
        example_topic:
          "\"'Follow your passion' is terrible startup advice. Here's what actually predicts success.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Founder POV", topic_idea: "An experience-backed contrarian take", format: "Caption" },
      { day: "Tuesday", content_type: "Cross-Venture Pattern", topic_idea: "A lesson that recurs across your ventures", format: "Carousel" },
      { day: "Wednesday", content_type: "Earned Framework", topic_idea: "A model you now swear by, and why", format: "Carousel" },
      { day: "Thursday", content_type: "Current Build", topic_idea: "An update on what you're building now", format: "Caption" },
      { day: "Friday", content_type: "Loud Failure", topic_idea: "A failed venture dissected honestly", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Support founders in comments — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Mine your history for patterns; batch next week", format: "Planning" },
    ],
    growth_tactics: [
      "Mine your multi-venture history systematically — each pattern you've noticed is a post no first-timer can write.",
      "Lead with failures louder than exits; the honest post-mortems are what build trust and travel furthest.",
      "Keep one visual identity across ventures so your audience follows you, not any single company.",
      "Batch a week so your durable audience keeps compounding regardless of your current venture's chaos.",
      "Pin a cross-venture lessons carousel so new followers immediately grasp the depth of your experience.",
    ],
    common_strategy_mistakes: [
      "Leading with exits and wins, which everyone does and nobody trusts. Fix: dissect the failures with real specificity.",
      "Letting the current venture consume all your content, so you rebuild distribution each time. Fix: keep a personal brand that spans ventures.",
      "Posting generic startup advice that wastes your rare multi-cycle perspective. Fix: share the cross-venture patterns only you have.",
      "Going silent between ventures, so the audience cools. Fix: batch consistently to keep the asset warm.",
    ],
  },
  "vcs-investors": {
    ideal_audience:
      "The specific founders you want in your inbox — the right stage, sector, and type — plus co-investors and LPs who track your judgment. In a business where the best deals are competitive, your content is proprietary deal flow: you're building a reputation that makes the founders you want think of you first.",
    strategy_pillars: [
      {
        pillar: "Thesis & Market Views",
        description:
          "Share your genuine perspective on where a sector is heading. Founders want to pitch investors who clearly understand their space, so a sharp thesis makes them think 'this is the investor who gets what I'm building.'",
        post_frequency: "1x per week",
        example_topic:
          "\"Three shifts reshaping [sector] that most seed investors are still missing.\"",
      },
      {
        pillar: "Founder Value",
        description:
          "Give away honest, tactical insight founders can rarely get directly — deck advice, fundraising truths, pattern recognition. Value builds the goodwill that makes you a first call, not a gatekeeper.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The pitch deck slide that makes me pass in 10 seconds — and it's not traction.\"",
      },
      {
        pillar: "How I Evaluate",
        description:
          "Demystify your actual process — how you assess a deal, what makes a metric credible, why you passed on a company that blew up. Founders forward this content, which is exactly where your next deal is talking.",
        post_frequency: "1x per week",
        example_topic:
          "\"How I actually read your metrics — what I check first and what I ignore.\"",
      },
      {
        pillar: "Portfolio Champion",
        description:
          "Celebrate the founders you back and why. This proves you're a value-add investor and drives the word-of-mouth that surfaces the best deals.",
        post_frequency: "1x per week",
        example_topic:
          "\"Why I backed this founder before they had revenue — and what they've done since.\"",
      },
      {
        pillar: "Investor POV",
        description:
          "Take clear positions on the industry — valuations, trends, what's overhyped. A distinct point of view makes you a name founders and co-investors follow.",
        post_frequency: "1x per week",
        example_topic:
          "\"Everyone's chasing this category. Here's why I think it's a trap.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Investor POV", topic_idea: "A clear stance on a market trend", format: "Caption" },
      { day: "Tuesday", content_type: "Thesis & Market View", topic_idea: "Where a sector you invest in is heading", format: "Carousel" },
      { day: "Wednesday", content_type: "Founder Value", topic_idea: "Tactical fundraising or building insight", format: "Carousel" },
      { day: "Thursday", content_type: "How I Evaluate", topic_idea: "A window into your real process", format: "Caption" },
      { day: "Friday", content_type: "Portfolio Champion", topic_idea: "A founder win worth celebrating", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on founders' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Turn the week's market thinking into batched posts", format: "Planning" },
    ],
    growth_tactics: [
      "Turn the thesis work you already do between pitches into posts, so it reaches founders instead of dying in a Notion doc.",
      "Give tactical value freely; the goodwill compounds into being a founder's first call rather than a cold email.",
      "Comment genuinely on posts from founders in your target space — that's where your deal flow is watching.",
      "Champion a portfolio founder weekly; the word-of-mouth is the most valuable deal-flow channel there is.",
      "Pin a founder-education carousel so anyone who finds you samples your value before they ever DM.",
    ],
    common_strategy_mistakes: [
      "Posting gatekeeper-speak instead of genuine value, which builds no goodwill. Fix: give founders insight they can't easily get.",
      "Keeping your thesis work private, so founders can't tell you understand their space. Fix: publish your market views.",
      "Going quiet during heavy diligence periods, right when founders are looking. Fix: batch so presence stays steady.",
      "Never showing how you actually decide, so you stay a mystery. Fix: demystify your evaluation process.",
    ],
  },
  "angel-investors": {
    ideal_audience:
      "Founders raising the rounds you write into, plus co-investors and syndicate members who value your operating background. You're competing with funds and other angels for the best deals, so your content shows founders exactly why your check is worth more than someone else's — turning your operating experience into visible, differentiated value.",
    strategy_pillars: [
      {
        pillar: "Operator Lessons",
        description:
          "Share the hard-won lessons from building or operating that inform how you invest. This proves you bring more than money and attracts founders who want a backer that's been in their shoes.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"I scaled a GTM team from 3 to 40. That's why I don't ask about TAM first.\"",
      },
      {
        pillar: "Both Sides of the Table",
        description:
          "Leverage your dual perspective — you've raised angel money and written checks. That combination is insight founders can't get from a pure investor or pure operator.",
        post_frequency: "1x per week",
        example_topic:
          "\"I've raised angel money and written angel checks. Here's what the deck should really say.\"",
      },
      {
        pillar: "Demystify Angel Investing",
        description:
          "Explain how you size a check, what makes you say yes, how you help after. This grows both your deal flow and your co-investor network, because founders and fellow angels both want to understand your lens.",
        post_frequency: "1x per week",
        example_topic:
          "\"How I decide on an angel check in one meeting — and the one thing that makes me pass.\"",
      },
      {
        pillar: "Back Your Founders",
        description:
          "Publicly champion the founders you invest in. This shows you're a supportive, visible backer and earns the referrals that bring you into the best rounds.",
        post_frequency: "1x per week",
        example_topic:
          "\"Why I wrote my first check into this founder — and what they've built since.\"",
      },
      {
        pillar: "Angel POV",
        description:
          "Take positions on angel investing, early-stage trends, and founder-investor dynamics. A clear voice makes founders seek your specific check.",
        post_frequency: "1x per week",
        example_topic:
          "\"Most angels add nothing after the wire. Here's how I decide where I can actually help.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Angel POV", topic_idea: "A take on early-stage dynamics", format: "Caption" },
      { day: "Tuesday", content_type: "Operator Lesson", topic_idea: "An operating lesson that shapes how you invest", format: "Carousel" },
      { day: "Wednesday", content_type: "Both Sides of the Table", topic_idea: "Dual-perspective fundraising insight", format: "Carousel" },
      { day: "Thursday", content_type: "Demystify Angel Investing", topic_idea: "A window into how you decide and help", format: "Caption" },
      { day: "Friday", content_type: "Back Your Founders", topic_idea: "A portfolio founder worth spotlighting", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on founders' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week around your operating stories", format: "Planning" },
    ],
    growth_tactics: [
      "Lead with your operating background — it's the differentiator that makes your check smart money rather than just money.",
      "Comment on posts from founders in your focus area; visibility is how you get shown competitive deals.",
      "Champion a portfolio founder regularly so other founders learn you're the angel who shows up.",
      "Batch a week so your angel brand stays alive even though investing sits alongside a day job.",
      "Pin a 'how I invest and help' post so founders instantly see the value your check carries.",
    ],
    common_strategy_mistakes: [
      "Writing checks that look like everyone else's because your operating edge stays invisible. Fix: make your experience the center of your content.",
      "Only posting when you have spare time, so your angel brand never grows. Fix: batch consistently despite the day job.",
      "Staying a passive, silent backer publicly, so you get no referrals. Fix: champion your founders openly.",
      "Talking like a fund instead of a fellow operator, losing your differentiation. Fix: lead with the founder's-shoes perspective.",
    ],
  },
  "fintech-founders": {
    ideal_audience:
      "The cautious customers who need to trust you with their money, the regulators and banking partners who must be comfortable working with you, and the investors who understand how brutal the space is. In a category where trust is everything, you're building the credibility — through transparency and plain-English clarity — that turns skeptical prospects into confident users.",
    strategy_pillars: [
      {
        pillar: "Trust & Transparency",
        description:
          "Explain openly how you protect users — how money is held, how data is handled, what happens if something breaks. Radical transparency is rare and disarming in fintech, and it converts cautious prospects into customers.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"Where your money actually sits — the account structure, the regulator, the protections.\"",
      },
      {
        pillar: "Plain-English Finance",
        description:
          "Translate the complexity you explain one-to-one — compliance, security, financial mechanics — into content anyone can follow. Clarity in a confusing category is a genuine competitive edge.",
        post_frequency: "1x per week",
        example_topic:
          "\"What 'segregated accounts' means for you, in plain English.\"",
      },
      {
        pillar: "Real Money Problems",
        description:
          "Lead with concrete financial pains your product solves, not 'the future of finance.' Speaking to a felt problem grabs customers rather than fellow founders.",
        post_frequency: "1x per week",
        example_topic:
          "\"Your business loses money on every cross-border payment — and it's not the FX rate.\"",
      },
      {
        pillar: "Building in a Regulated Space",
        description:
          "Share the honest story of navigating licensing, compliance, and bank partnerships. Your regulatory battle scars prove you can build where others can't and attract talent and investors who respect the difficulty.",
        post_frequency: "1x per week",
        example_topic:
          "\"We could have shipped 18 months earlier by skipping a study. Here's why we didn't.\"",
      },
      {
        pillar: "Fintech POV",
        description:
          "Take clear positions on where finance and fintech are heading. A credible voice in a skeptical category builds the reputation that reassures partners and regulators.",
        post_frequency: "1x per week",
        example_topic:
          "\"Most fintech 'disruption' is a wrapper on the same rails. Here's what real change looks like.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Fintech POV", topic_idea: "A clear take on the industry", format: "Caption" },
      { day: "Tuesday", content_type: "Trust & Transparency", topic_idea: "How you protect users, explained openly", format: "Carousel" },
      { day: "Wednesday", content_type: "Plain-English Finance", topic_idea: "A complex concept made simple", format: "Carousel" },
      { day: "Thursday", content_type: "Real Money Problem", topic_idea: "A concrete pain your product solves", format: "Caption" },
      { day: "Friday", content_type: "Building in a Regulated Space", topic_idea: "A regulatory or compliance story", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply to customer and founder comments — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch trust-building content for the week", format: "Planning" },
    ],
    growth_tactics: [
      "Turn the concepts you explain in support and sales calls into plain-English posts — you're already doing the explaining.",
      "Lead trust content with transparency about the scary parts; that candor is what converts a cautious prospect.",
      "Comment on posts from your target customers' industries, speaking to their real money problems.",
      "Batch so trust-building never stops during a heavy build cycle — in fintech, consistent credibility is a moat.",
      "Pin a 'how we keep your money safe' carousel so profile visitors' first impression is reassurance.",
    ],
    common_strategy_mistakes: [
      "Posting jargon that reassures nobody. Fix: translate everything into plain English.",
      "Leading with 'future of finance' abstraction that attracts founders, not customers. Fix: lead with real money problems.",
      "Hiding behind vague marketing instead of explaining your safeguards. Fix: be radically transparent about protections.",
      "Letting build cycles silence your credibility content. Fix: batch so trust-building runs continuously.",
    ],
  },
  "personal-finance-coaches": {
    ideal_audience:
      "Anxious, money-stressed people living the specific struggle you help with — debt, first savings, investing fear, money mindset — who have been shamed by gurus and are looking for a calm, credible guide. You're building trust with people who make money decisions slowly, so your empathetic presence is what makes a long-time follower finally reach out.",
    strategy_pillars: [
      {
        pillar: "Empathy Over Shame",
        description:
          "Reframe financial struggle as a lack of education, not a character flaw. Shame repels your ideal client; permission and empathy are what make an anxious reader feel safe enough to let a coach in.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"You're not bad with money. You were taught budgeting by people who'd never been broke.\"",
      },
      {
        pillar: "Real Quick Wins",
        description:
          "Hand over actual, doable steps — the starter emergency fund, the debt order, the automation. When your free advice helps someone's money, they believe your paid coaching can change their life.",
        post_frequency: "1x per week",
        example_topic:
          "\"The exact order to pay off debt — most people get this backwards.\"",
      },
      {
        pillar: "Money Mindset",
        description:
          "Address the emotional 80% — the fear, avoidance, and family money stories. This differentiates you from the calculator crowd and speaks to why people actually stay stuck.",
        post_frequency: "1x per week",
        example_topic:
          "\"Why you avoid checking your bank balance — and the 2-minute habit that fixes it.\"",
      },
      {
        pillar: "Client Breakthroughs",
        description:
          "Share transformations (anonymized) led by the mindset or habit shift, not just the number. This proves a repeatable process to a skeptical, anxious prospect.",
        post_frequency: "1x per week",
        example_topic:
          "\"He earned £48k and felt broke. One shift, and he saved £6k in six months.\"",
      },
      {
        pillar: "Myth-Busting",
        description:
          "Counter the get-rich-quick noise with grounded truth. Being the calm, credible voice above the hype attracts people burned by financial gurus.",
        post_frequency: "1x per week",
        example_topic:
          "\"'Just invest in index funds' is incomplete advice. Here's what comes first.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Empathy Over Shame", topic_idea: "A reframe that removes money shame", format: "Caption" },
      { day: "Tuesday", content_type: "Real Quick Win", topic_idea: "A doable money step, taught simply", format: "Carousel" },
      { day: "Wednesday", content_type: "Money Mindset", topic_idea: "The emotional side of a money habit", format: "Carousel" },
      { day: "Thursday", content_type: "Myth-Busting", topic_idea: "Counter a common finance myth", format: "Caption" },
      { day: "Friday", content_type: "Client Breakthrough", topic_idea: "A transformation led by the shift behind it", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply warmly to comments and DMs — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week's empathetic content", format: "Planning" },
    ],
    growth_tactics: [
      "Lead every hook with empathy and permission, never shame — tone is what determines whether anxious clients approach or scroll past.",
      "Answer money-question comments with genuine, specific help; that visible generosity builds the trust a money decision requires.",
      "Stay consistent so you're present across the long window in which someone slowly decides to fix their finances.",
      "Pin a shame-free 'start here' carousel so a first-time visitor immediately feels safe.",
      "Give a real quick win in every teaching post so people experience results before they ever pay.",
    ],
    common_strategy_mistakes: [
      "Shaming readers ('stop buying coffee'), which repels the exact clients you want. Fix: lead with empathy and education.",
      "Competing with gurus on hype instead of trust. Fix: be the calm, credible voice with real quick wins.",
      "Only teaching math, never mindset, missing why people stay stuck. Fix: address the emotional side of money.",
      "Posting sporadically, so you're not present when someone finally decides. Fix: batch for consistency.",
    ],
  },
  "business-coaches": {
    ideal_audience:
      "The specific business owner at the specific plateau you help them break — a service-business owner stuck at six figures, say — not 'entrepreneurs' in general. You're building trust with owners who decide to hire a coach at an unpredictable moment of frustration or ambition, so your consistent, proof-driven presence makes you the obvious call when they hit the wall.",
    strategy_pillars: [
      {
        pillar: "Proof & Results",
        description:
          "Share client transformations led by the mechanism, not just the outcome. Owners are rightly skeptical of coaches who can't show they've moved a business, so proof is your core currency.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"She went from £180k to £340k in a year — by raising prices and firing 3 clients.\"",
      },
      {
        pillar: "Named Framework",
        description:
          "Package your methodology into a framework owners can see and trust. Giving it away proves it's worth paying for and attracts owners who realize they need guided implementation.",
        post_frequency: "1x per week",
        example_topic:
          "\"The 3-lever system I use to break a business through the six-figure ceiling.\"",
      },
      {
        pillar: "Owner's Real Frustrations",
        description:
          "Name the specific, often misdiagnosed frustrations owners feel — 60-hour weeks with no growth, a team that needs hand-holding. Calling out the real problem makes the right owner feel seen.",
        post_frequency: "1x per week",
        example_topic:
          "\"You don't have a marketing problem. You have a positioning problem.\"",
      },
      {
        pillar: "Contrarian Strategy",
        description:
          "Gently disagree with what owners assume — 'hustle harder' is wrong, more leads won't fix it. This positions you as a strategic thinker, not a cheerleader, and sparks the comment debate that drives reach.",
        post_frequency: "1x per week",
        example_topic:
          "\"Hiring won't fix your business. It'll just scale the chaos faster.\"",
      },
      {
        pillar: "Owner Mindset",
        description:
          "Address the psychology of running a business — the identity, the fear of delegating, the plateau. This connects on the level owners actually get stuck at.",
        post_frequency: "1x per week",
        example_topic:
          "\"The real reason you won't delegate — and what it's costing you.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Contrarian Strategy", topic_idea: "A take that challenges an owner assumption", format: "Caption" },
      { day: "Tuesday", content_type: "Proof & Results", topic_idea: "A client win led by the mechanism", format: "Carousel" },
      { day: "Wednesday", content_type: "Named Framework", topic_idea: "Part of your methodology, given away", format: "Carousel" },
      { day: "Thursday", content_type: "Owner's Frustration", topic_idea: "Name a real, misdiagnosed pain", format: "Caption" },
      { day: "Friday", content_type: "Owner Mindset", topic_idea: "The psychology behind a business plateau", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on business owners' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week from client wins", format: "Planning" },
    ],
    growth_tactics: [
      "Turn every client transformation into a proof post while fresh; proof answers the skeptic's first question before they ask.",
      "Name the exact frustration your ideal owner feels so the right person feels you're reading their mind.",
      "Comment on posts from business owners, not other coaches, so your visibility reaches buyers.",
      "Stay consistent so you're top of mind at the unpredictable moment an owner decides to get help.",
      "Pin your named-framework post so profile visitors immediately see you have a real system.",
    ],
    common_strategy_mistakes: [
      "Posting motivational quotes that make you identical to every other 'business coach.' Fix: lead with proof and a named method.",
      "Keeping results private, so prospects can't tell you've moved a business. Fix: publish client transformations.",
      "Being a cheerleader with no point of view. Fix: take contrarian, strategic positions.",
      "Going quiet during full coaching weeks, missing the decision moment. Fix: batch to stay visible.",
    ],
  },
  "life-coaches": {
    ideal_audience:
      "People quietly stuck in the specific way you help — a career crossroads, lost confidence, a pattern they can't break — who are skeptical of vague coaching and need to feel you understand their exact situation. You're building trust with people who make a deeply personal decision slowly, so your warm, substantive presence is what makes them finally feel ready to reach out.",
    strategy_pillars: [
      {
        pillar: "Name the Feeling",
        description:
          "Put language to what your clients feel but can't articulate. That jolt of recognition — 'how did they know?' — is the strongest reason to follow and the thing that separates a real coach from generic positivity.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"You're not lazy. You're overwhelmed and calling it laziness.\"",
      },
      {
        pillar: "Real Mindset Tools",
        description:
          "Hand over an actual exercise or reframe. A usable tool proves substance, and when free advice makes someone feel different, they trust your paid work can change their life.",
        post_frequency: "1x per week",
        example_topic:
          "\"The 2-minute reframe I use with every client stuck in a decision.\"",
      },
      {
        pillar: "Client Breakthroughs",
        description:
          "Tell the arc of an internal transformation (with care) so a prospect can see themselves in it. Because life coaching is bought on emotional resonance, a well-told story beats any credential.",
        post_frequency: "1x per week",
        example_topic:
          "\"She'd been 'about to leave' her job for four years. Here's what actually unlocked it.\"",
      },
      {
        pillar: "Honest Humanity",
        description:
          "Share your own journey — the struggle, the ongoing work. In a space full of toxic positivity, authentic vulnerability is what builds real connection and trust.",
        post_frequency: "1x per week",
        example_topic:
          "\"I still catch myself doing the thing I coach people out of. Here's how I handle it.\"",
      },
      {
        pillar: "Grounded Perspective",
        description:
          "Offer substance over slogans — real psychology, real nuance. This differentiates you from the inspirational-quote crowd and reassures thoughtful prospects you're credible.",
        post_frequency: "1x per week",
        example_topic:
          "\"'Just think positive' is why you feel worse. Here's what actually helps.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Name the Feeling", topic_idea: "Put words to a struggle your client can't name", format: "Caption" },
      { day: "Tuesday", content_type: "Real Mindset Tool", topic_idea: "A usable exercise or reframe", format: "Carousel" },
      { day: "Wednesday", content_type: "Grounded Perspective", topic_idea: "Substance that counters toxic positivity", format: "Carousel" },
      { day: "Thursday", content_type: "Honest Humanity", topic_idea: "A vulnerable post from your own journey", format: "Caption" },
      { day: "Friday", content_type: "Client Breakthrough", topic_idea: "An internal transformation, told with care", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply warmly to comments — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week's content", format: "Planning" },
    ],
    growth_tactics: [
      "Lead hooks by naming the unnamed feeling; that recognition is what stops the scroll for someone quietly struggling.",
      "Give a real mindset tool regularly so people experience a genuine shift before they ever pay.",
      "Stay present across the long, emotional window in which someone decides to invest in themselves.",
      "Pin a client-story carousel so a prospect can immediately see the transformation you offer.",
      "Share your own vulnerability to build the trust a deeply personal purchase requires.",
    ],
    common_strategy_mistakes: [
      "Posting generic inspirational quotes that make people trust life coaches less. Fix: name specific feelings and give real tools.",
      "Relentless positivity that reads as fake and repels people in pain. Fix: lead with honest humanity.",
      "Keeping results abstract, so prospects can't picture the outcome. Fix: tell concrete client stories.",
      "Staying vague to seem broadly appealing. Fix: get specific about the exact change you create.",
    ],
  },
  "executive-coaches": {
    ideal_audience:
      "Senior leaders — new executives, founders scaling into CEOs, leaders who micromanage — who are discerning, decide slowly, and often follow you quietly for a long time before engaging. You're building peer-level credibility with a small, high-value audience, so your substantive, well-crafted presence is what makes you the trusted name when a leader reaches the moment of seeking a coach.",
    strategy_pillars: [
      {
        pillar: "Insider Insight",
        description:
          "Share the anonymized patterns you see in the executive experience — the isolation, the imposter feelings, the hard people calls. This vantage point is content no one else has and proves you understand the top of the org chart.",
        post_frequency: "1x per week",
        example_topic:
          "\"The higher you rise, the less honest feedback you get. Here's the danger.\"",
      },
      {
        pillar: "Leadership Shifts",
        description:
          "Teach the transformations you facilitate — micromanager to delegator, operator to strategist. When a leader recognizes their own pattern, they think 'I need this,' which is the essence of demand.",
        post_frequency: "1x per week",
        example_topic:
          "\"From operator to strategist — the shift most founders never fully make.\"",
      },
      {
        pillar: "Private Realities",
        description:
          "Speak to what leaders feel but can't say out loud. That precision is what makes a senior buyer think 'this coach gets what it's actually like up here.'",
        post_frequency: "1x per week",
        example_topic:
          "\"Nobody warns you that leadership gets lonelier the better you do it.\"",
      },
      {
        pillar: "Future of Leadership",
        description:
          "Offer a considered POV on how leadership is changing — remote, cross-generational, authority to influence. This positions you as a peer-level thinker, not a service provider.",
        post_frequency: "1x per week",
        example_topic:
          "\"Command-and-control leadership is quietly failing. Here's what's replacing it.\"",
      },
      {
        pillar: "Developable Skills",
        description:
          "Break down a real leadership capability — hard feedback, delegating, leading through uncertainty. Practical substance proves your coaching produces growth, not vague inspiration.",
        post_frequency: "1x per week",
        example_topic:
          "\"How to give feedback that actually lands — the structure I teach every leader.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Future of Leadership", topic_idea: "A POV on how leadership is evolving", format: "Caption" },
      { day: "Tuesday", content_type: "Leadership Shift", topic_idea: "A transformation leaders recognize in themselves", format: "Carousel" },
      { day: "Wednesday", content_type: "Developable Skill", topic_idea: "A practical capability, broken down", format: "Carousel" },
      { day: "Thursday", content_type: "Insider Insight", topic_idea: "An anonymized pattern you see in executives", format: "Caption" },
      { day: "Friday", content_type: "Private Realities", topic_idea: "Speak to what leaders can't say out loud", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on senior leaders' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week's refined content", format: "Planning" },
    ],
    growth_tactics: [
      "Turn the anonymized patterns from your practice into insight posts — your privileged vantage point is content no one else can write.",
      "Comment substantively on posts from senior leaders; a small, high-value audience rewards depth over volume.",
      "Frame leadership shifts so a reader recognizes their own pattern — that recognition is what creates demand.",
      "Stay consistently present for an audience that decides slowly, so you're the trusted name at the moment of need.",
      "Pin a leadership-shift carousel so a senior visitor immediately sees the depth of your work.",
    ],
    common_strategy_mistakes: [
      "Posting generic leadership platitudes that build no peer-level authority. Fix: share insider insight and real shifts.",
      "Keeping your practice's patterns private, so your depth stays invisible. Fix: publish anonymized observations.",
      "Chasing volume for a niche audience that values substance. Fix: post less, but sharper and more considered.",
      "A scrappy visual presence that undercuts credibility with discerning buyers. Fix: keep it refined and consistent.",
    ],
  },
  "sales-coaches": {
    ideal_audience:
      "Sales reps hungry for a tactical edge and the sales leaders who bring in coaches at specific moments — a missed quarter, a new team, a scaling push. This audience is ruthlessly outcome-focused and allergic to fluff, so you're building a reputation for real methodology that gets you shortlisted when a team decides it needs help.",
    strategy_pillars: [
      {
        pillar: "Deal Teardowns",
        description:
          "Dissect real deals — the objection that killed one, the reframe that saved another. Reps devour tactical breakdowns because they're directly applicable to the next call, and it proves you know the craft at the rep level.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"'It's too expensive' is never about price. Here's the one question that flips it.\"",
      },
      {
        pillar: "Repeatable Techniques",
        description:
          "Teach a technique reps can use immediately — discovery, follow-up, handling objections. When a rep tries it and it works, they become a believer who brings you to their team.",
        post_frequency: "1x per week",
        example_topic:
          "\"The discovery question that doubles close rates: 'What happens if you do nothing?'\"",
      },
      {
        pillar: "Modern Selling POV",
        description:
          "Call out the aging playbooks — aggressive closing, manipulative scarcity. A clear modern philosophy attracts teams tired of scripts that no longer work.",
        post_frequency: "1x per week",
        example_topic:
          "\"Always Be Closing is dead. Here's what actually works with modern buyers.\"",
      },
      {
        pillar: "Rep Results",
        description:
          "Share what happened when a rep applied your coaching — the metric that moved. Number-backed proof earns respect from a results-obsessed audience.",
        post_frequency: "1x per week",
        example_topic:
          "\"A rep changed one thing in follow-up. Close rate went from 18% to 31%.\"",
      },
      {
        pillar: "Sales Mindset",
        description:
          "Address the psychology — call reluctance, resilience, the identity of a top performer. This connects with the human side reps rarely get coached on.",
        post_frequency: "1x per week",
        example_topic:
          "\"The mental shift that separates reps who hit quota from reps who chase it.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Modern Selling POV", topic_idea: "A take on what modern selling requires", format: "Caption" },
      { day: "Tuesday", content_type: "Deal Teardown", topic_idea: "A real deal dissected tactically", format: "Carousel" },
      { day: "Wednesday", content_type: "Repeatable Technique", topic_idea: "A technique with the exact words", format: "Carousel" },
      { day: "Thursday", content_type: "Rep Result", topic_idea: "A number that moved after coaching", format: "Caption" },
      { day: "Friday", content_type: "Sales Mindset", topic_idea: "The psychology of a top performer", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on reps' and leaders' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week's tactical content", format: "Planning" },
    ],
    growth_tactics: [
      "Lead with tactical, number-backed hooks; this audience wants the concrete move, not motivation.",
      "Break down real deals with the exact words used — that specificity is what reps save and share.",
      "Comment on posts from sales leaders so you're top of mind when they decide to bring in a coach.",
      "Stay consistent so you catch the unpredictable moment — a missed quarter, a new team — when help is needed.",
      "Pin a technique carousel so a visiting rep immediately gets a usable win.",
    ],
    common_strategy_mistakes: [
      "Posting motivational fluff this audience is allergic to. Fix: lead with tactical, applicable techniques.",
      "Keeping your methodology vague, so leaders can't tell you deliver substance. Fix: teach real, specific moves.",
      "Clinging to old-school tactics that alienate modern teams. Fix: stake out a current selling philosophy.",
      "Going quiet, missing the timing-driven moment leaders hire. Fix: batch to stay consistently visible.",
    ],
  },
  "linkedin-coaches": {
    ideal_audience:
      "Founders, executives, and professionals who want to grow on LinkedIn but are tired of recycled guru advice — serious people who want strategy that builds real brand and pipeline. Your own feed is your proof, so you're building an audience by visibly practicing exactly what you teach.",
    strategy_pillars: [
      {
        pillar: "What Actually Works",
        description:
          "Share tested, current LinkedIn mechanics — hook structures, formats, the algorithm reality. Because your subject is the platform you're posting on, meta-content is both perfectly on-topic and endlessly in demand.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The post format getting 10x reach right now — and why the algorithm rewards it.\"",
      },
      {
        pillar: "Client Results",
        description:
          "Show real client growth (with permission) — follower jumps, inbound leads, viral posts. This proves your methods work on people other than you, answering the skeptic's core question.",
        post_frequency: "1x per week",
        example_topic:
          "\"My client went from 800 to 12,000 followers in 90 days. Here's the exact play.\"",
      },
      {
        pillar: "Growth Tactics",
        description:
          "Teach one actionable tactic in full — writing a hook, structuring a carousel, commenting for reach. When a follower tries it and their next post performs, they want your program.",
        post_frequency: "1x per week",
        example_topic:
          "\"How to write a hook that stops the scroll — the 4-part structure I teach.\"",
      },
      {
        pillar: "Anti-Guru Substance",
        description:
          "Challenge the lazy conventional wisdom — 'post daily' can backfire, engagement pods don't build business. Being the honest voice above the noise attracts serious professionals.",
        post_frequency: "1x per week",
        example_topic:
          "\"'Post every day' is the worst LinkedIn advice. Here's what my best clients do instead.\"",
      },
      {
        pillar: "Strategy Over Hacks",
        description:
          "Show how content ties to real business outcomes, not vanity metrics. This differentiates you from the reach-obsessed crowd and attracts people who want pipeline.",
        post_frequency: "1x per week",
        example_topic:
          "\"Followers are vanity. Here's the metric that actually predicts inbound leads.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Anti-Guru Substance", topic_idea: "Challenge a piece of lazy LinkedIn wisdom", format: "Caption" },
      { day: "Tuesday", content_type: "What Actually Works", topic_idea: "A current, tested platform mechanic", format: "Carousel" },
      { day: "Wednesday", content_type: "Growth Tactic", topic_idea: "One actionable tactic taught in full", format: "Carousel" },
      { day: "Thursday", content_type: "Strategy Over Hacks", topic_idea: "Tie content to real business outcomes", format: "Caption" },
      { day: "Friday", content_type: "Client Result", topic_idea: "A client's growth with the play behind it", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on target clients' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week — model your own advice", format: "Planning" },
    ],
    growth_tactics: [
      "Make your own feed the case study — a LinkedIn coach with a flat feed has no credibility, so model everything you teach.",
      "Turn every client win into a results post that proves your methods work on others.",
      "Comment on posts from your ideal clients — founders and execs — where your buyers actually are.",
      "Model relentless consistency; for you, showing up is literally the proof of concept.",
      "Pin a growth-tactic carousel that demonstrates your strategy in its own quality.",
    ],
    common_strategy_mistakes: [
      "Letting your own feed go quiet, a fatal contradiction for a LinkedIn coach. Fix: model consistency relentlessly.",
      "Recycling generic guru advice that blends into the noise. Fix: share substantive, tested, contrarian takes.",
      "Chasing vanity reach instead of tying content to outcomes. Fix: teach strategy, not just hacks.",
      "Never showing client proof, so skeptics assume it only works for you. Fix: publish client results.",
    ],
  },
  "career-coaches": {
    ideal_audience:
      "Anxious job seekers and career-changers at a specific crossroads — landing a first job, breaking into a field, escaping a toxic role, moving into leadership — who are actively searching and stressed. You're building trust with people navigating a scary, high-stakes decision, so your hopeful, actionable presence is what makes them reach out when they're ready for help.",
    strategy_pillars: [
      {
        pillar: "Hopeful Client Stories",
        description:
          "Share breakthroughs — the offer landed, the pivot achieved, confidence rebuilt. A real story of someone in the same situation succeeding is enormously reassuring and lets a worried prospect picture their own success.",
        post_frequency: "1x per week",
        example_topic:
          "\"He was ghosted 40 times. We changed one line of his summary. Three offers in a month.\"",
      },
      {
        pillar: "Actionable Steps",
        description:
          "Hand over a concrete tactic — a resume bullet rewrite, the 'tell me about yourself' answer, a negotiation script. When free advice lands an interview, they trust your coaching with their career.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"How to answer 'tell me about yourself' — the structure that actually works.\"",
      },
      {
        pillar: "Name the Fear",
        description:
          "Address the specific anxieties and misconceptions — the ghosting, imposter feelings, the interview that went nowhere. This audience is searching during a stressful time and responds to precise recognition.",
        post_frequency: "1x per week",
        example_topic:
          "\"Your resume isn't the problem. Your positioning is.\"",
      },
      {
        pillar: "Career Mindset",
        description:
          "Address the emotional side — handling rejection, imposter syndrome, the courage to leave stability. This speaks to why people stay stuck and sets you apart from the tactics-only crowd.",
        post_frequency: "1x per week",
        example_topic:
          "\"Rejection isn't feedback on your worth. Here's how to actually read it.\"",
      },
      {
        pillar: "Job Market Reality",
        description:
          "Cut through outdated career advice with what actually works now — how hiring really happens, what recruiters ignore. Being current and honest builds credibility with a skeptical audience.",
        post_frequency: "1x per week",
        example_topic:
          "\"'Just apply online' is why you're not hearing back. Here's what works instead.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Name the Fear", topic_idea: "Address a specific job-seeker anxiety", format: "Caption" },
      { day: "Tuesday", content_type: "Actionable Step", topic_idea: "A concrete tactic, taught simply", format: "Carousel" },
      { day: "Wednesday", content_type: "Job Market Reality", topic_idea: "How hiring actually works now", format: "Carousel" },
      { day: "Thursday", content_type: "Career Mindset", topic_idea: "The emotional side of career change", format: "Caption" },
      { day: "Friday", content_type: "Hopeful Client Story", topic_idea: "A breakthrough that gives hope", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply to job seekers' comments — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week's content", format: "Planning" },
    ],
    growth_tactics: [
      "Lead with the specific fear job seekers carry so they feel read, not lectured.",
      "Give a real, usable step in every teaching post; landing someone an interview builds instant trust.",
      "Comment on posts from people navigating career transitions, where your audience actively is.",
      "Stay present through the whole emotional journey before someone decides to hire a coach.",
      "Pin a hopeful client-story carousel so a discouraged visitor sees change is possible.",
    ],
    common_strategy_mistakes: [
      "Posting generic resume tips that sound like everyone else. Fix: name specific fears and give real tactics.",
      "Ignoring the emotional side, missing why people stay stuck. Fix: address the mindset of career change.",
      "Recycling outdated job-search advice. Fix: teach how hiring actually works now.",
      "Being abstract instead of actionable, so nothing builds trust. Fix: deliver a concrete win in each post.",
    ],
  },
  "leadership-coaches": {
    ideal_audience:
      "Leaders at the specific stage you serve — new managers, senior leaders scaling teams, leaders navigating change — who are self-reflective and decide to engage a coach at pivotal, unpredictable moments. You're building recognition through insight that makes a leader think 'that's exactly me,' so you're the coach they trust when the pivotal moment lands.",
    strategy_pillars: [
      {
        pillar: "Recognizable Patterns",
        description:
          "Share the recurring struggles you see — the reluctance to delegate, the avoided hard conversation, the transition from doing to leading. That recognition is the moment a leader realizes they could use a coach, and that it's you.",
        post_frequency: "1x per week",
        example_topic:
          "\"Your team isn't underperforming. You're avoiding one hard conversation.\"",
      },
      {
        pillar: "Developable Skills",
        description:
          "Break down a concrete capability — giving hard feedback, delegating without micromanaging, leading through uncertainty. Practical substance proves your coaching produces real growth.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"How to delegate without micromanaging — the handoff most leaders get wrong.\"",
      },
      {
        pillar: "Honest Mirror",
        description:
          "Name a leader's private struggle or the uncomfortable truth. Leaders are self-reflective, so a hook that holds up an honest mirror stops them mid-scroll and signals you understand the role from the inside.",
        post_frequency: "1x per week",
        example_topic:
          "\"Your delegation problem is a trust problem — and the trust problem is about you.\"",
      },
      {
        pillar: "Leadership Philosophy",
        description:
          "Make your point of view on good leadership visible. Leaders choose coaches whose philosophy they respect, so a clear conviction attracts the leaders who resonate with it.",
        post_frequency: "1x per week",
        example_topic:
          "\"The best leaders I coach do one counterintuitive thing: they say 'I don't know' more.\"",
      },
      {
        pillar: "Leadership Reality",
        description:
          "Speak to the weight of leading — the loneliness, the pressure, the invisible decisions. This resonates with leaders who assume nobody understands.",
        post_frequency: "1x per week",
        example_topic:
          "\"Nobody prepares you for how isolating a leadership role gets.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Leadership Philosophy", topic_idea: "Your POV on what good leadership is", format: "Caption" },
      { day: "Tuesday", content_type: "Recognizable Pattern", topic_idea: "A struggle leaders recognize in themselves", format: "Carousel" },
      { day: "Wednesday", content_type: "Developable Skill", topic_idea: "A concrete capability, broken down", format: "Carousel" },
      { day: "Thursday", content_type: "Honest Mirror", topic_idea: "Name an uncomfortable leadership truth", format: "Caption" },
      { day: "Friday", content_type: "Leadership Reality", topic_idea: "The weight leaders quietly carry", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on leaders' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week from client patterns", format: "Planning" },
    ],
    growth_tactics: [
      "Turn the patterns you see across clients into posts that make leaders recognize themselves.",
      "Comment on posts from leaders at your target stage, building relationships before the pivotal moment.",
      "Teach a developable skill weekly so leaders see your coaching produces growth, not inspiration.",
      "Stay consistently present so you're the trusted name when a leader's pivotal moment arrives.",
      "Pin a pattern-recognition carousel so a visiting leader immediately thinks 'that's me.'",
    ],
    common_strategy_mistakes: [
      "Posting leadership platitudes that read as generic. Fix: share recognizable patterns and real skills.",
      "Keeping your philosophy hidden, so leaders can't tell if you align. Fix: make your conviction visible.",
      "Being inspirational instead of practical, so credibility stays thin. Fix: teach concrete capabilities.",
      "Going quiet, missing the unpredictable moment of need. Fix: batch to stay steadily present.",
    ],
  },
  "mindset-coaches": {
    ideal_audience:
      "Thoughtful people held back by the specific mental patterns you address — self-doubt, scarcity thinking, fear-driven decisions — who are skeptical of empty positivity and want substance. You're building trust with people making a personal decision slowly, so your grounded, real-tool presence is what makes them finally invest in changing how they think.",
    strategy_pillars: [
      {
        pillar: "Expose Limiting Beliefs",
        description:
          "Name a belief the reader doesn't realize they hold. Surfacing an invisible mental pattern creates a jolt of recognition and curiosity — the hook your whole practice runs on.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"You don't lack discipline. You believe you're the kind of person who quits.\"",
      },
      {
        pillar: "Real Reframes",
        description:
          "Hand over an actual mental tool — the situation, the default thought, the reframe, the practice. When a reader's thinking shifts even slightly, they trust your deeper work.",
        post_frequency: "1x per week",
        example_topic:
          "\"The reframe I use when a client is stuck: change the question, not the answer.\"",
      },
      {
        pillar: "Grounded in Psychology",
        description:
          "Reference the real mechanisms — how beliefs form, why the brain resists change. This substance sets you apart from the 'good vibes' crowd and reassures skeptical prospects.",
        post_frequency: "1x per week",
        example_topic:
          "\"Why 'just think positive' backfires — what the research says about suppression.\"",
      },
      {
        pillar: "Believable Transformations",
        description:
          "Tell the arc of a client's internal shift — the belief that held them back, the change that followed. A concrete before-and-after of thinking is far more persuasive than any claim about mindset.",
        post_frequency: "1x per week",
        example_topic:
          "\"He turned down 3 promotions from a 30-year-old belief he'd never examined.\"",
      },
      {
        pillar: "Anti-Hype POV",
        description:
          "Push back on the positivity peddlers with honest nuance. Being the mindset coach with real depth attracts people tired of surface-level inspiration.",
        post_frequency: "1x per week",
        example_topic:
          "\"Manifestation isn't magic. Here's the actual psychology of why belief changes behavior.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Anti-Hype POV", topic_idea: "Counter a piece of positivity fluff", format: "Caption" },
      { day: "Tuesday", content_type: "Expose Limiting Belief", topic_idea: "Name a hidden belief the reader holds", format: "Carousel" },
      { day: "Wednesday", content_type: "Real Reframe", topic_idea: "A usable mental tool, taught", format: "Carousel" },
      { day: "Thursday", content_type: "Grounded in Psychology", topic_idea: "The real mechanism behind a pattern", format: "Caption" },
      { day: "Friday", content_type: "Believable Transformation", topic_idea: "A client's internal shift, told concretely", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply to comments thoughtfully — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week's grounded content", format: "Planning" },
    ],
    growth_tactics: [
      "Lead hooks by exposing a hidden belief; the recognition sparks the curiosity your work depends on.",
      "Give a real reframe regularly so people experience a genuine shift before they pay.",
      "Ground content in real psychology so thoughtful prospects trust you over the positivity peddlers.",
      "Stay present across the slow, personal journey toward deciding to do inner work.",
      "Pin a transformation carousel so a visitor sees your internal results made visible.",
    ],
    common_strategy_mistakes: [
      "Posting 'good vibes' quotes that make people distrust mindset coaches. Fix: expose real beliefs and give tools.",
      "Keeping results invisible and abstract. Fix: tell concrete before-and-after belief stories.",
      "Leaning mystical instead of grounded, losing the skeptics. Fix: reference real psychology.",
      "Sporadic posting, so you miss the slow decision. Fix: batch for consistent presence.",
    ],
  },
  "productivity-coaches": {
    ideal_audience:
      "Overwhelmed professionals, procrastinating creatives, and founders drowning in busywork who are exhausted from failing at productivity systems and hungry for a fresh approach. You're building trust with people who seek help at unpredictable moments of overwhelm, so your calm, systems-based presence is what makes you the coach they reach for at their breaking point.",
    strategy_pillars: [
      {
        pillar: "Challenge the Myths",
        description:
          "Overturn hustle-and-willpower assumptions. Your audience is exhausted from failing, so reframing their struggle as a design problem rather than a personal failing is both a relief and a magnet.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"You don't need more discipline. You need fewer decisions.\"",
      },
      {
        pillar: "Adoptable Systems",
        description:
          "Give a real, implementable system — a weekly reset, a focus method, a way to protect deep work. When someone tries it and gets a calmer day, they believe your coaching can transform how they work.",
        post_frequency: "1x per week",
        example_topic:
          "\"The 20-minute weekly reset that keeps my clients out of overwhelm.\"",
      },
      {
        pillar: "Sustainability & Burnout",
        description:
          "Talk about working with your energy and avoiding burnout, not squeezing more from every hour. This human angle differentiates you from the grind-harder crowd.",
        post_frequency: "1x per week",
        example_topic:
          "\"Relentless optimization is why you're burnt out. Here's the sustainable alternative.\"",
      },
      {
        pillar: "Client Turnarounds",
        description:
          "Share a transformation led by the specific system — from overwhelmed to in control. Proof counters the skepticism about hacks that never stick.",
        post_frequency: "1x per week",
        example_topic:
          "\"He worked 65-hour weeks. We deleted 3 recurring meetings and he got 6 hours back.\"",
      },
      {
        pillar: "Focus & Attention",
        description:
          "Teach the real mechanics of focus in a distracted world. This is the practical substance that proves your approach is different from generic tips.",
        post_frequency: "1x per week",
        example_topic:
          "\"Why your to-do list makes you less productive — and what to use instead.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Challenge the Myths", topic_idea: "Overturn a productivity assumption", format: "Caption" },
      { day: "Tuesday", content_type: "Adoptable System", topic_idea: "A real, implementable system", format: "Carousel" },
      { day: "Wednesday", content_type: "Focus & Attention", topic_idea: "The real mechanics of focus", format: "Carousel" },
      { day: "Thursday", content_type: "Sustainability & Burnout", topic_idea: "A sustainable alternative to grind", format: "Caption" },
      { day: "Friday", content_type: "Client Turnaround", topic_idea: "A transformation led by the system", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply to overwhelmed readers — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week — model your own calm", format: "Planning" },
    ],
    growth_tactics: [
      "Lead with myth-challenging hooks that offer relief to people exhausted from failing at systems.",
      "Give an adoptable system regularly so a reader gets a calmer day and trusts your coaching.",
      "Comment on posts from overwhelmed professionals in your target field.",
      "Model consistency without chaos — for a productivity coach, that's proof of your methods.",
      "Pin a system carousel so a visitor immediately gets something they can implement today.",
    ],
    common_strategy_mistakes: [
      "Posting generic 'top 10 tips' this audience has already tried and abandoned. Fix: give real, adoptable systems.",
      "Selling grind and optimization, contradicting what burnt-out people need. Fix: champion sustainability.",
      "Keeping proof abstract, so skepticism about hacks persists. Fix: share concrete client turnarounds.",
      "A chaotic content pattern that contradicts your message. Fix: model the calm consistency you teach.",
    ],
  },
  "public-speaking-coaches": {
    ideal_audience:
      "Nervous speakers and ambitious presenters facing a specific goal — conquering stage fright, landing keynotes, presenting to executives — who often seek help when a high-stakes talk suddenly appears. You're building trust with a huge, quiet audience who dread presenting, so your empathetic, technique-driven presence makes you the name they remember when pressure hits.",
    strategy_pillars: [
      {
        pillar: "Name the Fear",
        description:
          "Speak to the visceral dread — the blank mind, shaking hands, racing heart. Fear of speaking is near-universal and rarely discussed openly, so naming it with empathy cuts straight through.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The moment your mind goes blank on stage isn't nerves — it's a fixable pattern.\"",
      },
      {
        pillar: "Usable Techniques",
        description:
          "Teach something they can use in their next presentation — how to open, handle a blank, use pauses. When a tip makes their next talk go better, they believe you can transform them.",
        post_frequency: "1x per week",
        example_topic:
          "\"What to do when your mind goes blank — the recovery move that saves the room.\"",
      },
      {
        pillar: "Speaking Is Learnable",
        description:
          "Dismantle the 'born speaker' myth. This gives hope to people who've written themselves off and positions you as the coach who can teach anyone.",
        post_frequency: "1x per week",
        example_topic:
          "\"Great speakers aren't born. Here's the practice that builds the skill.\"",
      },
      {
        pillar: "Breakthrough Stories",
        description:
          "Share a client conquering their fear. Because speaking fear is so relatable, these stories are deeply resonant and let a terrified prospect imagine their own confidence.",
        post_frequency: "1x per week",
        example_topic:
          "\"She shook so hard she couldn't hold her notes. Six weeks later she keynoted to 400.\"",
      },
      {
        pillar: "Presence & Delivery",
        description:
          "Teach the craft of holding a room — story structure, vocal variety, stage presence. This is the practical depth that shows you're more than a confidence cheerleader.",
        post_frequency: "1x per week",
        example_topic:
          "\"The 3-second pause that makes an audience lean in.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Speaking Is Learnable", topic_idea: "Bust the 'born speaker' myth", format: "Caption" },
      { day: "Tuesday", content_type: "Usable Technique", topic_idea: "A technique for the next presentation", format: "Carousel" },
      { day: "Wednesday", content_type: "Presence & Delivery", topic_idea: "A craft element of holding a room", format: "Carousel" },
      { day: "Thursday", content_type: "Name the Fear", topic_idea: "Address the visceral dread with empathy", format: "Caption" },
      { day: "Friday", content_type: "Breakthrough Story", topic_idea: "A client conquering the stage", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply to nervous presenters — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week's content", format: "Planning" },
    ],
    growth_tactics: [
      "Name the fear of the stage with empathy; it connects instantly with a huge, quiet audience.",
      "Give a technique they can use in the talk they're dreading next week.",
      "Comment on posts from professionals who mention upcoming talks or presentation anxiety.",
      "Stay consistent so you're top of mind the moment a big, nerve-wracking talk gets scheduled.",
      "Pin a breakthrough-story carousel so a terrified visitor sees it's possible.",
    ],
    common_strategy_mistakes: [
      "Only posting polished inspiration, ignoring the raw fear. Fix: name the visceral dread with empathy.",
      "Reinforcing the 'born speaker' myth, so people write themselves off. Fix: show it's a learnable skill.",
      "Staying vague instead of giving usable techniques. Fix: teach moves they can apply immediately.",
      "Going quiet, so you're forgotten when a talk suddenly looms. Fix: batch to stay present.",
    ],
  },
  "health-coaches": {
    ideal_audience:
      "Confused, discouraged people living the specific health struggle you address — gut health, energy, sustainable weight, healthy habits for busy professionals — who've been burned by crash approaches and shame-based content. You're building trust with people who decide to prioritize their health slowly, so your empathetic, sustainable presence is what makes them finally commit with you.",
    strategy_pillars: [
      {
        pillar: "Myths & Misinformation",
        description:
          "Counter the health confusion with clarity and compassion. The internet is full of noise, so empathetic myth-busting cuts through and reaches the discouraged reader.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"You don't need to detox. Your liver's been doing it free since you were born.\"",
      },
      {
        pillar: "Behavior-Led Wins",
        description:
          "Share client results led by the sustainable habit, not a number. This proves a repeatable process to someone burned by quick fixes.",
        post_frequency: "1x per week",
        example_topic:
          "\"Her energy came back in 3 weeks. We changed one thing: she ate breakfast.\"",
      },
      {
        pillar: "Doable Steps",
        description:
          "Give a real, achievable change — a morning routine, a sleep fix, better eating without dieting. Small real wins beat overwhelming overhauls for people tired of all-or-nothing.",
        post_frequency: "1x per week",
        example_topic:
          "\"The 3pm energy crash is fixable — and it starts with breakfast, not coffee.\"",
      },
      {
        pillar: "Sustainable Over Quick Fix",
        description:
          "Reject detox-and-crash culture; talk about realistic, keepable change. This speaks to people exhausted by yo-yo approaches and attracts those who want lasting results.",
        post_frequency: "1x per week",
        example_topic:
          "\"Health isn't a 30-day challenge. It's the boring habits you keep for years.\"",
      },
      {
        pillar: "Energy & Wellbeing",
        description:
          "Focus on how people want to feel — energy, clarity, confidence — not just metrics. This connects with the outcome that actually motivates a busy professional.",
        post_frequency: "1x per week",
        example_topic:
          "\"You don't want to lose weight. You want your energy and confidence back.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Myths & Misinformation", topic_idea: "Debunk a health myth with empathy", format: "Carousel" },
      { day: "Tuesday", content_type: "Doable Step", topic_idea: "One achievable change, taught simply", format: "Carousel" },
      { day: "Wednesday", content_type: "Sustainable Over Quick Fix", topic_idea: "Reframe health as a long game", format: "Caption" },
      { day: "Thursday", content_type: "Energy & Wellbeing", topic_idea: "Lead with how people want to feel", format: "Caption" },
      { day: "Friday", content_type: "Behavior-Led Win", topic_idea: "A client win led by the habit shift", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply warmly to discouraged readers — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week's content", format: "Planning" },
    ],
    growth_tactics: [
      "Bust myths with compassion, not condescension — your audience was misled, not stupid.",
      "Lead client wins with the behavior change so prospects see a repeatable process, not a quick fix.",
      "Comment on posts from stressed professionals, not other coaches, where your buyers are.",
      "Stay present across the slow, frustrating journey before someone commits to their health.",
      "Pin a doable-step carousel so a discouraged visitor gets a real, achievable win.",
    ],
    common_strategy_mistakes: [
      "Adding to health shame and fear. Fix: lead with empathy and clarity.",
      "Leading with numbers instead of how people want to feel. Fix: sell energy and confidence.",
      "Selling detoxes and challenges like everyone else. Fix: champion sustainable, keepable change.",
      "Posting sporadically, so you can't compete with constantly-posting influencers. Fix: batch for consistency.",
    ],
  },
  "wellness-coaches": {
    ideal_audience:
      "Depleted, overworked professionals running on empty in the specific way you address — stress, burnout, work-life imbalance — who haven't yet admitted they need help. You're building trust with high-achievers who reach out only when they hit their limit, so your grounded, realistic presence is the steady voice they turn to when something finally has to change.",
    strategy_pillars: [
      {
        pillar: "The Cost of Ignoring It",
        description:
          "Name the real consequences of burnout and chronic stress. High-achievers ignore the signals until named plainly, so this reaches the overworked professional who hasn't admitted it yet.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"Your exhaustion isn't a productivity problem. It's a warning.\"",
      },
      {
        pillar: "Real Practices",
        description:
          "Give an actual practice — a boundary method, a stress reset, restorative habits for a busy day. Real, doable practices differentiate you from abstract self-care that helps no one.",
        post_frequency: "1x per week",
        example_topic:
          "\"The 90-second reset that pulls you out of stress mode mid-day.\"",
      },
      {
        pillar: "Realistic, Not Toxic",
        description:
          "Be honest that wellbeing is hard, rest isn't lazy, boundaries cost something. This authenticity resonates with people tired of being told to just meditate and be grateful.",
        post_frequency: "1x per week",
        example_topic:
          "\"Self-care isn't bubble baths. Sometimes it's a hard conversation you've been avoiding.\"",
      },
      {
        pillar: "Client Shifts",
        description:
          "Share a transformation from burnt out to balanced with the specific practice or boundary behind it. A concrete story makes internal results tangible and credible.",
        post_frequency: "1x per week",
        example_topic:
          "\"He wasn't burnt out from work. He was burnt out from being available at 11pm.\"",
      },
      {
        pillar: "Sustainable High Performance",
        description:
          "Show that wellbeing and ambition aren't opposites. This speaks to driven professionals who fear that slowing down means falling behind.",
        post_frequency: "1x per week",
        example_topic:
          "\"You don't perform despite rest. You perform because of it.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "The Cost of Ignoring It", topic_idea: "Name the real cost of depletion", format: "Caption" },
      { day: "Tuesday", content_type: "Real Practice", topic_idea: "A doable wellbeing practice", format: "Carousel" },
      { day: "Wednesday", content_type: "Sustainable High Performance", topic_idea: "Wellbeing and ambition aligned", format: "Carousel" },
      { day: "Thursday", content_type: "Realistic, Not Toxic", topic_idea: "An honest take countering toxic positivity", format: "Caption" },
      { day: "Friday", content_type: "Client Shift", topic_idea: "A burnt-out-to-balanced story", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply to depleted professionals — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week's grounding content", format: "Planning" },
    ],
    growth_tactics: [
      "Name the real cost of ignoring wellbeing to reach the high-achiever running on empty.",
      "Give a real practice regularly so a reader feels a moment of calm and trusts your work.",
      "Comment on posts from overworked professionals in demanding industries.",
      "Stay present for the slow-building moment someone reaches their limit.",
      "Pin a real-practice carousel so a depleted visitor gets immediate relief.",
    ],
    common_strategy_mistakes: [
      "Posting toxic-positivity self-care that people dismiss. Fix: be honest and grounded about the hard work of wellbeing.",
      "Keeping results abstract, so wellness looks fluffy. Fix: tell concrete client shift stories.",
      "Framing rest as opposed to ambition, alienating driven people. Fix: show sustainable high performance.",
      "A chaotic feed that contradicts the calm you sell. Fix: keep it serene and consistent.",
    ],
  },
  "relationship-coaches": {
    ideal_audience:
      "People quietly hurting in the specific area you serve — dating, a struggling relationship, communication, healing after a breakup — who are vulnerable and carry shame. You're building trust with people making an intimate decision slowly, so your compassionate, non-judgmental presence is what makes a hurting person feel safe enough to finally reach out.",
    strategy_pillars: [
      {
        pillar: "Name the Pattern",
        description:
          "Name a relationship dynamic the reader recognizes but can't articulate. Because people rarely have language for their patterns, giving them that language is magnetic.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"You keep attracting the same wrong partner because 'familiar' feels like 'safe.'\"",
      },
      {
        pillar: "Real Tools",
        description:
          "Hand over a usable tool — a communication technique, a boundary script, a conflict reframe. When a real conversation goes better, they believe you can transform their relationships.",
        post_frequency: "1x per week",
        example_topic:
          "\"The repair attempt — the exact words that de-escalate almost any argument.\"",
      },
      {
        pillar: "Compassion, Not Judgment",
        description:
          "Normalize the struggle — 'this is human, and it's fixable.' Relationship struggles carry shame, so empathy is what makes a vulnerable prospect feel safe rather than criticized.",
        post_frequency: "1x per week",
        example_topic:
          "\"If you shut down during conflict, you're not broken. Here's what's actually happening.\"",
      },
      {
        pillar: "Breakthrough Stories",
        description:
          "Tell the arc of a client's breakthrough (with care and anonymity). A story of someone finding their way through is profoundly reassuring to someone hurting.",
        post_frequency: "1x per week",
        example_topic:
          "\"They'd had the same fight for six years. It was never about the dishes.\"",
      },
      {
        pillar: "Healthy Dynamics",
        description:
          "Teach what healthy actually looks like — needs, boundaries, repair. This gives people a model to move toward and positions you as a guide, not a critic.",
        post_frequency: "1x per week",
        example_topic:
          "\"Healthy relationships aren't conflict-free. They're good at repair.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Name the Pattern", topic_idea: "Name a painful dynamic the reader lives", format: "Caption" },
      { day: "Tuesday", content_type: "Real Tool", topic_idea: "A usable communication or boundary tool", format: "Carousel" },
      { day: "Wednesday", content_type: "Healthy Dynamics", topic_idea: "What healthy actually looks like", format: "Carousel" },
      { day: "Thursday", content_type: "Compassion, Not Judgment", topic_idea: "Normalize a struggle with empathy", format: "Caption" },
      { day: "Friday", content_type: "Breakthrough Story", topic_idea: "A client breakthrough, told with care", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply gently to comments — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week's compassionate content", format: "Planning" },
    ],
    growth_tactics: [
      "Name painful patterns so a struggling reader feels seen in something they've never articulated.",
      "Give a real tool that makes one difficult conversation go better.",
      "Lead with compassion; shame-based content repels the vulnerable people who need you.",
      "Stay present across the slow, intimate journey before someone trusts you with their heart.",
      "Pin a healthy-dynamics carousel so a hurting visitor immediately feels a safe, non-judgmental space.",
    ],
    common_strategy_mistakes: [
      "Judgmental or preachy content that repels people carrying shame. Fix: lead with compassion.",
      "Vague 'communicate more' advice that helps no one. Fix: give real, usable tools.",
      "Keeping results abstract. Fix: tell careful, anonymized breakthrough stories.",
      "Posting sporadically, so trust never builds. Fix: batch to stay steadily present.",
    ],
  },
  "management-consultants": {
    ideal_audience:
      "The senior decision-makers who hire consultants — executives facing operational, organizational, or transformation challenges — plus the peers and firms who track sharp thinking. You're building authority on a specific business problem so that when that challenge lands on an executive's desk, you're the name they think of.",
    strategy_pillars: [
      {
        pillar: "Frameworks & Methods",
        description:
          "Share the structured thinking clients pay for — the diagnostic that found the real problem, the change approach that stuck. Visible thinking is the most direct proof of your rigor.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The diagnostic I run first on any transformation — it usually reveals the wrong problem was being solved.\"",
      },
      {
        pillar: "Reframe the Problem",
        description:
          "Offer a sharper diagnosis than the reader has. A counterintuitive reframe signals the diagnostic skill executives value and makes a leader rethink their assumption.",
        post_frequency: "1x per week",
        example_topic:
          "\"Your restructuring will fail for the same reason 70% do — and it's not the org chart.\"",
      },
      {
        pillar: "Engagement Lessons",
        description:
          "Share anonymized lessons from real work — what actually drives change, why initiatives fail. This proves you have a repeatable approach, not just theory.",
        post_frequency: "1x per week",
        example_topic:
          "\"Every failed transformation I've seen shared one thing: no one owned the outcome.\"",
      },
      {
        pillar: "Industry Foresight",
        description:
          "Share where business is heading — the shifts reshaping how organizations work. A forward-looking POV positions you as a strategic thinker, not a hired pair of hands.",
        post_frequency: "1x per week",
        example_topic:
          "\"The operating-model shift most companies will be forced into within three years.\"",
      },
      {
        pillar: "Executive POV",
        description:
          "Take clear positions on management and organizational questions. A distinct point of view builds the reputation that makes leaders seek your perspective.",
        post_frequency: "1x per week",
        example_topic:
          "\"Most cost-cutting destroys value. Here's the one kind that actually works.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Executive POV", topic_idea: "A clear position on a management question", format: "Caption" },
      { day: "Tuesday", content_type: "Framework & Method", topic_idea: "A diagnostic or methodology, shown", format: "Carousel" },
      { day: "Wednesday", content_type: "Reframe the Problem", topic_idea: "A sharper diagnosis of a common issue", format: "Carousel" },
      { day: "Thursday", content_type: "Industry Foresight", topic_idea: "Where business is heading", format: "Caption" },
      { day: "Friday", content_type: "Engagement Lesson", topic_idea: "An anonymized lesson from real work", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on executives' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Turn a framework into next week's batch", format: "Planning" },
    ],
    growth_tactics: [
      "Turn the frameworks you already build in client decks into public proof of your rigor.",
      "Lead with a reframe that makes an executive rethink their assumption — that signals diagnostic skill.",
      "Comment on posts from senior decision-makers in your target sectors.",
      "Stay visible to a small, senior buyer pool so you're the name at the moment of need.",
      "Pin a framework carousel so a visiting executive immediately sees how you think.",
    ],
    common_strategy_mistakes: [
      "Posting generic business commentary that builds no distinct authority. Fix: share your specific frameworks.",
      "Keeping your thinking in client decks, so buyers never see it. Fix: publish your methods.",
      "Offering obvious advice to a sophisticated audience. Fix: lead with counterintuitive reframes.",
      "Inconsistent presence, so reputation never compounds. Fix: batch despite demanding engagements.",
    ],
  },
  "strategy-consultants": {
    ideal_audience:
      "C-suite leaders facing high-stakes strategic questions — market entry, competitive positioning, growth — plus the elite peers who respect superior thinking. You're building a reputation for non-obvious insight so that a senior leader seeks your specific perspective at their next inflection point.",
    strategy_pillars: [
      {
        pillar: "Non-Obvious Insight",
        description:
          "Share genuinely sharp analysis, especially contrarian takes. For a strategy consultant the quality of your thinking is the entire product, so non-obvious insight is your most persuasive proof.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"Most companies enter the wrong market — because of a bias in how they size TAM.\"",
      },
      {
        pillar: "Strategic Reasoning",
        description:
          "Walk through how you'd evaluate a market or threat, end to end. Since buyers hire based on how you think, showing your reasoning is the most direct proof you're worth an elite engagement.",
        post_frequency: "1x per week",
        example_topic:
          "\"How I'd evaluate this market — the standard analysis, why it misleads, the sharper question.\"",
      },
      {
        pillar: "Analyze the Moves",
        description:
          "Give an incisive read on high-profile strategic decisions everyone's watching. Being the consultant with the sharpest take on the moves everyone's discussing is a fast route to reputation.",
        post_frequency: "1x per week",
        example_topic:
          "\"Everyone's calling this a pricing decision. It's a positioning decision made two years ago.\"",
      },
      {
        pillar: "Own a Domain",
        description:
          "Keep reinforcing the specific strategic question you're known for. Owning a domain makes a C-suite leader seek you specifically when that challenge arises.",
        post_frequency: "1x per week",
        example_topic:
          "\"Three questions to answer before any market-entry decision.\"",
      },
      {
        pillar: "Contrarian POV",
        description:
          "Take positions that challenge conventional strategic wisdom. A distinct, defensible contrarian view earns the attention of a senior, skeptical audience.",
        post_frequency: "1x per week",
        example_topic:
          "\"First-mover advantage is mostly a myth. Here's what actually compounds.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Contrarian POV", topic_idea: "A position challenging strategic wisdom", format: "Caption" },
      { day: "Tuesday", content_type: "Non-Obvious Insight", topic_idea: "A sharp, contrarian analysis", format: "Carousel" },
      { day: "Wednesday", content_type: "Strategic Reasoning", topic_idea: "A reasoning walk-through", format: "Carousel" },
      { day: "Thursday", content_type: "Own a Domain", topic_idea: "Reinforce your signature question", format: "Caption" },
      { day: "Friday", content_type: "Analyze the Moves", topic_idea: "An incisive read on a major move", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on senior leaders' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Turn an insight into next week's batch", format: "Planning" },
    ],
    growth_tactics: [
      "Publish the sharp analysis you'd otherwise keep in client rooms — your thinking is the product.",
      "Analyze the strategic moves everyone's watching to showcase your lens in real time.",
      "Comment substantively on posts from C-suite leaders in your domain.",
      "Stay visible to an elite buyer pool so you're the mind they turn to at an inflection point.",
      "Pin a reasoning carousel so a senior visitor experiences the caliber of your thinking.",
    ],
    common_strategy_mistakes: [
      "Posting surface commentary a senior audience scrolls past. Fix: lead with non-obvious insight.",
      "Keeping your best thinking private. Fix: make your reasoning visible.",
      "Trying to cover everything instead of owning a domain. Fix: reinforce one signature question.",
      "Flashy presentation that reads as a mismatch at this level. Fix: keep it understated and elite.",
    ],
  },
  "brand-consultants": {
    ideal_audience:
      "Founders and marketing leaders whose brand isn't working and who resonate with a specific philosophy of what great branding is. You're building a reputation around a distinct worldview so that the clients who agree with you seek you out — and, because you sell brand, your own flawless presence is the ultimate proof.",
    strategy_pillars: [
      {
        pillar: "Brand Philosophy",
        description:
          "Make your point of view on what great branding is unmistakable. Clients hire brand consultants whose worldview they resonate with, so a strong philosophy attracts aligned clients and repels mismatches.",
        post_frequency: "1x per week",
        example_topic:
          "\"A brand isn't your logo. It's the gap between what you promise and what you deliver.\"",
      },
      {
        pillar: "Expose Brand Mistakes",
        description:
          "Call out the common, costly branding errors. Naming a mistake the reader is probably making signals diagnostic expertise and sparks 'wait, is my brand doing that?'",
        post_frequency: "1–2x per week",
        example_topic:
          "\"Your brand isn't confusing customers because of your logo. It's your positioning.\"",
      },
      {
        pillar: "Teach a Principle",
        description:
          "Break down a real branding principle — building positioning, why consistency compounds, finding the core message. Teaching demonstrates substance and lets prospects experience your thinking.",
        post_frequency: "1x per week",
        example_topic:
          "\"The one question that surfaces a brand's real differentiator.\"",
      },
      {
        pillar: "Analyze Famous Brands",
        description:
          "Break down why a well-known brand works or fails. Familiar examples make your abstract expertise tangible and spark discussion.",
        post_frequency: "1x per week",
        example_topic:
          "\"Why this famous rebrand worked — and the strategic bet behind it.\"",
      },
      {
        pillar: "Transformation Proof",
        description:
          "Show before-and-after brand work led by the strategic thinking, not the logo. This proves you deliver business results, which is what discerning clients buy.",
        post_frequency: "1x per week",
        example_topic:
          "\"They thought they needed a rebrand. They needed one clear answer to 'what do you do?'\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Brand Philosophy", topic_idea: "Reinforce your worldview on branding", format: "Caption" },
      { day: "Tuesday", content_type: "Expose Brand Mistakes", topic_idea: "Call out a common branding error", format: "Carousel" },
      { day: "Wednesday", content_type: "Teach a Principle", topic_idea: "A real branding principle, taught", format: "Carousel" },
      { day: "Thursday", content_type: "Analyze Famous Brands", topic_idea: "Break down a recognizable brand", format: "Caption" },
      { day: "Friday", content_type: "Transformation Proof", topic_idea: "A before-and-after led by the thinking", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on founders' and marketers' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week — keep your feed flawless", format: "Planning" },
    ],
    growth_tactics: [
      "Make your own feed impeccable — you sell brand consistency, so it's your ultimate proof of concept.",
      "Expose a common branding mistake to trigger self-recognition in a business owner.",
      "Analyze famous brands to make your abstract expertise tangible and shareable.",
      "Reinforce your philosophy so clients who resonate with your worldview self-select in.",
      "Pin a transformation carousel showing real business results, not just a pretty logo.",
    ],
    common_strategy_mistakes: [
      "An inconsistent, scrappy feed — fatal for someone selling brand. Fix: keep it flawlessly on-brand.",
      "Listing services instead of a worldview. Fix: lead with a distinct brand philosophy.",
      "Showing logos, not strategic results. Fix: publish before-and-afters led by the thinking.",
      "Staying abstract, so prospects can't grasp your expertise. Fix: analyze brands everyone knows.",
    ],
  },
  "marketing-consultants": {
    ideal_audience:
      "Business owners and marketing leaders frustrated that their marketing isn't working, who value a proven expert on their specific challenge. You're building authority on one marketing outcome so the right buyer arrives pre-sold — and, because you sell marketing, your own consistent presence proves you can do it.",
    strategy_pillars: [
      {
        pillar: "Proof & Results",
        description:
          "Share client wins with real numbers and the strategy behind them. Marketing buyers are skeptical, so showing results and reasoning proves you deliver, not just claim.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"We tripled qualified leads in 90 days — by turning off two channels, not adding one.\"",
      },
      {
        pillar: "Challenge the Wisdom",
        description:
          "Overturn a common marketing belief. A contrarian angle cuts through the generic best-practice noise and marks you as a strategic thinker.",
        post_frequency: "1x per week",
        example_topic:
          "\"You don't need more content. You need to distribute what you already made.\"",
      },
      {
        pillar: "Teach a Playbook",
        description:
          "Give a usable playbook — positioning, a content engine, a funnel fix. Teaching openly attracts clients who realize they'd rather have you implement it.",
        post_frequency: "1x per week",
        example_topic:
          "\"How to fix a leaky funnel — the audit I run before touching the ads.\"",
      },
      {
        pillar: "Trends & Channels",
        description:
          "Share your take on what's working now. A current, informed POV reassures prospects your advice isn't outdated in a fast-moving field.",
        post_frequency: "1x per week",
        example_topic:
          "\"The channel quietly dying in 2026 — and where that budget should go.\"",
      },
      {
        pillar: "Marketing POV",
        description:
          "Take clear positions on how marketing should be done. A distinct point of view builds the reputation that makes a business think of you when marketing breaks.",
        post_frequency: "1x per week",
        example_topic:
          "\"Brand and performance aren't opposites. Treating them as such is why your CAC keeps rising.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Marketing POV", topic_idea: "A clear position on how marketing should work", format: "Caption" },
      { day: "Tuesday", content_type: "Proof & Results", topic_idea: "A client win with real numbers", format: "Carousel" },
      { day: "Wednesday", content_type: "Teach a Playbook", topic_idea: "A usable marketing playbook", format: "Carousel" },
      { day: "Thursday", content_type: "Challenge the Wisdom", topic_idea: "Overturn a marketing belief", format: "Caption" },
      { day: "Friday", content_type: "Trends & Channels", topic_idea: "What's working now", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on business owners' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week — model your own marketing", format: "Planning" },
    ],
    growth_tactics: [
      "Model the consistency you'd advise any client to keep — your feed is proof you can do the job.",
      "Turn every client result into a proof post that answers the skeptical buyer's first question.",
      "Challenge conventional marketing wisdom to stand out from the best-practice crowd.",
      "Comment on posts from business owners, not other marketers, where your buyers are.",
      "Pin a playbook carousel so prospects experience your thinking before they hire you.",
    ],
    common_strategy_mistakes: [
      "Neglecting your own marketing, undermining your expertise. Fix: model the consistency you preach.",
      "Repeating best-practice platitudes. Fix: lead with contrarian, strategic takes.",
      "Keeping results private, so skeptics doubt you. Fix: publish proof with real numbers.",
      "Sounding outdated in a fast field. Fix: share current, informed takes on what works now.",
    ],
  },
  "innovation-consultants": {
    ideal_audience:
      "Leaders at organizations facing disruption or stalled growth who are cynical about innovation buzzwords and want substance. You're building a reputation for real, shipped results — not theater — so that when a company hits its crossroads, you're the credible advisor they trust to actually deliver change.",
    strategy_pillars: [
      {
        pillar: "Puncture the Theater",
        description:
          "Call out the fake version of innovation everyone recognizes. Naming the gap between innovation talk and real results marks you as the consultant who delivers substance.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"Your innovation lab is theater. Nothing ships because nobody can kill anything.\"",
      },
      {
        pillar: "Real Methods",
        description:
          "Teach a practical method — a real discovery sprint, killing bad ideas fast, a culture that ships. Concrete methodology separates you from the inspiration-only crowd.",
        post_frequency: "1x per week",
        example_topic:
          "\"How to kill an idea properly — the ritual that unblocks a stuck team.\"",
      },
      {
        pillar: "Concrete Cases",
        description:
          "Share anonymized engagement stories of real change. Because innovation results feel intangible, concrete cases make your work credible to skeptical leaders.",
        post_frequency: "1x per week",
        example_topic:
          "\"40 workshops, nothing shipped. One rule change, and six ideas launched in five months.\"",
      },
      {
        pillar: "What's Really Changing",
        description:
          "Cut through hype to the real shifts reshaping industries. This positions you as a credible futurist, not a buzzword-dropper.",
        post_frequency: "1x per week",
        example_topic:
          "\"The technology everyone's hyping won't matter. Here's the quiet shift that will.\"",
      },
      {
        pillar: "Innovation POV",
        description:
          "Take clear positions on how organizations should actually innovate. A grounded point of view attracts forward-thinking clients.",
        post_frequency: "1x per week",
        example_topic:
          "\"Innovation isn't a team. It's a decision-making system. Here's the difference.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Innovation POV", topic_idea: "A grounded position on how to innovate", format: "Caption" },
      { day: "Tuesday", content_type: "Puncture the Theater", topic_idea: "Call out fake innovation", format: "Carousel" },
      { day: "Wednesday", content_type: "Real Method", topic_idea: "A practical, shippable method", format: "Carousel" },
      { day: "Thursday", content_type: "What's Really Changing", topic_idea: "A grounded read on real shifts", format: "Caption" },
      { day: "Friday", content_type: "Concrete Case", topic_idea: "An anonymized story of real change", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on leaders' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week's substantive content", format: "Planning" },
    ],
    growth_tactics: [
      "Puncture innovation theater to read as refreshing substance to cynical leaders.",
      "Share concrete cases so your intangible-sounding work becomes credible and specific.",
      "Comment on posts from leaders at organizations facing disruption.",
      "Stay visible so you're the trusted advisor at the unpredictable crossroads moment.",
      "Pin a real-method carousel so a skeptical visitor sees you deliver, not just inspire.",
    ],
    common_strategy_mistakes: [
      "Posting vague 'innovation is the future' content leaders roll their eyes at. Fix: puncture the theater and show methods.",
      "Keeping real cases private, so your work sounds like buzzwords. Fix: publish concrete change stories.",
      "Chasing hype instead of real shifts. Fix: offer grounded foresight.",
      "A dated feed that undercuts your premise. Fix: keep it modern and considered.",
    ],
  },
  "diversity-inclusion-consultants": {
    ideal_audience:
      "Leaders at organizations genuinely committed to change — not box-ticking — who respond to measurable outcomes and honest nuance. You're building a reputation for substantive, results-driven work that reaches pragmatic decision-makers, so you're the credible expert they engage when they commit to real inclusion work.",
    strategy_pillars: [
      {
        pillar: "Business Imperative",
        description:
          "Frame inclusion in terms leaders care about — retention, performance, risk. This disarms skepticism and reaches the pragmatic leaders who fund real work.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"Your best people are leaving, and your exit interviews are hiding why.\"",
      },
      {
        pillar: "Evidence of Change",
        description:
          "Share anonymized wins with measurable results. Because D&I is dismissed as fluffy, concrete evidence makes your work credible to skeptical decision-makers.",
        post_frequency: "1x per week",
        example_topic:
          "\"Their retention gap closed at 18 months — exactly where the promotion criteria were 'we just know.'\"",
      },
      {
        pillar: "Practical Steps",
        description:
          "Teach a concrete practice — inclusive meetings, de-biased hiring, equitable feedback. Practical substance separates you from the awareness-only crowd.",
        post_frequency: "1x per week",
        example_topic:
          "\"How to de-bias a promotion round — the criteria change that actually works.\"",
      },
      {
        pillar: "Honest Nuance",
        description:
          "Navigate the difficult conversations thoughtfully, avoiding both defensiveness and preachiness. This positions you as a mature, credible guide in a polarized space.",
        post_frequency: "1x per week",
        example_topic:
          "\"Most DEI training backfires. Here's the honest reason, and what works instead.\"",
      },
      {
        pillar: "Culture & Belonging",
        description:
          "Teach what real belonging looks like beyond policy. This shows the depth behind measurable outcomes and attracts serious organizations.",
        post_frequency: "1x per week",
        example_topic:
          "\"Belonging isn't a survey score. Here's what actually makes people stay.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Business Imperative", topic_idea: "Frame inclusion as a business outcome", format: "Caption" },
      { day: "Tuesday", content_type: "Evidence of Change", topic_idea: "An anonymized measurable win", format: "Carousel" },
      { day: "Wednesday", content_type: "Practical Steps", topic_idea: "A concrete, implementable practice", format: "Carousel" },
      { day: "Thursday", content_type: "Honest Nuance", topic_idea: "A thoughtful take on a hard topic", format: "Caption" },
      { day: "Friday", content_type: "Culture & Belonging", topic_idea: "What real belonging looks like", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on leaders' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week's evidence-based content", format: "Planning" },
    ],
    growth_tactics: [
      "Frame inclusion as a business imperative to reach pragmatic leaders beyond the already-convinced.",
      "Share evidence-based wins so your work reads as measurable impact, not good intentions.",
      "Bring honest nuance to charged topics, positioning you as a mature guide.",
      "Stay consistently credible so you're the expert engaged when an organization commits.",
      "Pin an evidence carousel so a discerning leader sees substance immediately.",
    ],
    common_strategy_mistakes: [
      "Posting slogans that feed the 'D&I is fluffy' dismissal. Fix: lead with measurable outcomes.",
      "Framing it only morally, missing pragmatic leaders. Fix: make the business case.",
      "Preaching instead of teaching, which alienates. Fix: offer practical steps and honest nuance.",
      "A scrappy presence that undercuts credibility. Fix: keep it professional and evidence-led.",
    ],
  },
  "performance-coaches": {
    ideal_audience:
      "Ambitious, evidence-driven high performers — executives, founders, athletes, professionals — chasing an edge and wary of burnout. They've outgrown motivation and want real methodology, so you're building a reputation for systematic substance that makes driven achievers turn to you when they decide to level up.",
    strategy_pillars: [
      {
        pillar: "The Real Edge",
        description:
          "Expose a hidden limiter or promise a specific edge. High performers stop scrolling for a genuine competitive advantage or a sharp insight about why they're plateaued.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The reason talented people plateau isn't effort. It's recovery.\"",
      },
      {
        pillar: "Performance Systems",
        description:
          "Teach a real system — sustainable focus, energy management, recovery for peak output. Systematic substance beats motivation for this discerning audience.",
        post_frequency: "1x per week",
        example_topic:
          "\"Energy management for a brutal week — the system I give every executive client.\"",
      },
      {
        pillar: "Sustainable Peak",
        description:
          "Reject grind-till-you-break culture. This resonates with achievers who've hit the wall and know pushing harder isn't working.",
        post_frequency: "1x per week",
        example_topic:
          "\"You don't perform despite rest. Recovery is where the performance is built.\"",
      },
      {
        pillar: "Evidence-Driven Wins",
        description:
          "Share a client breakthrough with the systematic method behind it. Evidence-driven proof persuades an outcome-focused audience.",
        post_frequency: "1x per week",
        example_topic:
          "\"He'd been at the same number for three years. We cut his hours 20% — best quarter ever.\"",
      },
      {
        pillar: "Mindset of Elites",
        description:
          "Teach the mental game — focus under pressure, resilience, identity. This connects with the psychology behind sustained high performance.",
        post_frequency: "1x per week",
        example_topic:
          "\"Elite performers don't rely on motivation. Here's the system they use instead.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "The Real Edge", topic_idea: "Expose a hidden limiter or edge", format: "Caption" },
      { day: "Tuesday", content_type: "Performance System", topic_idea: "A real, usable system", format: "Carousel" },
      { day: "Wednesday", content_type: "Mindset of Elites", topic_idea: "The mental game of high performance", format: "Carousel" },
      { day: "Thursday", content_type: "Sustainable Peak", topic_idea: "Peak performance without burnout", format: "Caption" },
      { day: "Friday", content_type: "Evidence-Driven Win", topic_idea: "A client breakthrough with the method", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on high performers' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week — model sustainable performance", format: "Planning" },
    ],
    growth_tactics: [
      "Lead with a real edge, not motivation; high performers dismiss anything that sounds like a pep talk.",
      "Share evidence-driven breakthroughs that persuade an outcome-focused audience.",
      "Comment on posts from ambitious achievers in your arena.",
      "Model sustainable performance by staying consistent without burning out — proof of your method.",
      "Pin a system carousel so a driven visitor gets a real, usable gain.",
    ],
    common_strategy_mistakes: [
      "Posting generic motivation this audience has outgrown. Fix: offer a real, systematic edge.",
      "Keeping proof abstract. Fix: share evidence-driven client breakthroughs.",
      "Championing grind, which alienates burnt-out achievers. Fix: teach sustainable peak performance.",
      "Inconsistent posting that contradicts your discipline. Fix: batch and model consistency.",
    ],
  },
  "digital-marketers": {
    ideal_audience:
      "Fellow marketers, potential clients, and hiring managers who value real practitioner expertise over theory. You're building authority in one digital marketing specialty so the jobs, clients, and collaborations tied to that skill come to you.",
    strategy_pillars: [
      {
        pillar: "Real Experiments",
        description:
          "Share the campaigns and tests you actually run, with numbers. Marketers crave real-world data, and it proves you're a practitioner, not a pundit.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The landing page change that lifted conversion 34% — we removed something.\"",
      },
      {
        pillar: "Replicable Tactics",
        description:
          "Teach a tactic others can copy — a high-converting ad, an email flow, a funnel audit. When it works for them, they follow and share, spreading your reach.",
        post_frequency: "1x per week",
        example_topic:
          "\"Anatomy of an ad that converts — the structure, the hook, the proof.\"",
      },
      {
        pillar: "Landscape Takes",
        description:
          "Share a sharp view on algorithm updates, new channels, AI tools, privacy shifts. This keeps you current and ahead of the curve.",
        post_frequency: "1x per week",
        example_topic:
          "\"What the latest algorithm change actually means for your paid strategy.\"",
      },
      {
        pillar: "Results Breakdowns",
        description:
          "Break down a real result with the reasoning. Number-backed content earns respect in a field full of armchair experts.",
        post_frequency: "1x per week",
        example_topic:
          "\"We cut ad spend 30% and leads went up. Here's the reallocation that did it.\"",
      },
      {
        pillar: "Marketing POV",
        description:
          "Take clear positions on how marketing should be done. A distinct voice builds the authority that opens opportunities.",
        post_frequency: "1x per week",
        example_topic:
          "\"Chasing every new channel is why your results are mediocre everywhere.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Marketing POV", topic_idea: "A clear position on marketing", format: "Caption" },
      { day: "Tuesday", content_type: "Real Experiment", topic_idea: "A campaign or test with numbers", format: "Carousel" },
      { day: "Wednesday", content_type: "Replicable Tactic", topic_idea: "A tactic others can copy", format: "Carousel" },
      { day: "Thursday", content_type: "Landscape Take", topic_idea: "A view on a current shift", format: "Caption" },
      { day: "Friday", content_type: "Results Breakdown", topic_idea: "A real result with the reasoning", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment in the marketing community — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week from your experiments", format: "Planning" },
    ],
    growth_tactics: [
      "Turn real campaigns and tests into tactical posts that earn peer respect.",
      "Give replicable tactics that spread across the marketing community when they work.",
      "Take sharp positions on landscape shifts to stay ahead of the curve.",
      "Comment in the marketing community daily, where jobs and clients notice you.",
      "Pin a tactical carousel so your feed demonstrates the marketing sense you're known for.",
    ],
    common_strategy_mistakes: [
      "Posting generic marketing tips indistinguishable from the crowd. Fix: share real experiments with data.",
      "Keeping results in dashboards. Fix: publish them as practitioner content.",
      "Repeating last year's playbook. Fix: take current positions on what's changing.",
      "Inconsistent posting, so authority never compounds. Fix: batch through busy campaign periods.",
    ],
  },
  "content-marketers": {
    ideal_audience:
      "Fellow content professionals, hiring managers, and potential clients who judge you by the quality of your own content. Your feed is your portfolio, so you're building authority in a content specialty by visibly practicing the craft you sell.",
    strategy_pillars: [
      {
        pillar: "Practice the Craft",
        description:
          "Your own content is the ultimate proof — treat your feed as a living portfolio of strategy, storytelling, and quality. There's no faking it here.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"We published 60 posts last year. Four drove 90% of the pipeline. Here's why.\"",
      },
      {
        pillar: "Teach Frameworks",
        description:
          "Break down a content framework — a content engine, repurposing, writing for search and humans. A great teaching carousel is both the message and the proof.",
        post_frequency: "1x per week",
        example_topic:
          "\"One piece, ten posts — the repurposing system that ends the content treadmill.\"",
      },
      {
        pillar: "Attention Craft",
        description:
          "Show mastery of hooks and openings. Because your subject is content itself, every hook is a lesson and a demonstration.",
        post_frequency: "1x per week",
        example_topic:
          "\"The first line is 80% of the job. Here's how to write one that stops the scroll.\"",
      },
      {
        pillar: "Evolving Landscape",
        description:
          "Share a forward-looking take on AI content, SEO shifts, new formats. This keeps you relevant and positions you as current.",
        post_frequency: "1x per week",
        example_topic:
          "\"AI didn't kill content marketing. It killed mediocre content marketing.\"",
      },
      {
        pillar: "Content Strategy",
        description:
          "Show how content ties to business outcomes, not vanity metrics. This proves you're a strategist, not just a producer.",
        post_frequency: "1x per week",
        example_topic:
          "\"You don't have a content problem. You have a distribution problem.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Content Strategy", topic_idea: "Tie content to business outcomes", format: "Caption" },
      { day: "Tuesday", content_type: "Teach Frameworks", topic_idea: "A content framework, taught", format: "Carousel" },
      { day: "Wednesday", content_type: "Attention Craft", topic_idea: "A lesson on hooks and openings", format: "Carousel" },
      { day: "Thursday", content_type: "Evolving Landscape", topic_idea: "A forward-looking content take", format: "Caption" },
      { day: "Friday", content_type: "Practice the Craft", topic_idea: "A content lesson that shows your quality", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment in the content community — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week — model your own advice", format: "Planning" },
    ],
    growth_tactics: [
      "Make your feed a living portfolio — for a content marketer, mediocre posts undermine every claim.",
      "Teach a framework that demonstrates your quality in the act of sharing it.",
      "Nail every hook; your subject is content, so each one is an audition.",
      "Model the consistency you preach — sporadic posting contradicts your expertise.",
      "Pin a framework carousel that showcases your craft at its best.",
    ],
    common_strategy_mistakes: [
      "Letting your own feed go quiet or mediocre, undermining your credibility. Fix: treat it as a portfolio.",
      "Being seen as a producer, not a strategist. Fix: tie content to outcomes.",
      "Sounding dated on AI and SEO. Fix: share forward-looking takes.",
      "Weak hooks that contradict your expertise. Fix: make every opening a demonstration.",
    ],
  },
  "social-media-managers": {
    ideal_audience:
      "Fellow social professionals, hiring managers, and potential clients who check your socials before they check your resume. You're building a personal brand as strong as the ones you manage, by turning your front-line platform knowledge into visible authority.",
    strategy_pillars: [
      {
        pillar: "Insider Platform Knowledge",
        description:
          "Share what actually works across platforms from managing real accounts — post types, algorithm quirks, community tactics. Front-line know-how is credible where theory isn't.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"What's working on LinkedIn right now, from managing 12 accounts.\"",
      },
      {
        pillar: "Real Systems",
        description:
          "Teach a system — a content calendar that doesn't burn you out, cross-platform repurposing, real engagement. A great carousel about social, made by a social manager, is lesson and proof.",
        post_frequency: "1x per week",
        example_topic:
          "\"The content calendar that keeps me consistent without burning out.\"",
      },
      {
        pillar: "Platform Shifts",
        description:
          "Share a current take on features and updates. Being ahead of the curve on a fast-moving platform builds your reputation.",
        post_frequency: "1x per week",
        example_topic:
          "\"The new feature everyone's about to over-use — and how to use it well.\"",
      },
      {
        pillar: "Proof of Results",
        description:
          "Show real growth you engineered (with permission). This proves you deliver, not just post.",
        post_frequency: "1x per week",
        example_topic:
          "\"How I grew a brand account from 2k to 40k in six months.\"",
      },
      {
        pillar: "Social POV",
        description:
          "Take clear positions on social strategy. A distinct voice separates you from everyone posting generic tips.",
        post_frequency: "1x per week",
        example_topic:
          "\"Posting more isn't a strategy. Here's what actually moves the needle.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Social POV", topic_idea: "A clear position on social strategy", format: "Caption" },
      { day: "Tuesday", content_type: "Insider Platform Knowledge", topic_idea: "What's working now, from real accounts", format: "Carousel" },
      { day: "Wednesday", content_type: "Real System", topic_idea: "A usable social system", format: "Carousel" },
      { day: "Thursday", content_type: "Platform Shift", topic_idea: "A take on a new feature or update", format: "Caption" },
      { day: "Friday", content_type: "Proof of Results", topic_idea: "Real growth you engineered", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment in the social community — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch your own week without adding to burnout", format: "Planning" },
    ],
    growth_tactics: [
      "Batch your own posts so your personal brand grows without adding to your daily content load.",
      "Share insider platform knowledge that outdated advice can't match.",
      "Take current positions on platform shifts to prove you're ahead of the curve.",
      "Make your own feed a showcase — recruiters and clients check it first.",
      "Pin a results carousel proving you can grow an account, not just run one.",
    ],
    common_strategy_mistakes: [
      "Neglecting your own account after managing brands all day. Fix: batch your personal content.",
      "Posting outdated advice. Fix: share current, front-line platform knowledge.",
      "Keeping your results invisible. Fix: publish real growth you engineered.",
      "A scrappy personal feed that undercuts you. Fix: make it a showcase of your skill.",
    ],
  },
  "performance-marketers": {
    ideal_audience:
      "Fellow performance marketers, hiring managers, and clients who respect data and results over theory. You're building authority around the metrics you move so the senior roles and premium clients that value real performance expertise come to you.",
    strategy_pillars: [
      {
        pillar: "Campaign Proof",
        description:
          "Share real results — the account you turned around, the test that dropped CAC — with numbers and the lever behind them. In a results-obsessed field, this is the only credibility that matters.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"We cut CAC 40% by killing our best-performing campaign. Here's why.\"",
      },
      {
        pillar: "Replicable Optimizations",
        description:
          "Teach an optimization others can apply — a testing framework, honest attribution, scaling without tanking efficiency. When it works, they share it, spreading your reputation.",
        post_frequency: "1x per week",
        example_topic:
          "\"How to read attribution honestly — what the platform claims vs the holdout truth.\"",
      },
      {
        pillar: "Landscape Strategy",
        description:
          "Share a strategic take on privacy changes, platform shifts, rising CACs. This elevates you from button-pusher to strategist.",
        post_frequency: "1x per week",
        example_topic:
          "\"Rising CACs aren't a bidding problem. They're a creative problem.\"",
      },
      {
        pillar: "Counterintuitive Truths",
        description:
          "Lead with a data-backed truth that overturns a common belief. Counterintuitive insight signals you're genuinely in the arena.",
        post_frequency: "1x per week",
        example_topic:
          "\"Our ROAS looked incredible. A geo holdout found 60% would've bought anyway.\"",
      },
      {
        pillar: "Performance POV",
        description:
          "Take clear positions on measurement and media. A distinct, rigorous voice builds authority with senior buyers.",
        post_frequency: "1x per week",
        example_topic:
          "\"Last-click attribution is quietly wasting half your budget.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Performance POV", topic_idea: "A rigorous position on measurement", format: "Caption" },
      { day: "Tuesday", content_type: "Campaign Proof", topic_idea: "A real result with the lever", format: "Carousel" },
      { day: "Wednesday", content_type: "Replicable Optimization", topic_idea: "An optimization others can apply", format: "Carousel" },
      { day: "Thursday", content_type: "Landscape Strategy", topic_idea: "A strategic take on a shift", format: "Caption" },
      { day: "Friday", content_type: "Counterintuitive Truth", topic_idea: "A data-backed surprise", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment in the performance community — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week from your campaign data", format: "Planning" },
    ],
    growth_tactics: [
      "Publish campaign results with real numbers — proof is the only credibility this field respects.",
      "Share replicable optimizations that spread across a tight, peer-driven community.",
      "Take strategic positions on landscape shifts to elevate above button-pushing.",
      "Comment in the performance community where senior roles and clients notice you.",
      "Pin a proof carousel so your data-driven authority is immediate.",
    ],
    common_strategy_mistakes: [
      "Leaving proof locked in ad accounts. Fix: publish real, number-led results.",
      "Vague claims to a data-driven audience. Fix: lead with specific, counterintuitive numbers.",
      "Staying purely tactical. Fix: take strategic positions to read as a strategist.",
      "Inconsistent posting during campaign crunches. Fix: batch to keep authority compounding.",
    ],
  },
  "seo-specialists": {
    ideal_audience:
      "Fellow SEOs, marketers, and business owners confused by contradictory search advice who want credible, tested guidance. You're building authority in an SEO specialty by applying the compounding you understand to your own content — turning real ranking wins into a reputation.",
    strategy_pillars: [
      {
        pillar: "Case Studies",
        description:
          "Share real ranking wins and traffic growth with data. SEO is full of theory and myth, so actual case studies make you enormously credible.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"We removed 400 pages and organic traffic went up 60%. Here's why.\"",
      },
      {
        pillar: "Myth-Busting",
        description:
          "Debunk a myth or reveal a tested truth. A data-backed correction brings clarity to a field drowning in guesswork.",
        post_frequency: "1x per week",
        example_topic:
          "\"The ranking factor everyone obsesses over that barely moves the needle.\"",
      },
      {
        pillar: "Process Teaching",
        description:
          "Teach a real process — a technical audit, topical authority, keyword research that converts. When it works, you earn an advocate.",
        post_frequency: "1x per week",
        example_topic:
          "\"The technical audit that finds real problems — where to start and the red herrings.\"",
      },
      {
        pillar: "Algorithm Analysis",
        description:
          "Be the calm, informed voice when a core update hits. This makes you the expert people turn to when the ground moves.",
        post_frequency: "1x per week",
        example_topic:
          "\"What this core update actually rewarded — and what to do about it.\"",
      },
      {
        pillar: "SEO POV",
        description:
          "Take clear positions on search strategy. A distinct voice builds authority in a noisy field.",
        post_frequency: "1x per week",
        example_topic:
          "\"Chasing keywords is why your content doesn't rank. Build topical authority instead.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "SEO POV", topic_idea: "A clear position on search strategy", format: "Caption" },
      { day: "Tuesday", content_type: "Case Study", topic_idea: "A real ranking win with data", format: "Carousel" },
      { day: "Wednesday", content_type: "Process Teaching", topic_idea: "A real SEO process, taught", format: "Carousel" },
      { day: "Thursday", content_type: "Myth-Busting", topic_idea: "Debunk a common SEO myth", format: "Caption" },
      { day: "Friday", content_type: "Algorithm Analysis", topic_idea: "A calm read on a recent update", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment in the SEO community — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week — apply compounding to yourself", format: "Planning" },
    ],
    growth_tactics: [
      "Apply the compounding you understand to your own content by posting consistently.",
      "Turn real ranking wins into case studies that prove you know how search works.",
      "Be the calm, informed voice when updates hit, so people turn to you.",
      "Comment in the SEO community where clients and peers notice credibility.",
      "Pin a case-study carousel so a visitor sees proof, not theory.",
    ],
    common_strategy_mistakes: [
      "Neglecting your own content despite understanding compounding. Fix: post consistently.",
      "Keeping ranking wins in reports. Fix: publish them as case studies.",
      "Adding to the myth pile. Fix: bring tested clarity.",
      "Panicking on updates like everyone else. Fix: be the steady, analytical voice.",
    ],
  },
  "email-marketers": {
    ideal_audience:
      "Fellow marketers, agencies, and businesses who need email that drives revenue and value a proven specialist. You're building authority in an email discipline by making highly measurable, invisible work visible — turning revenue wins into a reputation.",
    strategy_pillars: [
      {
        pillar: "Revenue Proof",
        description:
          "Share real email wins with numbers — the flow that drove revenue, the test that doubled opens. Email is beautifully measurable, so proof is intensely credible.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The welcome sequence that pays for itself in the first 3 emails.\"",
      },
      {
        pillar: "Subject-Line Craft",
        description:
          "Demonstrate the attention skill you sell. If you can't stop the scroll, why would a client trust you to get emails opened? Every hook is an audition.",
        post_frequency: "1x per week",
        example_topic:
          "\"The subject line that lifted open rate from 18% to 34% was four words.\"",
      },
      {
        pillar: "Framework Teaching",
        description:
          "Teach a framework — a welcome sequence, converting copy, segmentation, deliverability. When it works, they become an advocate.",
        post_frequency: "1x per week",
        example_topic:
          "\"How to segment a list for relevance — the setup that lifts every metric.\"",
      },
      {
        pillar: "Champion the Channel",
        description:
          "Make email's case against the shiny-object crowd. This resonates with businesses tired of renting audiences on platforms they don't own.",
        post_frequency: "1x per week",
        example_topic:
          "\"Everyone chases the newest channel. Email quietly outperformed them all again.\"",
      },
      {
        pillar: "Email POV",
        description:
          "Take clear positions on lifecycle, deliverability, and copy. A distinct voice builds authority in a specialized field.",
        post_frequency: "1x per week",
        example_topic:
          "\"Your open rates dropped because you're emailing people who forgot they signed up.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Email POV", topic_idea: "A clear position on email strategy", format: "Caption" },
      { day: "Tuesday", content_type: "Revenue Proof", topic_idea: "A real email win with numbers", format: "Carousel" },
      { day: "Wednesday", content_type: "Framework Teaching", topic_idea: "An email framework, taught", format: "Carousel" },
      { day: "Thursday", content_type: "Champion the Channel", topic_idea: "Email's case vs shiny objects", format: "Caption" },
      { day: "Friday", content_type: "Subject-Line Craft", topic_idea: "A lesson demonstrating your copy skill", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment in the marketing community — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week from your email wins", format: "Planning" },
    ],
    growth_tactics: [
      "Turn invisible email revenue into visible proof posts.",
      "Nail every hook to demonstrate the subject-line skill you sell.",
      "Champion email's ROI against the shiny-object crowd.",
      "Comment in the marketing community where clients and roles notice you.",
      "Pin a framework carousel so a visitor experiences your expertise.",
    ],
    common_strategy_mistakes: [
      "Leaving your measurable wins invisible inside the ESP. Fix: publish them.",
      "Weak hooks that contradict the skill you sell. Fix: make every one an audition.",
      "Generic advice that builds no authority. Fix: teach real frameworks with proof.",
      "Inconsistent posting. Fix: batch through busy campaign periods.",
    ],
  },
  "growth-hackers": {
    ideal_audience:
      "Founders, marketers, and startups hungry for creative, unconventional plays that actually work. You're building a reputation as a hands-on experimenter by publishing your real tests, so the roles and consulting tied to growth come to you.",
    strategy_pillars: [
      {
        pillar: "Experiment Teardowns",
        description:
          "Share real experiments — the loop that worked, the test that failed and why. Growth people crave applicable tactics, and real tests prove you're an experimenter, not a theorist.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"We 3x'd signups by making onboarding longer. Every instinct said shorten it.\"",
      },
      {
        pillar: "Unconventional Plays",
        description:
          "Promise a clever, counterintuitive tactic. This audience craves creative plays that break conventional wisdom.",
        post_frequency: "1x per week",
        example_topic:
          "\"Our best acquisition channel was a support doc that happened to rank.\"",
      },
      {
        pillar: "Replicable Playbooks",
        description:
          "Teach a play others can run — an experiment design, a referral loop, finding activation. Replicable value spreads your reach in a tactic-sharing community.",
        post_frequency: "1x per week",
        example_topic:
          "\"How to find your activation moment — the cohort analysis that reveals it.\"",
      },
      {
        pillar: "Mental Models",
        description:
          "Share how you think about growth — prioritizing experiments, finding leverage, avoiding vanity metrics. Frameworks signal strategic depth beyond tactics.",
        post_frequency: "1x per week",
        example_topic:
          "\"The ICE score is overrated. Here's how I actually prioritize experiments.\"",
      },
      {
        pillar: "Growth POV",
        description:
          "Take clear positions on growth strategy. A distinct voice builds authority and attracts the best roles and consulting.",
        post_frequency: "1x per week",
        example_topic:
          "\"Most 'growth hacks' are one-time tricks. Real growth is a system.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Growth POV", topic_idea: "A clear position on growth", format: "Caption" },
      { day: "Tuesday", content_type: "Experiment Teardown", topic_idea: "A real test with the result", format: "Carousel" },
      { day: "Wednesday", content_type: "Replicable Playbook", topic_idea: "A play others can run", format: "Carousel" },
      { day: "Thursday", content_type: "Mental Models", topic_idea: "How you think about growth", format: "Caption" },
      { day: "Friday", content_type: "Unconventional Play", topic_idea: "A counterintuitive tactic", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment in the growth community — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Treat your own content as a channel to optimize", format: "Planning" },
    ],
    growth_tactics: [
      "Publish real experiments — the field craves applicable tactics, not recycled case studies.",
      "Lead with unconventional, counterintuitive results that grab a tactic-hungry audience.",
      "Share replicable playbooks that spread when founders run them.",
      "Treat your own content as a growth channel to test and optimize — proof of your skill.",
      "Pin a mental-models post that signals strategic depth beyond a bag of tricks.",
    ],
    common_strategy_mistakes: [
      "Recycling decade-old case studies. Fix: publish your own real experiments.",
      "Playing it safe when the audience wants unconventional plays. Fix: lead with the counterintuitive.",
      "Sharing only tactics, no frameworks. Fix: publish your mental models for depth.",
      "Not applying growth thinking to your own audience. Fix: treat your feed as a channel to optimize.",
    ],
  },
  "brand-strategists": {
    ideal_audience:
      "Founders and marketing leaders who resonate with a distinct philosophy of brand strategy and want a thinker, not a decorator. You're building intellectual authority around a worldview so that clients who share your conviction seek you out.",
    strategy_pillars: [
      {
        pillar: "Strategic Philosophy",
        description:
          "Make your distinct point of view on how brands should be built unmistakable. Clients choose strategists whose thinking they resonate with, so a strong philosophy attracts aligned clients.",
        post_frequency: "1x per week",
        example_topic:
          "\"A brand is the gap between what you promise and what you deliver. Everyone can feel its size.\"",
      },
      {
        pillar: "Reframe Brand Thinking",
        description:
          "Offer a sharper lens that challenges assumptions. A reframe signals strategic depth and makes sophisticated readers rethink what they thought they understood.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"They kept testing taglines. The problem was they couldn't agree who they were for.\"",
      },
      {
        pillar: "Teach a Framework",
        description:
          "Break down a strategic framework — defining positioning, brand architecture, finding a differentiator. Teaching demonstrates intellectual substance.",
        post_frequency: "1x per week",
        example_topic:
          "\"Finding the real differentiator — the questions that surface it.\"",
      },
      {
        pillar: "Analyze Famous Brands",
        description:
          "Dissect the strategy behind well-known successes and failures. Familiar examples make your abstract expertise tangible and spark discussion.",
        post_frequency: "1x per week",
        example_topic:
          "\"Why this brand's repositioning worked — the strategic bet underneath it.\"",
      },
      {
        pillar: "Insight-Driven Proof",
        description:
          "Share strategic insights and engagement lessons. Visible thinking is the most direct proof of your depth.",
        post_frequency: "1x per week",
        example_topic:
          "\"The positioning breakthrough that reframed a client's entire go-to-market.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Strategic Philosophy", topic_idea: "Reinforce your worldview on brand strategy", format: "Caption" },
      { day: "Tuesday", content_type: "Reframe Brand Thinking", topic_idea: "A sharper lens on a common assumption", format: "Carousel" },
      { day: "Wednesday", content_type: "Teach a Framework", topic_idea: "A strategic framework, taught", format: "Carousel" },
      { day: "Thursday", content_type: "Analyze Famous Brands", topic_idea: "Dissect a recognizable brand's strategy", format: "Caption" },
      { day: "Friday", content_type: "Insight-Driven Proof", topic_idea: "A strategic insight from real work", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on founders' and marketers' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week's intellectual content", format: "Planning" },
    ],
    growth_tactics: [
      "Publish the strategic insights you'd otherwise keep in decks — your thinking is the product.",
      "Reframe how people think about brand to signal the depth that sets you apart.",
      "Analyze famous brands to make abstract expertise tangible and shareable.",
      "Reinforce your philosophy so clients who share your worldview self-select in.",
      "Keep your own feed coherent — you advise on brand, so consistency is proof.",
    ],
    common_strategy_mistakes: [
      "Generic branding tips that build no intellectual authority. Fix: publish a distinct philosophy.",
      "Keeping insight in decks. Fix: make your thinking visible.",
      "Obvious takes for a sophisticated audience. Fix: lead with reframes.",
      "An inconsistent feed while preaching brand consistency. Fix: keep it coherent.",
    ],
  },
  "content-strategists": {
    ideal_audience:
      "Marketers, founders, and hiring managers who need someone who thinks in systems, not just posts. You're building recognition as a strategist above the producer crowd, so the senior roles and consulting that value high-level thinking come to you.",
    strategy_pillars: [
      {
        pillar: "Show the Thinking",
        description:
          "Share the strategic decisions behind content — audience insight, distribution, measurement. Showing how you strategize separates you from a producer.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"You don't have a content problem. You have a distribution problem.\"",
      },
      {
        pillar: "Reframe the Approach",
        description:
          "Diagnose the real, higher-level content issue. A reframe marks you as the strategist who sees what others miss.",
        post_frequency: "1x per week",
        example_topic:
          "\"They published 200 pieces. Nobody could name one. Volume was never the strategy.\"",
      },
      {
        pillar: "Teach a System",
        description:
          "Break down a content system — an engine, mapping to the buyer journey, measuring what matters. When it works, you earn an advocate.",
        post_frequency: "1x per week",
        example_topic:
          "\"The content engine — inputs, rhythm, distribution, measurement, compounding.\"",
      },
      {
        pillar: "Evolving Ecosystem",
        description:
          "Share a forward-looking take on AI and the shifting content landscape. This positions you as a strategist thinking about the future.",
        post_frequency: "1x per week",
        example_topic:
          "\"AI made content cheap. That's exactly why strategy just got more valuable.\"",
      },
      {
        pillar: "Strategy POV",
        description:
          "Take clear positions on content strategy. A distinct voice builds authority above the tactics crowd.",
        post_frequency: "1x per week",
        example_topic:
          "\"Hiring another writer won't fix your content. Fixing your strategy will.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Strategy POV", topic_idea: "A clear position on content strategy", format: "Caption" },
      { day: "Tuesday", content_type: "Show the Thinking", topic_idea: "A strategic decision, explained", format: "Carousel" },
      { day: "Wednesday", content_type: "Teach a System", topic_idea: "A content system, broken down", format: "Carousel" },
      { day: "Thursday", content_type: "Reframe the Approach", topic_idea: "Diagnose the real content issue", format: "Caption" },
      { day: "Friday", content_type: "Evolving Ecosystem", topic_idea: "A forward-looking content take", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment in the content community — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week — model your own consistency", format: "Planning" },
    ],
    growth_tactics: [
      "Show your strategic thinking, not just output, to be seen as a strategist.",
      "Reframe content problems to diagnose the real, higher-level issue.",
      "Teach a system marketers can adopt to grow your authority.",
      "Model the consistency you'd advise any client to keep.",
      "Pin a system carousel so a visitor sees you operate above production.",
    ],
    common_strategy_mistakes: [
      "Being mistaken for a producer. Fix: show your strategic thinking.",
      "Blending into generic content advice. Fix: reframe the higher-level problem.",
      "Sounding dated on AI. Fix: take forward-looking positions.",
      "Sporadic posting that undercuts your expertise. Fix: model consistency.",
    ],
  },
  "copywriters": {
    ideal_audience:
      "The premium clients in your niche who value persuasion and results over the cheapest rate. Your feed is your audition, so you're building authority in a copywriting specialty by making every post a demonstration of the exact skill you sell.",
    strategy_pillars: [
      {
        pillar: "Prove You Can Write",
        description:
          "Every post is the ultimate audition. Treat your feed as a living portfolio of persuasive, engaging writing — there's no faking it.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"'Unlock your potential' has never sold anything. Here's what to write instead.\"",
      },
      {
        pillar: "Teach a Technique",
        description:
          "Break down a technique — a converting headline, handling objections in copy, urgency without sleaze. Teaching proves you're the expert worth hiring.",
        post_frequency: "1x per week",
        example_topic:
          "\"Handling objections inside the copy — where they live and how to defuse them.\"",
      },
      {
        pillar: "Persuasion Psychology",
        description:
          "Share why copy works — the triggers, the reasons people buy. This positions you as a strategic writer who commands premium rates.",
        post_frequency: "1x per week",
        example_topic:
          "\"The word that quietly kills your sales copy — and it's in most headlines.\"",
      },
      {
        pillar: "Specialism Signal",
        description:
          "Reinforce the niche you write for. Specialists command premium rates; generalists compete on price.",
        post_frequency: "1x per week",
        example_topic:
          "\"I only write sales pages for coaches. Here's why niching doubled my rate.\"",
      },
      {
        pillar: "Copy Teardowns",
        description:
          "Analyze real copy — what works, what doesn't. This demonstrates your eye and gives shareable value.",
        post_frequency: "1x per week",
        example_topic:
          "\"This headline gets a 4% CTR. Here's the exact reason it works.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Specialism Signal", topic_idea: "Reinforce your copy niche", format: "Caption" },
      { day: "Tuesday", content_type: "Teach a Technique", topic_idea: "A copywriting technique, taught", format: "Carousel" },
      { day: "Wednesday", content_type: "Persuasion Psychology", topic_idea: "Why a piece of copy works", format: "Carousel" },
      { day: "Thursday", content_type: "Copy Teardown", topic_idea: "Analyze a real piece of copy", format: "Caption" },
      { day: "Friday", content_type: "Prove You Can Write", topic_idea: "A post that demonstrates your skill", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on ideal clients' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week's posts", format: "Planning" },
    ],
    growth_tactics: [
      "Make every post an audition — your feed is proof of the writing you sell.",
      "Teach a technique that demonstrates your skill in the act of explaining it.",
      "Share persuasion psychology to prove you understand why copy works, not just how.",
      "Signal your specialism relentlessly to attract premium budgets.",
      "Pin a teardown that showcases your eye for what converts.",
    ],
    common_strategy_mistakes: [
      "Weak writing on your own feed, undermining the skill you sell. Fix: treat it as a portfolio.",
      "Marketing as a generalist, competing on price. Fix: signal one specialism.",
      "Teaching nothing, so expertise stays invisible. Fix: break down techniques.",
      "Going silent during projects, then scrambling. Fix: batch to keep clients coming.",
    ],
  },
  "linkedin-ghostwriters": {
    ideal_audience:
      "Busy founders and executives who want a personal brand but have no time to build it — and who judge you entirely by your own feed. You're building proof that you can grow anyone's presence by making your own the case study.",
    strategy_pillars: [
      {
        pillar: "Your Feed Is the Proof",
        description:
          "Treat your presence as the ultimate case study, demonstrating the exact strategies you'd deploy for clients. A ghostwriter with a flat feed has no credibility.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The hook structure I use to get my clients' posts 5x the reach.\"",
      },
      {
        pillar: "Client Results",
        description:
          "Share client growth (with permission and discretion). Because ghostwriting is invisible, showing outcomes is how you make your impact visible.",
        post_frequency: "1x per week",
        example_topic:
          "\"My client's post hit 400k impressions. The draft was better written — here's why the published one won.\"",
      },
      {
        pillar: "Teach Your Process",
        description:
          "Show how you find a voice, turn an idea into a post, structure for reach. Sharing your method attracts clients who'd rather hire the skill.",
        post_frequency: "1x per week",
        example_topic:
          "\"How I find a client's voice in 30 minutes — the questions and the tells.\"",
      },
      {
        pillar: "Thought-Leadership Value",
        description:
          "Speak to why personal branding matters and what makes executive content resonate. This speaks directly to your busy-professional buyers.",
        post_frequency: "1x per week",
        example_topic:
          "\"Why founders who post outperform founders who don't — even with worse products.\"",
      },
      {
        pillar: "Attention Mastery",
        description:
          "Demonstrate scroll-stopping skill in every hook. You literally sell the ability to write high-performing content, so each hook is an audition.",
        post_frequency: "1x per week",
        example_topic:
          "\"The first line is the whole game. Here's how I write one that stops the scroll.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Thought-Leadership Value", topic_idea: "Why personal branding matters", format: "Caption" },
      { day: "Tuesday", content_type: "Teach Your Process", topic_idea: "Part of your ghostwriting method", format: "Carousel" },
      { day: "Wednesday", content_type: "Attention Mastery", topic_idea: "A lesson on hooks that demonstrates skill", format: "Carousel" },
      { day: "Thursday", content_type: "Your Feed Is the Proof", topic_idea: "A post modeling exactly what you'd do for a client", format: "Caption" },
      { day: "Friday", content_type: "Client Result", topic_idea: "A client's growth made visible", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on founders' and execs' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch your own week — model consistency", format: "Planning" },
    ],
    growth_tactics: [
      "Make your feed the case study — it's the proof your whole business depends on.",
      "Turn client growth into results posts that make your invisible impact visible.",
      "Nail every hook; you sell the ability to write high-performing content.",
      "Model relentless consistency even with a full client roster.",
      "Pin a process carousel that teaches while demonstrating your quality.",
    ],
    common_strategy_mistakes: [
      "Letting your own feed go quiet — a fatal contradiction. Fix: model consistency.",
      "Keeping client wins invisible. Fix: publish results with consent.",
      "Weak hooks that undercut your pitch. Fix: make each one an audition.",
      "Hoarding your process. Fix: teach it to attract clients who'd rather hire you.",
    ],
  },
  "social-media-consultants": {
    ideal_audience:
      "Businesses that need a proven social strategy and judge you by your own presence. You're building authority around a social outcome so the right clients arrive pre-sold — because no business hires a consultant whose own socials are weak.",
    strategy_pillars: [
      {
        pillar: "Proof of Results",
        description:
          "Share real client growth with the approach behind it. Because businesses doubt social ROI, showing outcomes and reasoning proves measurable value.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"They posted 5x a day and grew nothing. We cut to 3x a week and tripled reach.\"",
      },
      {
        pillar: "Strategic Insight",
        description:
          "Offer current, higher-level thinking, not basic tips. This positions you as a strategist worth consulting.",
        post_frequency: "1x per week",
        example_topic:
          "\"The social strategy shift most businesses are missing — it's a format, not a platform.\"",
      },
      {
        pillar: "Teach a Strategy",
        description:
          "Break down a real strategy — building a presence, turning followers into customers, a scaling system. Teaching attracts implementation clients.",
        post_frequency: "1x per week",
        example_topic:
          "\"Followers to customers — the missing funnel step most brands skip.\"",
      },
      {
        pillar: "Landscape Shifts",
        description:
          "Share a take on platform changes. Being the current voice reassures anxious businesses.",
        post_frequency: "1x per week",
        example_topic:
          "\"The platform change that just rewrote the playbook — and how to adapt.\"",
      },
      {
        pillar: "Social POV",
        description:
          "Take clear positions on social strategy. A distinct voice separates you from the tips crowd.",
        post_frequency: "1x per week",
        example_topic:
          "\"Vanity metrics are why your social 'works' but never sells.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Social POV", topic_idea: "A clear position on social strategy", format: "Caption" },
      { day: "Tuesday", content_type: "Proof of Results", topic_idea: "A client win with the approach", format: "Carousel" },
      { day: "Wednesday", content_type: "Teach a Strategy", topic_idea: "A real social strategy, taught", format: "Carousel" },
      { day: "Thursday", content_type: "Strategic Insight", topic_idea: "Current, higher-level thinking", format: "Caption" },
      { day: "Friday", content_type: "Landscape Shift", topic_idea: "A take on a platform change", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on business owners' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch your own week — model consistency", format: "Planning" },
    ],
    growth_tactics: [
      "Keep your own presence thriving — it's the proof you can deliver.",
      "Turn client wins into proof posts that answer the ROI skeptic.",
      "Lead with current, strategic insight, not basic tips.",
      "Comment on posts from business owners deciding to get help.",
      "Pin a strategy carousel so a prospect experiences your thinking.",
    ],
    common_strategy_mistakes: [
      "A weak own feed — disqualifying for a social consultant. Fix: make it thrive.",
      "Basic tips instead of strategy. Fix: lead with current, higher-level insight.",
      "Keeping results private. Fix: publish client outcomes.",
      "Inconsistency that undercuts your advice. Fix: model the consistency you sell.",
    ],
  },
  "pr-professionals": {
    ideal_audience:
      "Clients, employers, and journalists who value narrative skill and results, plus peers who track sharp communicators. You're building a compelling personal narrative — proof that you can shape a story — since that's the very craft you sell.",
    strategy_pillars: [
      {
        pillar: "Behind-the-Scenes Wins",
        description:
          "Share how you actually secured coverage or navigated a crisis (with discretion). PR is mysterious to outsiders, so the behind-the-scenes is fascinating and proves you deliver outcomes.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"How we landed the front page — the one thing every other pitch withheld.\"",
      },
      {
        pillar: "Narrative Instinct",
        description:
          "Demonstrate storytelling and framing in every hook — the core of your craft. A well-framed hook shows you know how to make a story land.",
        post_frequency: "1x per week",
        example_topic:
          "\"Your press release gets ignored because you wrote it for your CEO, not the editor.\"",
      },
      {
        pillar: "Teach a PR Strategy",
        description:
          "Break down pitching journalists, handling a crisis, building thought leadership. Demystifying PR positions you as a credible authority.",
        post_frequency: "1x per week",
        example_topic:
          "\"How to pitch a journalist — what they need, what they ignore, the subject line.\"",
      },
      {
        pillar: "Analyze Reputation Moments",
        description:
          "Give an expert read on a brand's PR crisis or win everyone's watching. This showcases your judgment on recognizable events.",
        post_frequency: "1x per week",
        example_topic:
          "\"What this company got right in a crisis — and what I'd have advised.\"",
      },
      {
        pillar: "Communications POV",
        description:
          "Take clear positions on modern PR and reputation. A distinct voice builds your own reputation.",
        post_frequency: "1x per week",
        example_topic:
          "\"The press release is dead. Here's what actually earns coverage now.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Communications POV", topic_idea: "A clear position on modern PR", format: "Caption" },
      { day: "Tuesday", content_type: "Behind-the-Scenes Win", topic_idea: "How a real result was secured", format: "Carousel" },
      { day: "Wednesday", content_type: "Teach a PR Strategy", topic_idea: "A PR strategy, demystified", format: "Carousel" },
      { day: "Thursday", content_type: "Analyze Reputation Moment", topic_idea: "An expert read on a live PR moment", format: "Caption" },
      { day: "Friday", content_type: "Narrative Instinct", topic_idea: "A post demonstrating your framing skill", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on journalists' and clients' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week's content", format: "Planning" },
    ],
    growth_tactics: [
      "Share behind-the-scenes wins that prove the outcomes you deliver.",
      "Demonstrate narrative instinct in every hook — it's your craft on display.",
      "Analyze reputation moments everyone's watching to showcase your judgment.",
      "Cultivate your own reputation consistently — a living case study of your work.",
      "Pin a strategy carousel that demystifies PR and proves your authority.",
    ],
    common_strategy_mistakes: [
      "Having no compelling narrative of your own. Fix: shape your story as skillfully as clients'.",
      "Keeping wins behind the scenes. Fix: share them with discretion.",
      "Generic communications advice. Fix: demonstrate narrative instinct.",
      "Inconsistency for a reputation-builder. Fix: cultivate your presence steadily.",
    ],
  },
  "marketing-agency-owners": {
    ideal_audience:
      "The specific clients your agency serves brilliantly and the talent you want to hire — and, since you sell marketing, everyone judging whether your own marketing proves you can do the job. You're building a reputation that makes dream clients arrive pre-sold and filters out the rest.",
    strategy_pillars: [
      {
        pillar: "Results as Proof",
        description:
          "Turn the outcomes you generate every week into content. Prospects hire agencies on proof, and your case studies are what competitors' service pages can't match.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"We tripled a client's qualified leads in 90 days — by turning off two channels.\"",
      },
      {
        pillar: "Sharp Point of View",
        description:
          "Defend a strong opinion on how the work should be done. A clear POV attracts aligned clients and repels nightmares.",
        post_frequency: "1x per week",
        example_topic:
          "\"Most brands create too much content and distribute too little. Here's our ratio.\"",
      },
      {
        pillar: "Show How You Think",
        description:
          "Teach part of your process — the audit, the framework, the fix. Giving away your thinking wins clients who'd rather hire the expert.",
        post_frequency: "1x per week",
        example_topic:
          "\"The 15-minute audit we run on every new account — and what it reveals.\"",
      },
      {
        pillar: "Call Out the Frustration",
        description:
          "Name your ideal client's specific pain — the agency that ghosted them, results that never came. This pre-qualifies prospects.",
        post_frequency: "1x per week",
        example_topic:
          "\"If your last agency sent reports but no results, here's why.\"",
      },
      {
        pillar: "Own the Marketing",
        description:
          "As a marketing agency, your own marketing is a live demonstration. A neglected feed screams the cobbler's children have no shoes.",
        post_frequency: "1x per week",
        example_topic:
          "\"We practice on ourselves what we sell — here's what our own funnel looks like.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Sharp Point of View", topic_idea: "A strong take on how the work should be done", format: "Caption" },
      { day: "Tuesday", content_type: "Results as Proof", topic_idea: "A client win told as proof", format: "Carousel" },
      { day: "Wednesday", content_type: "Show How You Think", topic_idea: "Part of your process, given away", format: "Carousel" },
      { day: "Thursday", content_type: "Call Out the Frustration", topic_idea: "Name your ideal client's specific pain", format: "Caption" },
      { day: "Friday", content_type: "Own the Marketing", topic_idea: "Your own marketing as a demonstration", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on ideal clients' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week from client wins", format: "Planning" },
    ],
    growth_tactics: [
      "Systematize your own marketing like a client account so delivery never kills it.",
      "Turn every client result into a proof post while the numbers are fresh.",
      "Lead with a sharp POV that attracts dream clients and repels nightmares.",
      "Make your own marketing excellent — it's the argument that you can do the job.",
      "Pin a proof carousel so prospects arrive pre-sold.",
    ],
    common_strategy_mistakes: [
      "Neglecting your own marketing, creating feast-or-famine. Fix: systematize it like an account.",
      "Generic 'services we offer' posts. Fix: lead with a filtering point of view.",
      "Keeping results private. Fix: publish proof.",
      "Hiding your thinking. Fix: teach part of your process.",
    ],
  },
  "community-managers": {
    ideal_audience:
      "Founders and leaders who undervalue community and the peers who'd hire a strategic community pro. You're building recognition as a strategist, not a comment-replier, by turning your community expertise into visible, business-focused authority.",
    strategy_pillars: [
      {
        pillar: "Community as Business Driver",
        description:
          "Reframe community as retention, advocacy, and product insight — not a cost center. This elevates the discipline and reaches leaders realizing it might be their moat.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"Community isn't a nice-to-have. It's the most defensible retention channel you have.\"",
      },
      {
        pillar: "What Really Builds Community",
        description:
          "Reveal the non-obvious reasons communities thrive or die. A sharp diagnosis signals genuine expertise.",
        post_frequency: "1x per week",
        example_topic:
          "\"Your community is quiet because you built it around your product, not their problem.\"",
      },
      {
        pillar: "Teach a System",
        description:
          "Break down a system — onboarding that makes members stick, sparking member-led conversation, measuring health. Teaching attracts strategic roles.",
        post_frequency: "1x per week",
        example_topic:
          "\"The first 48 hours — the onboarding ritual that makes members stay.\"",
      },
      {
        pillar: "Proof of Impact",
        description:
          "Share wins with business value (with permission) — engagement revived, retention lifted. This proves your work drives outcomes, not vibes.",
        post_frequency: "1x per week",
        example_topic:
          "\"Engagement tripled when we stopped posting and let members be useful.\"",
      },
      {
        pillar: "Community POV",
        description:
          "Take clear positions on how community should be built. A distinct voice builds strategic authority.",
        post_frequency: "1x per week",
        example_topic:
          "\"More posts won't fix your dead community. Fewer, better prompts will.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Community POV", topic_idea: "A clear position on building community", format: "Caption" },
      { day: "Tuesday", content_type: "What Really Builds Community", topic_idea: "A non-obvious reason communities thrive or die", format: "Carousel" },
      { day: "Wednesday", content_type: "Teach a System", topic_idea: "A community system, broken down", format: "Carousel" },
      { day: "Thursday", content_type: "Community as Business Driver", topic_idea: "Reframe community as strategic value", format: "Caption" },
      { day: "Friday", content_type: "Proof of Impact", topic_idea: "A win with business value", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on founders' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week's strategic content", format: "Planning" },
    ],
    growth_tactics: [
      "Reframe community as a business driver to reach leaders who fund real work.",
      "Reveal what actually builds community to signal genuine expertise.",
      "Teach systems that founders adopt, growing your strategic authority.",
      "Batch a week so your authority-building continues while you're always-on for members.",
      "Pin a proof carousel that shows real business value, not vibes.",
    ],
    common_strategy_mistakes: [
      "Being seen as 'the person who replies to comments.' Fix: publish strategic thinking.",
      "Generic engagement tips. Fix: reveal what actually builds community.",
      "Keeping wins invisible. Fix: publish proof with business value.",
      "Letting member work bury your own visibility. Fix: batch to stay present.",
    ],
  },
  "b2b-sales-professionals": {
    ideal_audience:
      "The specific B2B buyers you sell to — the decision-makers and champions in your target industries — plus peers who share tactics. You're building a presence that warms prospects before you ever reach out, so your cold email stops being cold.",
    strategy_pillars: [
      {
        pillar: "Speak to the Buyer's Problem",
        description:
          "Write about the exact problems your buyers voice in calls, not your product. This is magnetically relevant to the next prospect facing the same thing.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The hidden cost in your procurement process nobody's tracking.\"",
      },
      {
        pillar: "Buyer Education",
        description:
          "Teach something useful — how to evaluate vendors, build the business case, avoid implementation mistakes. Genuine value builds trust long before they buy.",
        post_frequency: "1x per week",
        example_topic:
          "\"How to build the internal business case — the number that moves the budget holder.\"",
      },
      {
        pillar: "Be Human",
        description:
          "Share the honest side of sales — a deal lost and learned from, why you believe in what you sell. In a distrusted profession, being genuinely human stands out.",
        post_frequency: "1x per week",
        example_topic:
          "\"I lost a deal by answering the question they asked, not the one they meant.\"",
      },
      {
        pillar: "Sales Insight",
        description:
          "Share what you've learned about how deals really get done. This positions you as an expert in your buyer's decision, not just a rep.",
        post_frequency: "1x per week",
        example_topic:
          "\"Most teams write requirements for the tool they already demoed. Here's the fix.\"",
      },
      {
        pillar: "Industry POV",
        description:
          "Take positions on trends in your buyers' world. This makes you a voice worth following, not a vendor to ignore.",
        post_frequency: "1x per week",
        example_topic:
          "\"The shift in [industry] that's about to change how everyone buys.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Industry POV", topic_idea: "A take on the buyer's industry", format: "Caption" },
      { day: "Tuesday", content_type: "Speak to the Buyer's Problem", topic_idea: "A real problem from your calls", format: "Carousel" },
      { day: "Wednesday", content_type: "Buyer Education", topic_idea: "Help buyers make a better decision", format: "Carousel" },
      { day: "Thursday", content_type: "Sales Insight", topic_idea: "How deals really get done", format: "Caption" },
      { day: "Friday", content_type: "Be Human", topic_idea: "An honest sales story", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on target buyers' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week from this week's calls", format: "Planning" },
    ],
    growth_tactics: [
      "Turn real objections from calls into posts that warm the next prospect.",
      "Lead with the buyer's problem, not your pitch, so decision-makers stop scrolling.",
      "Comment on target buyers' posts daily so they recognize your name before your email.",
      "Stay consistent through long buying cycles — the prospect who buys in 8 months is watching now.",
      "Pin a buyer-education carousel so a prospect sees value, not a pitch.",
    ],
    common_strategy_mistakes: [
      "Posting about your product, not the buyer's world. Fix: lead with their problem.",
      "Leaving a bare profile, so outreach stays cold. Fix: build a warming presence.",
      "Sounding like a quota-carrying robot. Fix: be genuinely human.",
      "Going quiet during busy quarters. Fix: batch to stay top of mind.",
    ],
  },
  "sales-managers": {
    ideal_audience:
      "Senior sales leaders and executives who promote managers who develop people, plus the strong reps you want to recruit. You're building a leadership brand that proves you build teams, not just hit numbers.",
    strategy_pillars: [
      {
        pillar: "Coaching & Team Wins",
        description:
          "Share the rep you coached up, the process change that lifted the team. These prove you develop people — what senior roles hire for.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"He missed quota three quarters. The problem was the territory, not the rep.\"",
      },
      {
        pillar: "Leadership Tensions",
        description:
          "Name the hard realities of carrying a number through others. Specific, uncomfortable truths signal genuine leadership depth.",
        post_frequency: "1x per week",
        example_topic:
          "\"Your best rep isn't your best hire. Promoting them cost you your top closer.\"",
      },
      {
        pillar: "Leadership Systems",
        description:
          "Teach a system — pipeline reviews that help, coaching a struggling rep, a trustworthy forecast. This positions you as a thinker in sales leadership.",
        post_frequency: "1x per week",
        example_topic:
          "\"Pipeline reviews that don't waste everyone's time — the format I use.\"",
      },
      {
        pillar: "Champion Your Team",
        description:
          "Celebrate your reps publicly. This makes you a leader people want to work for and turns your feed into a recruiting engine.",
        post_frequency: "1x per week",
        example_topic:
          "\"My rep just closed the biggest deal of the quarter. Here's what she did differently.\"",
      },
      {
        pillar: "Sales Leadership POV",
        description:
          "Take clear positions on managing and building teams. A distinct voice builds the reputation that opens VP roles.",
        post_frequency: "1x per week",
        example_topic:
          "\"Motivation isn't a management strategy. Systems are.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Sales Leadership POV", topic_idea: "A position on building teams", format: "Caption" },
      { day: "Tuesday", content_type: "Coaching & Team Win", topic_idea: "A coaching breakthrough story", format: "Carousel" },
      { day: "Wednesday", content_type: "Leadership System", topic_idea: "A management system, taught", format: "Carousel" },
      { day: "Thursday", content_type: "Leadership Tension", topic_idea: "A hard truth of sales leadership", format: "Caption" },
      { day: "Friday", content_type: "Champion Your Team", topic_idea: "A rep's win worth celebrating", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on leaders' and reps' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week from coaching moments", format: "Planning" },
    ],
    growth_tactics: [
      "Turn coaching breakthroughs into stories that prove you develop people.",
      "Name the real tensions of sales leadership to resonate with peers.",
      "Champion your reps publicly to turn your feed into a recruiting magnet.",
      "Batch through quarter-end so your leadership brand keeps building.",
      "Pin a leadership-system post — the profile VP roles hire against.",
    ],
    common_strategy_mistakes: [
      "Generic sales motivation that builds no leadership credibility. Fix: share coaching wins.",
      "Keeping your leadership invisible outside your team. Fix: publish it.",
      "Never championing reps. Fix: celebrate the team to attract talent.",
      "Disappearing at quarter-end. Fix: batch ahead.",
    ],
  },
  "account-executives": {
    ideal_audience:
      "The senior buyers you want meetings with and the champions who advocate internally. You're building a presence that makes prospects recognize your name before your first email, so your reply rates and pipeline climb.",
    strategy_pillars: [
      {
        pillar: "Diagnose the Buyer's Problem",
        description:
          "Lead with genuine insight into your buyer's decision, not a pitch. This earns attention from people who scroll past every ad.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"Most teams buying in this category get the requirements wrong. Here's what to ask.\"",
      },
      {
        pillar: "Help Them Decide",
        description:
          "Teach how to evaluate options, build the case, avoid mistakes — even neutrally. Helping buyers decide builds trust that pays off when they buy.",
        post_frequency: "1x per week",
        example_topic:
          "\"How to evaluate vendors in this category — the demo trap and the questions that matter.\"",
      },
      {
        pillar: "Human Behind the Quota",
        description:
          "Share honesty and personality. In a distrusted profession, being real makes you memorable amid templated outreach.",
        post_frequency: "1x per week",
        example_topic:
          "\"I lost a deal last month. Here's how I'd run that call again.\"",
      },
      {
        pillar: "Deal Insight",
        description:
          "Share what your conversations teach you about your buyers' world. This positions you as an expert in their problem.",
        post_frequency: "1x per week",
        example_topic:
          "\"The objection I hear on every call — and what it really means.\"",
      },
      {
        pillar: "Buyer-World POV",
        description:
          "Take positions on trends in your buyers' industry. This makes you a voice worth following.",
        post_frequency: "1x per week",
        example_topic:
          "\"The change in [industry] that's about to reshape how teams buy.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Buyer-World POV", topic_idea: "A take on the buyer's industry", format: "Caption" },
      { day: "Tuesday", content_type: "Diagnose the Buyer's Problem", topic_idea: "Insight into their decision", format: "Carousel" },
      { day: "Wednesday", content_type: "Help Them Decide", topic_idea: "Guidance on evaluating options", format: "Carousel" },
      { day: "Thursday", content_type: "Deal Insight", topic_idea: "What a real objection reveals", format: "Caption" },
      { day: "Friday", content_type: "Human Behind the Quota", topic_idea: "An honest sales story", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on target buyers' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week from your calls", format: "Planning" },
    ],
    growth_tactics: [
      "Turn real objections into posts that warm your next buyer.",
      "Diagnose the buyer's problem so decision-makers actually stop scrolling.",
      "Comment on target buyers' posts so they recognize your name before your email.",
      "Stay visible through quarter-end crunch and long buying cycles.",
      "Pin a buyer-decision carousel so a prospect sees help, not a pitch.",
    ],
    common_strategy_mistakes: [
      "Pitching instead of diagnosing. Fix: lead with the buyer's problem.",
      "A bare profile that keeps outreach cold. Fix: build recognition.",
      "Sounding slick and templated. Fix: show the human behind the quota.",
      "Going quiet in busy quarters. Fix: batch to stay visible.",
    ],
  },
  "business-development-managers": {
    ideal_audience:
      "Potential partners, founders, and executives across your ecosystem, plus the deal-makers who track strategic operators. You're building a reputation that makes opportunities come to you instead of requiring cold outreach every time.",
    strategy_pillars: [
      {
        pillar: "How Deals Get Done",
        description:
          "Share insight into structuring partnerships, finding the right partner, building a case both sides believe. Demystifying deal-making builds authority.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"Most partnerships fail before the contract — in the conversation nobody has.\"",
      },
      {
        pillar: "Ecosystem Opportunity",
        description:
          "Surface opportunities and misconceptions about growth and partnerships. This signals you think at a business level, not a networking one.",
        post_frequency: "1x per week",
        example_topic:
          "\"The partnership that doubled our pipeline started as a favor with no contract.\"",
      },
      {
        pillar: "Deal Lessons",
        description:
          "Share the strategic thinking behind real deals — the alliance that failed and why. This proves you create growth, not just collect contacts.",
        post_frequency: "1x per week",
        example_topic:
          "\"The four-month deal we papered that never shipped — and why.\"",
      },
      {
        pillar: "Be Generous",
        description:
          "Celebrate partners, highlight interesting companies, share useful connections. Visible generosity builds the goodwill BD runs on.",
        post_frequency: "1x per week",
        example_topic:
          "\"Three companies in our space doing genuinely interesting work right now.\"",
      },
      {
        pillar: "BD POV",
        description:
          "Take positions on partnerships and growth. A distinct voice makes you a known operator.",
        post_frequency: "1x per week",
        example_topic:
          "\"Reciprocity beats persuasion. The BD reps who give first always win.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "BD POV", topic_idea: "A position on partnerships and growth", format: "Caption" },
      { day: "Tuesday", content_type: "How Deals Get Done", topic_idea: "Insight into structuring a deal", format: "Carousel" },
      { day: "Wednesday", content_type: "Deal Lessons", topic_idea: "The thinking behind a real deal", format: "Carousel" },
      { day: "Thursday", content_type: "Ecosystem Opportunity", topic_idea: "An opportunity or misconception about growth", format: "Caption" },
      { day: "Friday", content_type: "Be Generous", topic_idea: "Celebrate a partner or interesting company", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on partners' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week from deal lessons", format: "Planning" },
    ],
    growth_tactics: [
      "Share insight on how deals really get done to build ecosystem authority.",
      "Be visibly generous — the goodwill compounds into inbound opportunities.",
      "Comment on potential partners' posts so opportunities start finding you.",
      "Batch through a meeting-heavy schedule so visibility holds.",
      "Pin a deal-insight carousel that proves you're a strategic operator.",
    ],
    common_strategy_mistakes: [
      "Opening every door manually via cold outreach. Fix: build a reputation that pulls inbound.",
      "Keeping deal insight in your head. Fix: publish it.",
      "Only taking, never giving. Fix: be visibly generous in your ecosystem.",
      "Disappearing during travel-heavy weeks. Fix: batch to stay present.",
    ],
  },
  "software-engineers": {
    ideal_audience:
      "Fellow engineers, hiring managers, and tech leaders who respect real technical depth and clear communication. You're building an engineering reputation that leads to senior roles, conference invites, and influence — worth more than another certification.",
    strategy_pillars: [
      {
        pillar: "Problems You Debug",
        description:
          "Turn gnarly bugs, architecture decisions, and refactors into teaching posts. Lived examples beat tutorials because engineers want to see how a practitioner thinks through trade-offs.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"We spent 3 weeks on a caching layer we didn't need. Here's how to tell.\"",
      },
      {
        pillar: "Explain It Clearly",
        description:
          "Explain a concept clearly — the naive approach, the insight, the trade-off. Explaining depth is rare and valued, and it's what gets engineers into senior and staff roles.",
        post_frequency: "1x per week",
        example_topic:
          "\"Why your retry logic is making things worse — the thundering herd, explained.\"",
      },
      {
        pillar: "Honest Trade-offs",
        description:
          "Share the outage you caused, the design you regret. Reflecting on a mistake demonstrates the judgment senior roles hire for.",
        post_frequency: "1x per week",
        example_topic:
          "\"I approved a rewrite. It nearly killed us. Here's what I'd do now.\"",
      },
      {
        pillar: "Real Engineering Pain",
        description:
          "Name a shared frustration or hard-won lesson. Concrete war stories earn respect from a skeptical, fluff-allergic audience.",
        post_frequency: "1x per week",
        example_topic:
          "\"Our p99 dropped 80% after we deleted code. Not optimized — deleted.\"",
      },
      {
        pillar: "Engineering POV",
        description:
          "Take positions on engineering practice — testing, architecture, process. A distinct voice builds a memorable reputation.",
        post_frequency: "1x per week",
        example_topic:
          "\"Choosing boring technology was the best decision we made.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Engineering POV", topic_idea: "A position on engineering practice", format: "Caption" },
      { day: "Tuesday", content_type: "Problem You Debugged", topic_idea: "A real problem, taught", format: "Carousel" },
      { day: "Wednesday", content_type: "Explain It Clearly", topic_idea: "A concept explained cleanly", format: "Carousel" },
      { day: "Thursday", content_type: "Real Engineering Pain", topic_idea: "A concrete war story with a lesson", format: "Caption" },
      { day: "Friday", content_type: "Honest Trade-off", topic_idea: "A mistake and what it taught you", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on engineers' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch so content never breaks your flow", format: "Planning" },
    ],
    growth_tactics: [
      "Keep a note of real problems you solve so your feed draws on lived material.",
      "Explain concepts clearly — that rare skill is what gets you into senior roles.",
      "Share honest trade-offs and outages to signal senior judgment.",
      "Batch a week so reputation-building never interrupts deep work.",
      "Pin a technical explainer that demonstrates depth and communication.",
    ],
    common_strategy_mistakes: [
      "Recycled 'clean code matters' platitudes. Fix: lead with real problems.",
      "Only sharing wins, never misses. Fix: reflect on a mistake for credibility.",
      "Letting work stay in PRs and Slack. Fix: publish the lessons.",
      "Context-switching out of flow to post. Fix: batch separately.",
    ],
  },
  "web-developers": {
    ideal_audience:
      "Fellow developers, potential clients, and hiring managers who judge you by demonstrated skill, not a resume. You're building authority in a web specialty so the projects, roles, and clients tied to that skill come to you.",
    strategy_pillars: [
      {
        pillar: "Proof of Skill",
        description:
          "Turn shipped projects into evidence — the performance win, the tricky integration solved elegantly. Showing work in action lets prospects reach out already convinced.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"We cut page weight 70% without touching an image. Here's what was really loading.\"",
      },
      {
        pillar: "Teach a Technique",
        description:
          "Break down a technique — optimizing load time, a component library, real accessibility. When a dev applies it, you earn an advocate.",
        post_frequency: "1x per week",
        example_topic:
          "\"Making a site actually feel fast — perceived vs measured performance.\"",
      },
      {
        pillar: "Real Web Problems",
        description:
          "Lead with a concrete problem and measurable result. This grabs a practical audience that scrolls past 'learn to code.'",
        post_frequency: "1x per week",
        example_topic:
          "\"Your Lighthouse score is lying to you. Here's what actually made our site fast.\"",
      },
      {
        pillar: "Pragmatic Ecosystem Takes",
        description:
          "Share a grounded view on framework churn — what's worth adopting, what isn't. Pragmatism resonates with devs tired of hype cycles.",
        post_frequency: "1x per week",
        example_topic:
          "\"You don't need that framework. Here's when the added complexity actually pays off.\"",
      },
      {
        pillar: "Dev POV",
        description:
          "Take positions on web practice. A distinct voice builds a memorable reputation.",
        post_frequency: "1x per week",
        example_topic:
          "\"Rewriting your app every two years isn't progress. It's a lack of strategy.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Dev POV", topic_idea: "A position on web practice", format: "Caption" },
      { day: "Tuesday", content_type: "Proof of Skill", topic_idea: "A shipped project as evidence", format: "Image" },
      { day: "Wednesday", content_type: "Teach a Technique", topic_idea: "A technique, taught", format: "Carousel" },
      { day: "Thursday", content_type: "Real Web Problem", topic_idea: "A concrete problem with a result", format: "Carousel" },
      { day: "Friday", content_type: "Pragmatic Ecosystem Take", topic_idea: "A grounded view on framework churn", format: "Caption" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on devs' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch without breaking your flow", format: "Planning" },
    ],
    growth_tactics: [
      "Turn shipped projects into proof posts so your portfolio grows as you work.",
      "Teach techniques that make clients see the expert they'd rather hire.",
      "Take pragmatic positions on framework churn to stand out from hype-chasers.",
      "Batch so visibility holds through heads-down build weeks.",
      "Pin a proof carousel that markets you without a cold pitch.",
    ],
    common_strategy_mistakes: [
      "Letting great work stay invisible until you're hired. Fix: publish proof of skill.",
      "Generic 'learn to code' content. Fix: lead with real problems and results.",
      "Chasing every framework. Fix: take pragmatic, grounded positions.",
      "Going silent during projects, then scrambling. Fix: batch to keep marketing running.",
    ],
  },
  "data-scientists": {
    ideal_audience:
      "Fellow data professionals, hiring managers, and business leaders who respect rigor and clear communication. You're building a reputation for practitioner judgment that leads to senior roles and influence beyond the notebook.",
    strategy_pillars: [
      {
        pillar: "Real Findings",
        description:
          "Share surprising results, failed models, and methodological lessons. Practitioner insight beats tooling talk and proves your judgment.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"Our A/B test was significant and completely wrong. We'd been peeking daily.\"",
      },
      {
        pillar: "Explain the Concept",
        description:
          "Explain a concept without jargon — a trustworthy experiment, overfitting, communicating uncertainty. This rare combination of rigor and clarity gets you promoted.",
        post_frequency: "1x per week",
        example_topic:
          "\"Why your A/B test lied to you — peeking, multiple comparisons, and the fix.\"",
      },
      {
        pillar: "Counterintuitive Truths",
        description:
          "Lead with a technically-grounded truth that overturns a belief. Data people stop for well-reasoned insight, not hype.",
        post_frequency: "1x per week",
        example_topic:
          "\"The model was 94% accurate and useless. The base rate was 94%.\"",
      },
      {
        pillar: "The Stakeholder Side",
        description:
          "Share pushing back on a bad metric, saying 'the data can't answer that.' This reflects the real job and shows business judgment.",
        post_frequency: "1x per week",
        example_topic:
          "\"The most valuable thing I said all quarter: 'the data can't answer that.'\"",
      },
      {
        pillar: "Data POV",
        description:
          "Take positions on data practice and its role. A distinct voice builds a memorable reputation.",
        post_frequency: "1x per week",
        example_topic:
          "\"Most dashboards are decoration. Here's what makes data actually get used.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Data POV", topic_idea: "A position on data practice", format: "Caption" },
      { day: "Tuesday", content_type: "Real Finding", topic_idea: "A surprising result, taught", format: "Carousel" },
      { day: "Wednesday", content_type: "Explain the Concept", topic_idea: "A concept explained jargon-free", format: "Carousel" },
      { day: "Thursday", content_type: "Counterintuitive Truth", topic_idea: "A well-reasoned surprise", format: "Caption" },
      { day: "Friday", content_type: "The Stakeholder Side", topic_idea: "A real judgment call with stakeholders", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on data professionals' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch without breaking deep focus", format: "Planning" },
    ],
    growth_tactics: [
      "Turn real findings into insight posts that prove judgment over tooling.",
      "Explain concepts clearly to demonstrate the rigor-plus-communication that gets promoted.",
      "Lead with counterintuitive, well-reasoned truths for a hype-resistant audience.",
      "Batch so reputation-building never interrupts deep analysis.",
      "Pin an explainer that shows both depth and communication.",
    ],
    common_strategy_mistakes: [
      "Posting tooling hype instead of judgment. Fix: share real findings.",
      "Vague claims to a rigorous audience. Fix: lead with grounded, counterintuitive truths.",
      "Leaving insight locked in notebooks. Fix: publish it.",
      "Ignoring the stakeholder side. Fix: show business judgment.",
    ],
  },
  "ai-researchers": {
    ideal_audience:
      "Fellow researchers, practitioners building on the tech, and decision-makers navigating AI hype who need rigorous signal. You're building authority by bringing real research depth to a loud, shallow conversation.",
    strategy_pillars: [
      {
        pillar: "Rigor Over Hype",
        description:
          "Bring precise, honest framing to a noise-saturated space. This is refreshing and highly shareable where breathless speculation dominates.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"This model isn't reasoning. Here's what it's actually doing — and why it matters.\"",
      },
      {
        pillar: "Make Hard Ideas Legible",
        description:
          "Explain a technique or misconception without dumbing it down. Making hard ideas legible builds enormous authority and opens doors.",
        post_frequency: "1x per week",
        example_topic:
          "\"The benchmark everyone cites measures something nobody actually wants.\"",
      },
      {
        pillar: "Honest Limitations",
        description:
          "Be honest about what models can't do and where uncertainty lies. This builds deep trust with researchers and decision-makers.",
        post_frequency: "1x per week",
        example_topic:
          "\"What this system genuinely can't do yet — and why the demos hide it.\"",
      },
      {
        pillar: "Research Insight",
        description:
          "Share insights from your work in accessible form. This spreads your ideas beyond the few who read papers.",
        post_frequency: "1x per week",
        example_topic:
          "\"A finding from our latest work, in plain terms — and the implication for builders.\"",
      },
      {
        pillar: "AI POV",
        description:
          "Take grounded positions on where AI is really heading. Considered foresight cuts through noise.",
        post_frequency: "1x per week",
        example_topic:
          "\"The capability everyone's predicting is further away than the hype suggests. Here's why.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "AI POV", topic_idea: "Grounded foresight on AI's direction", format: "Caption" },
      { day: "Tuesday", content_type: "Rigor Over Hype", topic_idea: "Precise framing that cuts through noise", format: "Carousel" },
      { day: "Wednesday", content_type: "Make Hard Ideas Legible", topic_idea: "A hard idea explained accessibly", format: "Carousel" },
      { day: "Thursday", content_type: "Honest Limitations", topic_idea: "What models genuinely can't do", format: "Caption" },
      { day: "Friday", content_type: "Research Insight", topic_idea: "A finding in plain terms", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on researchers' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch without derailing research", format: "Planning" },
    ],
    growth_tactics: [
      "Bring rigor to hype — the signal a noise-saturated audience is starved for.",
      "Make a genuinely hard idea legible to build authority and bridge audiences.",
      "Be honest about limitations to build deep trust.",
      "Batch so your voice stays present without derailing research.",
      "Pin an accessible explainer that spreads your ideas beyond paper-readers.",
    ],
    common_strategy_mistakes: [
      "Adding to the hype instead of the signal. Fix: bring rigor and honesty.",
      "Keeping insight in papers only. Fix: make it accessible.",
      "Overclaiming like the hype crowd. Fix: be honest about limitations.",
      "Staying absent from a fast conversation. Fix: batch to stay present.",
    ],
  },
  "ux-designers": {
    ideal_audience:
      "Product leaders, founders, and hiring managers who need a designer who thinks systemically, plus peers who share craft. You're building a reputation as a strategic designer, not a decorator, so the roles and projects that value real design thinking come to you.",
    strategy_pillars: [
      {
        pillar: "Design Decisions",
        description:
          "Turn the decisions you make daily into content — the research insight that changed a flow, the pattern you rejected. This shows how a real practitioner thinks.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"Your users aren't confused by your UI. They're confused by your product's model.\"",
      },
      {
        pillar: "Reframe the Problem",
        description:
          "Diagnose a design problem at a deeper level. A reframe signals strategic thinking beyond aesthetics.",
        post_frequency: "1x per week",
        example_topic:
          "\"We ran 5 rounds of testing on a screen that shouldn't have existed.\"",
      },
      {
        pillar: "Teach a Principle",
        description:
          "Break down a principle — research on a budget, why a pattern fails, designing the unhappy path. A well-built carousel about design is its own proof.",
        post_frequency: "1x per week",
        example_topic:
          "\"Designing the unhappy path — where products actually break.\"",
      },
      {
        pillar: "Design as Business",
        description:
          "Make the case for design as a business driver. This earns you a seat at the table.",
        post_frequency: "1x per week",
        example_topic:
          "\"Good design isn't decoration. Here's the revenue it quietly protects.\"",
      },
      {
        pillar: "Design POV",
        description:
          "Take positions on UX practice. A distinct voice attracts leaders who need systemic thinking.",
        post_frequency: "1x per week",
        example_topic:
          "\"Usability testing can't save a bad strategy. Here's what to fix first.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Design POV", topic_idea: "A position on UX practice", format: "Caption" },
      { day: "Tuesday", content_type: "Design Decision", topic_idea: "A real design decision, taught", format: "Carousel" },
      { day: "Wednesday", content_type: "Teach a Principle", topic_idea: "A design principle, broken down", format: "Carousel" },
      { day: "Thursday", content_type: "Reframe the Problem", topic_idea: "A deeper diagnosis of a design problem", format: "Caption" },
      { day: "Friday", content_type: "Design as Business", topic_idea: "The business case for design", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on designers' and PMs' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch without draining creative energy", format: "Planning" },
    ],
    growth_tactics: [
      "Turn design decisions into reasoning posts that prove you're strategic, not decorative.",
      "Reframe problems to signal depth beyond aesthetics.",
      "Make the business case for design to earn a seat at the table.",
      "Let your feed be a flawless portfolio piece — the most direct proof of your ability.",
      "Batch so building your presence doesn't drain the energy your work needs.",
    ],
    common_strategy_mistakes: [
      "Being seen as a decorator. Fix: show strategic reasoning.",
      "Only posting pretty screens. Fix: teach principles and reframes.",
      "Never making the business case. Fix: connect design to outcomes.",
      "A rushed feed for a visual professional. Fix: keep it flawless.",
    ],
  },
  "product-designers": {
    ideal_audience:
      "Product leaders, founders, and hiring managers who want a designer who ships business outcomes, plus peers who respect craft. You're building recognition as a product partner, not a pixel executor.",
    strategy_pillars: [
      {
        pillar: "Shipped Work & Outcomes",
        description:
          "Turn shipped projects into outcome-led stories. This reframes design work as business impact, not decoration.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The prettiest design we shipped was our worst-performing. Here's why.\"",
      },
      {
        pillar: "Product-Design Tensions",
        description:
          "Name the hard trade-offs — craft vs speed, user needs vs business goals, saying no. These signal maturity, not theory.",
        post_frequency: "1x per week",
        example_topic:
          "\"I argued against a feature for three weeks. We shipped it. I was still wrong.\"",
      },
      {
        pillar: "Teach a Method",
        description:
          "Break down a method — a first version worth shipping, a design system that survives, validating before building. The craft is a double demonstration.",
        post_frequency: "1x per week",
        example_topic:
          "\"A first version worth shipping — the scope trap and the smallest real test.\"",
      },
      {
        pillar: "Collaboration & Influence",
        description:
          "Share influencing without authority, disagreeing with a PM. This is the profile senior roles hire for.",
        post_frequency: "1x per week",
        example_topic:
          "\"How I make the case for design in a room that only speaks metrics.\"",
      },
      {
        pillar: "Product-Design POV",
        description:
          "Take positions on product design practice. A distinct voice builds authority.",
        post_frequency: "1x per week",
        example_topic:
          "\"Designers who optimize for the review instead of the user always lose.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Product-Design POV", topic_idea: "A position on product design", format: "Caption" },
      { day: "Tuesday", content_type: "Shipped Work & Outcomes", topic_idea: "A project reframed as business impact", format: "Carousel" },
      { day: "Wednesday", content_type: "Teach a Method", topic_idea: "A design method, taught", format: "Carousel" },
      { day: "Thursday", content_type: "Product-Design Tension", topic_idea: "A real trade-off you faced", format: "Caption" },
      { day: "Friday", content_type: "Collaboration & Influence", topic_idea: "Influencing without authority", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on designers' and PMs' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch without draining creative energy", format: "Planning" },
    ],
    growth_tactics: [
      "Turn shipped work into outcome-led stories that reframe design as impact.",
      "Name real product-design tensions to signal maturity.",
      "Share the collaboration side — the profile senior roles hire for.",
      "Let your feed prove both thinking and execution.",
      "Batch so your presence doesn't drain the energy your product work needs.",
    ],
    common_strategy_mistakes: [
      "Being seen as a pixel executor. Fix: lead with outcomes and product judgment.",
      "Posting portfolio shots with no thinking. Fix: teach methods and tensions.",
      "Ignoring the collaboration side. Fix: show how you influence.",
      "Draining creative energy on content. Fix: batch it.",
    ],
  },
  "developer-advocates": {
    ideal_audience:
      "The developer community you serve and the technical decision-makers who eventually adopt your product. Your public output is the core of your role, so you're building trust by helping developers first and selling never.",
    strategy_pillars: [
      {
        pillar: "Solve Real Dev Pain",
        description:
          "Turn the pain you hear daily into genuinely helpful content. Serving the community first is the essence of good DevRel.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The auth pattern that breaks in production — and why it works fine locally.\"",
      },
      {
        pillar: "Teach Without Pitching",
        description:
          "Explain how a protocol works, debug a common failure, share a pattern. Trust is what eventually makes developers try your product.",
        post_frequency: "1x per week",
        example_topic:
          "\"Debugging the failure everyone hits with webhooks — the actual mechanism.\"",
      },
      {
        pillar: "Concrete Technical Help",
        description:
          "Promise a specific fix, not product marketing. Developers detect marketing instantly and scroll past it.",
        post_frequency: "1x per week",
        example_topic:
          "\"Our docs were wrong for 8 months. Here's the bug and what we changed.\"",
      },
      {
        pillar: "Honest About Limits",
        description:
          "Be honest about your product's limits. This is counterintuitive to marketing instincts and exactly what makes developers listen.",
        post_frequency: "1x per week",
        example_topic:
          "\"Our tool is the wrong choice if you need X. Here's when to use something else.\"",
      },
      {
        pillar: "DevRel POV",
        description:
          "Take positions on developer experience and the ecosystem. A distinct voice builds trust and reach.",
        post_frequency: "1x per week",
        example_topic:
          "\"Most SDKs optimize for the demo, not the maintenance. That's backwards.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "DevRel POV", topic_idea: "A position on developer experience", format: "Caption" },
      { day: "Tuesday", content_type: "Solve Real Dev Pain", topic_idea: "Helpful content on a real pain", format: "Carousel" },
      { day: "Wednesday", content_type: "Teach Without Pitching", topic_idea: "A technical explainer, no sell", format: "Carousel" },
      { day: "Thursday", content_type: "Concrete Technical Help", topic_idea: "A specific fix developers need", format: "Caption" },
      { day: "Friday", content_type: "Honest About Limits", topic_idea: "Where your product isn't the answer", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Answer developer questions — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch so output survives conference season", format: "Planning" },
    ],
    growth_tactics: [
      "Turn real developer pain into helpful content that serves the community first.",
      "Teach without pitching, because trust is what makes developers try your product.",
      "Be honest about limits — it's what makes a skeptical audience listen.",
      "Batch so your public output survives conference and travel season.",
      "Pin an explainer that helps developers before it ever mentions your product.",
    ],
    common_strategy_mistakes: [
      "Drifting into product marketing under time pressure. Fix: stay genuinely helpful.",
      "Pitching instead of teaching. Fix: help first, sell never.",
      "Overselling capabilities. Fix: be honest about limits.",
      "Going silent during conferences. Fix: batch ahead.",
    ],
  },
  "technical-writers": {
    ideal_audience:
      "Fellow writers, engineering and product leaders who value docs, and potential clients — in a field where almost nobody builds a public profile. You're making an undervalued craft visible, so your reputation compounds unusually fast.",
    strategy_pillars: [
      {
        pillar: "Information Design",
        description:
          "Turn documentation challenges into content about making complexity clear. This makes a rare craft visible.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"Your docs aren't too technical. They answer your question, not the reader's.\"",
      },
      {
        pillar: "Demonstrate Clarity",
        description:
          "Every sharp, clear hook demonstrates the make-it-simple skill you sell. Your feed is an audition.",
        post_frequency: "1x per week",
        example_topic:
          "\"We deleted 60% of the docs. Support tickets dropped. Here's why.\"",
      },
      {
        pillar: "Teach a Principle",
        description:
          "Break down a principle — structuring docs people finish, writing to a mental model, what not to document. The clarity is the proof.",
        post_frequency: "1x per week",
        example_topic:
          "\"What not to document — the completeness trap and the decision rule.\"",
      },
      {
        pillar: "Docs as a Business Asset",
        description:
          "Make the case that docs drive adoption, reduce support, and retain users. This elevates the discipline.",
        post_frequency: "1x per week",
        example_topic:
          "\"Great docs are a growth channel. Here's the adoption data that proves it.\"",
      },
      {
        pillar: "Writing POV",
        description:
          "Take positions on technical communication. A distinct voice builds fast authority in an empty field.",
        post_frequency: "1x per week",
        example_topic:
          "\"Most 'complete' documentation is where answers go to hide.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Writing POV", topic_idea: "A position on technical communication", format: "Caption" },
      { day: "Tuesday", content_type: "Information Design", topic_idea: "A documentation challenge, taught", format: "Carousel" },
      { day: "Wednesday", content_type: "Teach a Principle", topic_idea: "A writing principle, broken down", format: "Carousel" },
      { day: "Thursday", content_type: "Docs as a Business Asset", topic_idea: "The business case for docs", format: "Caption" },
      { day: "Friday", content_type: "Demonstrate Clarity", topic_idea: "A post whose clarity proves your skill", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment in writing and dev communities — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week's content", format: "Planning" },
    ],
    growth_tactics: [
      "Make your undervalued craft visible in a field where almost no writers have a profile.",
      "Let every clear hook demonstrate the make-it-simple skill you sell.",
      "Make the case for docs as a business asset to elevate the discipline.",
      "Build a public profile fast — with so few competitors, your reputation compounds quickly.",
      "Pin a principle carousel whose clarity is the proof.",
    ],
    common_strategy_mistakes: [
      "Staying invisible like most technical writers. Fix: build a public profile — it compounds fast.",
      "Cluttered posts that contradict your value. Fix: model the clarity you sell.",
      "Letting docs be seen as a cost. Fix: make the business case.",
      "Inconsistent posting. Fix: batch for steady presence.",
    ],
  },
  "cto-tech-leaders": {
    ideal_audience:
      "The senior engineers you want to recruit, the investors and peers evaluating your technical leadership, and the founders who need a credible technical voice. You're building a leadership brand that attracts talent and trust, treating visibility as a leveraged, delegated activity.",
    strategy_pillars: [
      {
        pillar: "Technical Leadership Lessons",
        description:
          "Teach from real decisions — scaling an org, build vs buy, managing debt strategically. This is the content engineers follow and that leads to board roles.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The technical debt we chose to keep — and the cost model behind the call.\"",
      },
      {
        pillar: "Take a Technical Stand",
        description:
          "Take a real stand or admit an honest mistake. Engineers respect leaders with opinions and scars — exactly who you want to hire.",
        post_frequency: "1x per week",
        example_topic:
          "\"We chose the boring technology. Best decision we made.\"",
      },
      {
        pillar: "Champion Your Engineers",
        description:
          "Celebrate your team and culture. This turns your feed into a recruiting magnet in a brutal talent market.",
        post_frequency: "1x per week",
        example_topic:
          "\"My staff engineer made a call I disagreed with. She was right.\"",
      },
      {
        pillar: "Engineering Org POV",
        description:
          "Share how to build and scale engineering teams and culture. A distinct voice attracts talent and respect.",
        post_frequency: "1x per week",
        example_topic:
          "\"Process doesn't slow teams down. Bad process does. Here's the difference.\"",
      },
      {
        pillar: "Industry Foresight",
        description:
          "Take a stand on where technology is heading. This positions you as a leader, not just an operator.",
        post_frequency: "1x per week",
        example_topic:
          "\"The architecture decision every team will regret in three years.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Engineering Org POV", topic_idea: "A position on building teams", format: "Caption" },
      { day: "Tuesday", content_type: "Technical Leadership Lesson", topic_idea: "A real decision, taught", format: "Carousel" },
      { day: "Wednesday", content_type: "Industry Foresight", topic_idea: "Where technology is heading", format: "Carousel" },
      { day: "Thursday", content_type: "Take a Technical Stand", topic_idea: "A stand or honest mistake", format: "Caption" },
      { day: "Friday", content_type: "Champion Your Engineers", topic_idea: "A team or culture win", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on engineers' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Hand 20 min of raw thinking to batching", format: "Planning" },
    ],
    growth_tactics: [
      "Treat content as leveraged — provide 20 minutes of raw thinking and delegate production.",
      "Take real technical stands that attract engineers who want a leader with a spine.",
      "Champion your engineers publicly to turn your feed into a recruiting magnet.",
      "Stay consistently visible through incidents so influence compounds.",
      "Pin a leadership-lesson carousel so talent and investors see conviction.",
    ],
    common_strategy_mistakes: [
      "Cautious corporate-speak that attracts no one. Fix: take real technical stands.",
      "Keeping decisions private. Fix: teach from real calls.",
      "Never championing your team. Fix: celebrate engineers to recruit.",
      "Trying to find an hour a day. Fix: make it a delegated, batched activity.",
    ],
  },
  "cybersecurity-experts": {
    ideal_audience:
      "Fellow practitioners, security-conscious business leaders, and decision-makers navigating threats who need grounded signal over FUD. You're building a reputation as a credible, practical voice in a fear-saturated space.",
    strategy_pillars: [
      {
        pillar: "Cut Through FUD",
        description:
          "Offer calm, precise assessments instead of vendor fear-mongering. In a space drowning in FUD, grounded analysis stands out immediately.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"That vulnerability everyone's panicking about probably doesn't affect you. Here's the check.\"",
      },
      {
        pillar: "Sanitized Findings",
        description:
          "Turn real findings into teaching content. This proves you've done the work, not recycled headlines.",
        post_frequency: "1x per week",
        example_topic:
          "\"The breach wasn't sophisticated. A 2019 password and no MFA. As always.\"",
      },
      {
        pillar: "Practical Defense",
        description:
          "Teach threat modeling, prioritizing the vulnerabilities that matter, explaining risk to executives. This builds authority with practitioners and business buyers.",
        post_frequency: "1x per week",
        example_topic:
          "\"Prioritizing vulnerabilities that actually matter — why CVSS misleads.\"",
      },
      {
        pillar: "Risk in Business Terms",
        description:
          "Translate security risk into business language. This proves you can operate at the executive level.",
        post_frequency: "1x per week",
        example_topic:
          "\"Stop reporting vulnerabilities to the board. Report business risk instead.\"",
      },
      {
        pillar: "Security POV",
        description:
          "Take positions on security practice and the industry. A distinct, credible voice builds trust.",
        post_frequency: "1x per week",
        example_topic:
          "\"Most security awareness training makes you less safe. Here's why.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Security POV", topic_idea: "A position on security practice", format: "Caption" },
      { day: "Tuesday", content_type: "Sanitized Finding", topic_idea: "A real finding, taught", format: "Carousel" },
      { day: "Wednesday", content_type: "Practical Defense", topic_idea: "A defensive practice, broken down", format: "Carousel" },
      { day: "Thursday", content_type: "Cut Through FUD", topic_idea: "A calm assessment of a hyped threat", format: "Caption" },
      { day: "Friday", content_type: "Risk in Business Terms", topic_idea: "Translating risk for executives", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment in the security community — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch so visibility survives incidents", format: "Planning" },
    ],
    growth_tactics: [
      "Cut through FUD with grounded assessments — the signal a fear-saturated space needs.",
      "Turn sanitized findings into teaching content that proves real work.",
      "Translate risk into business terms to prove executive-level operating.",
      "Batch so visibility holds through incident-heavy, on-call stretches.",
      "Pin a practical-defense carousel practitioners actually use.",
    ],
    common_strategy_mistakes: [
      "Amplifying FUD like the vendors. Fix: offer calm, precise analysis.",
      "Recycling headlines. Fix: share sanitized real findings.",
      "Staying purely technical. Fix: translate risk into business terms.",
      "Going dark during incidents. Fix: batch ahead.",
    ],
  },
  "financial-advisors": {
    ideal_audience:
      "People with the specific money concern you address who are cautious, wary of finance hype, and decide on an advisor slowly. You're building trust through calm, educational content — keeping everything on the right side of compliance so your expertise actually reaches people.",
    strategy_pillars: [
      {
        pillar: "Education, Not Promises",
        description:
          "Teach concepts without promising returns — how tax-advantaged accounts work, why timing fails, what a real number looks like. Educational content is compliance-friendly and trust-building.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"What your retirement number actually needs to be — the inputs, not a rule of thumb.\"",
      },
      {
        pillar: "Calm in the Panic",
        description:
          "Offer perspective when markets drop. Being the steady voice when everyone else shouts is exactly when trust is built.",
        post_frequency: "1x per week",
        example_topic:
          "\"The market dropped 8%. Here's why your plan probably shouldn't change.\"",
      },
      {
        pillar: "Money Psychology",
        description:
          "Address behavior — the fear, the avoidance, the panic-selling. Behavior drives outcomes far more than picks.",
        post_frequency: "1x per week",
        example_topic:
          "\"He sold everything in March 2020 and felt brilliant for four weeks.\"",
      },
      {
        pillar: "Debunk Finance Hype",
        description:
          "Counter unregulated influencer noise with grounded truth. This positions you as the credible, calm voice they're not.",
        post_frequency: "1x per week",
        example_topic:
          "\"'Just invest in index funds' is incomplete. Here's what comes first.\"",
      },
      {
        pillar: "Advisor POV",
        description:
          "Take clear (compliant) positions on planning and behavior. A distinct voice builds credibility.",
        post_frequency: "1x per week",
        example_topic:
          "\"The cost of waiting for the 'right time' to invest is almost always the time itself.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Advisor POV", topic_idea: "A compliant position on planning", format: "Caption" },
      { day: "Tuesday", content_type: "Education, Not Promises", topic_idea: "A concept explained, no promises", format: "Carousel" },
      { day: "Wednesday", content_type: "Money Psychology", topic_idea: "The behavior side of money", format: "Carousel" },
      { day: "Thursday", content_type: "Debunk Finance Hype", topic_idea: "Counter influencer noise", format: "Caption" },
      { day: "Friday", content_type: "Calm in the Panic", topic_idea: "Perspective on market moves", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply to comments — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch and route through compliance review", format: "Planning" },
    ],
    growth_tactics: [
      "Keep content educational so compliance is a quick check and expertise reaches people.",
      "Offer calm perspective in market panic — exactly when trust is built.",
      "Address money psychology, since behavior drives outcomes more than picks.",
      "Stay present across the long window in which someone chooses an advisor.",
      "Pin an educational carousel so a cautious visitor sees a steady, credible guide.",
    ],
    common_strategy_mistakes: [
      "Not posting at all out of compliance fear. Fix: keep it educational and route through review.",
      "Chasing hype like influencers. Fix: be the calm, credible voice.",
      "Only teaching math, never behavior. Fix: address money psychology.",
      "Going silent in market panic. Fix: show up with perspective.",
    ],
  },
  "wealth-managers": {
    ideal_audience:
      "Affluent individuals facing sophisticated complexity — liquidity events, concentrated stock, estate planning, multi-generational wealth — who dismiss generic money advice. You're building credibility with a discerning audience through educational depth, kept compliant and understated.",
    strategy_pillars: [
      {
        pillar: "Sophisticated Complexity",
        description:
          "Address the complexity only your clients face — concentrated positions, liquidity events, tax-efficient giving. This separates you from mass-market finance content.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"Your biggest risk isn't the market. It's 70% of your net worth in one stock.\"",
      },
      {
        pillar: "Educational Depth",
        description:
          "Teach a complex strategy clearly without promises. Depth on genuinely hard topics makes a sophisticated prospect think you understand their situation.",
        post_frequency: "1x per week",
        example_topic:
          "\"Thinking about a concentrated position — the emotional trap and the structures.\"",
      },
      {
        pillar: "The Human Side of Wealth",
        description:
          "Talk about family, purpose, legacy. This shows you see clients as people, not portfolios.",
        post_frequency: "1x per week",
        example_topic:
          "\"The liquidity event felt like the finish line. The hard question came 18 months later.\"",
      },
      {
        pillar: "Calm Perspective",
        description:
          "Offer steadiness through volatility. For significant wealth, a calm, disciplined voice is deeply reassuring.",
        post_frequency: "1x per week",
        example_topic:
          "\"Volatility feels different at nine figures. Here's the discipline that holds.\"",
      },
      {
        pillar: "Wealth POV",
        description:
          "Take clear (compliant) positions on wealth strategy. A distinct voice builds trust with the affluent.",
        post_frequency: "1x per week",
        example_topic:
          "\"Chasing returns is a middle-class instinct. Preserving optionality is the wealthy one.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Wealth POV", topic_idea: "A compliant position on wealth strategy", format: "Caption" },
      { day: "Tuesday", content_type: "Sophisticated Complexity", topic_idea: "A concern only your clients have", format: "Carousel" },
      { day: "Wednesday", content_type: "Educational Depth", topic_idea: "A complex strategy explained", format: "Carousel" },
      { day: "Thursday", content_type: "The Human Side of Wealth", topic_idea: "Family, purpose, legacy", format: "Caption" },
      { day: "Friday", content_type: "Calm Perspective", topic_idea: "Steadiness through volatility", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply to comments — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch and route through compliance review", format: "Planning" },
    ],
    growth_tactics: [
      "Address sophisticated complexity to separate yourself from mass-market content.",
      "Show the human side of wealth so clients feel seen as people.",
      "Keep content educational so compliance is a quick check.",
      "Stay present across the years-long window in which affluent clients decide.",
      "Pin a depth carousel so a sophisticated visitor sees you understand their situation.",
    ],
    common_strategy_mistakes: [
      "Generic money advice a sophisticated audience dismisses. Fix: address real complexity.",
      "Portfolio-only content. Fix: show the human side of wealth.",
      "Loud, hype-y presentation. Fix: keep it understated and discreet.",
      "Compliance paralysis. Fix: keep it educational and reviewed.",
    ],
  },
  "accountants": {
    ideal_audience:
      "Business owners and individuals with the specific money questions you answer daily, who find accounting anxiety-inducing and are looking for a calm, human guide. You're building trust by turning private advice into public clarity so you compete on expertise, not price and proximity.",
    strategy_pillars: [
      {
        pillar: "Answer the Common Questions",
        description:
          "Turn the questions clients ask every day into posts. If one client asks, hundreds are wondering the same thing.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The expense category most freelancers forget — costing them ~£1,800 a year.\"",
      },
      {
        pillar: "Lead with the Money",
        description:
          "Lead with what's at stake, not dry compliance language. This makes a busy owner stop scrolling.",
        post_frequency: "1x per week",
        example_topic:
          "\"You could be overpaying tax by thousands. Here's the structure most miss.\"",
      },
      {
        pillar: "Make It Understandable",
        description:
          "Turn one rule into a genuinely clear explainer — structuring for tax, records that matter, reading a P&L. When it clicks, they trust you with the whole picture.",
        post_frequency: "1x per week",
        example_topic:
          "\"Reading your own P&L — the three numbers that matter and the one everyone misreads.\"",
      },
      {
        pillar: "Calm the Anxiety",
        description:
          "Be the judgment-free voice in a subject that triggers stress and shame. This differentiates you from the stereotype.",
        post_frequency: "1x per week",
        example_topic:
          "\"She avoided her books for 8 months. The bill was smaller than the avoidance cost.\"",
      },
      {
        pillar: "Accounting POV",
        description:
          "Take clear positions on money and business finances. A distinct, human voice builds trust.",
        post_frequency: "1x per week",
        example_topic:
          "\"Your accountant should save you more than they cost. If they don't, that's the problem.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Accounting POV", topic_idea: "A clear position on business finances", format: "Caption" },
      { day: "Tuesday", content_type: "Answer the Common Questions", topic_idea: "A question you answer daily", format: "Carousel" },
      { day: "Wednesday", content_type: "Make It Understandable", topic_idea: "A rule explained clearly", format: "Carousel" },
      { day: "Thursday", content_type: "Lead with the Money", topic_idea: "What's at stake, plainly", format: "Caption" },
      { day: "Friday", content_type: "Calm the Anxiety", topic_idea: "A judgment-free, human story", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply to owners' comments — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch ahead of busy season", format: "Planning" },
    ],
    growth_tactics: [
      "Turn daily client questions into posts that reach hundreds wondering the same thing.",
      "Lead with the money at stake, not compliance language, so busy owners stop.",
      "Be the calm, judgment-free voice that differentiates you from the stereotype.",
      "Batch ahead of tax season so your feed runs when you're busiest.",
      "Pin an explainer that shows you can make accounting click.",
    ],
    common_strategy_mistakes: [
      "Dry compliance language nobody reads. Fix: lead with the money.",
      "Competing on price and proximity. Fix: build visible expertise.",
      "Going dark in busy season. Fix: batch ahead.",
      "Adding to money anxiety. Fix: be the calm, human voice.",
    ],
  },
  "tax-consultants": {
    ideal_audience:
      "People and businesses with the specific tax situation you specialize in, searching for a specialist while misinformation costs them thousands. You're building findability and trust by turning confusions into clarity before those costly mistakes happen.",
    strategy_pillars: [
      {
        pillar: "Prevent Costly Mistakes",
        description:
          "Turn the confusions you correct daily into clarity posts. Preventing a costly error earns enormous trust and a likely client.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The tax rule that catches out 80% of property investors — usually too late.\"",
      },
      {
        pillar: "Money & Deadlines",
        description:
          "Lead with what's at stake or a looming deadline. This creates the urgency dry framing never does.",
        post_frequency: "1x per week",
        example_topic:
          "\"He followed forum advice for 3 years. It was right — for a different country.\"",
      },
      {
        pillar: "Demystify a Rule",
        description:
          "Turn one intimidating rule into a clear explainer — a relief, a liability trigger, proper structuring. Clarity is rare and valuable.",
        post_frequency: "1x per week",
        example_topic:
          "\"The relief most people miss — who qualifies and the timing trap.\"",
      },
      {
        pillar: "Cut Through Misinformation",
        description:
          "Counter the tax myths that cost people money. This positions you as credible signal.",
        post_frequency: "1x per week",
        example_topic:
          "\"'You can claim that' — the internet advice that triggers an audit.\"",
      },
      {
        pillar: "Tax POV",
        description:
          "Take clear positions on your specialty. A distinct voice makes you findable and trusted.",
        post_frequency: "1x per week",
        example_topic:
          "\"Most people overpay tax not from mistakes, but from not knowing what to ask.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Tax POV", topic_idea: "A clear position on your specialty", format: "Caption" },
      { day: "Tuesday", content_type: "Prevent Costly Mistakes", topic_idea: "A confusion corrected into clarity", format: "Carousel" },
      { day: "Wednesday", content_type: "Demystify a Rule", topic_idea: "An intimidating rule explained", format: "Carousel" },
      { day: "Thursday", content_type: "Money & Deadlines", topic_idea: "What's at stake or a deadline", format: "Caption" },
      { day: "Friday", content_type: "Cut Through Misinformation", topic_idea: "Counter a costly tax myth", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply to comments — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch ahead of filing season", format: "Planning" },
    ],
    growth_tactics: [
      "Turn confusions you correct privately into clarity that reaches thousands.",
      "Lead with money at stake or a deadline to create real urgency.",
      "Cut through misinformation to position yourself as credible signal.",
      "Own a specific tax situation so searchers can find you.",
      "Batch ahead of filing season so your feed runs when attention peaks.",
    ],
    common_strategy_mistakes: [
      "Dry framing with no urgency. Fix: lead with money and deadlines.",
      "Being a generalist. Fix: own a specific tax situation.",
      "Going dark at deadline season. Fix: batch ahead.",
      "Ignoring the misinformation. Fix: be the credible correction.",
    ],
  },
  "investment-advisors": {
    ideal_audience:
      "Cautious investors wary of hype who decide on an advisor slowly, plus those quietly panicking during volatility. You're building trust as the steady, educational voice while financial media manufactures constant alarm — kept compliant throughout.",
    strategy_pillars: [
      {
        pillar: "Educate, Don't Predict",
        description:
          "Teach principles free of predictions — why diversification works, how fees compound, why timing fails. This builds lasting trust and stays compliant.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"How fees compound against you — the small number and the 30-year math.\"",
      },
      {
        pillar: "Perspective in Panic",
        description:
          "Counter market alarm with steadiness. Being the calm voice when media shouts is when trust is built.",
        post_frequency: "1x per week",
        example_topic:
          "\"The market dropped 8%. Here's why your plan probably shouldn't change.\"",
      },
      {
        pillar: "Investor Psychology",
        description:
          "Address behavior — panic-selling, timing, chasing returns. Behavior drives returns far more than picks.",
        post_frequency: "1x per week",
        example_topic:
          "\"We write the plan before the panic, not during it. Here's why.\"",
      },
      {
        pillar: "Discipline Over Hype",
        description:
          "Counter the screaming-green-chart culture with disciplined truth. This signals you're a fiduciary, not a speculator.",
        post_frequency: "1x per week",
        example_topic:
          "\"The boring portfolio beat the exciting one again. It usually does.\"",
      },
      {
        pillar: "Investor POV",
        description:
          "Take clear (compliant) positions on investing behavior and strategy. A distinct voice builds credibility.",
        post_frequency: "1x per week",
        example_topic:
          "\"Time in the market beats timing the market — and here's the data, not a slogan.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Investor POV", topic_idea: "A compliant position on investing", format: "Caption" },
      { day: "Tuesday", content_type: "Educate, Don't Predict", topic_idea: "A principle explained, no predictions", format: "Carousel" },
      { day: "Wednesday", content_type: "Investor Psychology", topic_idea: "The behavior side of investing", format: "Carousel" },
      { day: "Thursday", content_type: "Discipline Over Hype", topic_idea: "Counter the hype culture", format: "Caption" },
      { day: "Friday", content_type: "Perspective in Panic", topic_idea: "Steadiness on a market move", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply to comments — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch and route through compliance review", format: "Planning" },
    ],
    growth_tactics: [
      "Keep content educational and prediction-free so compliance is a quick check.",
      "Offer perspective in market panic — exactly when trust is built.",
      "Address investor psychology, since behavior drives returns.",
      "Stay present across the long, cautious decision to choose an advisor.",
      "Pin an educational carousel so a cautious visitor sees a disciplined guide.",
    ],
    common_strategy_mistakes: [
      "Staying silent from compliance fear. Fix: keep it educational and reviewed.",
      "Amplifying alarm like the media. Fix: be the steady voice.",
      "Only discussing markets, never behavior. Fix: address psychology.",
      "Hype-y presentation. Fix: signal discipline and fiduciary care.",
    ],
  },
  "personal-trainers": {
    ideal_audience:
      "Busy professionals and beginners who want a specific outcome — energy, a pain-free back, confidence — and have failed generic plans or feel intimidated by gyms. You're building trust with the person who's nervous and previously failed, so your empathetic, outcome-led presence wins them over.",
    strategy_pillars: [
      {
        pillar: "Outcome, Not Exercise",
        description:
          "Lead with the life outcome your client wants, not the movement. This attracts buyers instead of free-content collectors.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"He didn't need motivation. He needed a workout that fit between the school run and work.\"",
      },
      {
        pillar: "Real Fixes",
        description:
          "Give a genuinely useful fix — desk posture, training around a bad knee, a habit that survives a busy week. When it reduces pain, they believe your coaching.",
        post_frequency: "1x per week",
        example_topic:
          "\"The desk posture fix that isn't stretching — why stretching makes it worse.\"",
      },
      {
        pillar: "Empathy, Not Shame",
        description:
          "Name the real-life problem without shaming. 'No excuses' repels the exact people who need a trainer most.",
        post_frequency: "1x per week",
        example_topic:
          "\"You're not lazy. Your plan assumed a week you don't actually have.\"",
      },
      {
        pillar: "Sustainable Habits",
        description:
          "Teach keepable habits over extreme transformations. This attracts people who want results they can sustain.",
        post_frequency: "1x per week",
        example_topic:
          "\"The 22-minute workout that survives a stressful month.\"",
      },
      {
        pillar: "Behind-the-Scenes",
        description:
          "Show your own honest training and rest. This models a sustainable relationship with fitness and builds trust.",
        post_frequency: "1x per week",
        example_topic:
          "\"I skipped 3 sessions this week. Here's why that's the plan working.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Outcome, Not Exercise", topic_idea: "Lead with the life outcome", format: "Carousel" },
      { day: "Tuesday", content_type: "Real Fix", topic_idea: "A useful fix that reduces pain", format: "Carousel" },
      { day: "Wednesday", content_type: "Sustainable Habits", topic_idea: "A keepable habit", format: "Caption" },
      { day: "Thursday", content_type: "Empathy, Not Shame", topic_idea: "Reframe a failure without shame", format: "Caption" },
      { day: "Friday", content_type: "Behind-the-Scenes", topic_idea: "Your own honest training/rest", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply to nervous beginners — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch around your split shifts", format: "Planning" },
    ],
    growth_tactics: [
      "Lead with the outcome, not the exercise, to attract buyers over content collectors.",
      "Give a real fix that reduces someone's pain to build trust fast.",
      "Lead with empathy so a previously-failed client finally reaches out.",
      "Batch around split shifts so your feed stays consistent.",
      "Pin an outcome-led carousel so a nervous visitor sees it's for them.",
    ],
    common_strategy_mistakes: [
      "Posting workout clips that attract other fitness people. Fix: lead with outcomes.",
      "'No excuses' shaming. Fix: lead with empathy.",
      "Selling extreme transformations. Fix: teach sustainable habits.",
      "Inconsistency from a fragmented schedule. Fix: batch around your shifts.",
    ],
  },
  "nutritionists": {
    ideal_audience:
      "People confused by diet misinformation and burned by fad diets who want an evidence-based, non-judgmental guide. You're building trust as the credible voice that competes with constantly-posting supplement sellers by making real science accessible.",
    strategy_pillars: [
      {
        pillar: "Myth-Busting with Evidence",
        description:
          "Counter fad diets and supplement noise with the actual science, warmly. This is what reaches the confused, discouraged reader.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"You don't need to detox. Your liver's been doing it free since birth.\"",
      },
      {
        pillar: "Free the Reader from a Rule",
        description:
          "Bust a restrictive belief without shaming. Your audience was misled, not stupid.",
        post_frequency: "1x per week",
        example_topic:
          "\"She cut six food groups chasing an energy problem. It was iron.\"",
      },
      {
        pillar: "Make Science Usable",
        description:
          "Turn nuanced science into a usable takeaway — what affects energy, how protein really works, why restriction backfires. Accessible evidence earns trust.",
        post_frequency: "1x per week",
        example_topic:
          "\"Why restriction backfires — the mechanism and the sustainable alternative.\"",
      },
      {
        pillar: "Food Peace, Not Rules",
        description:
          "Champion a healthy relationship with food over diet culture. This differentiates you entirely.",
        post_frequency: "1x per week",
        example_topic:
          "\"There are no 'bad' foods. Here's what actually determines your health.\"",
      },
      {
        pillar: "Nutrition POV",
        description:
          "Take clear, evidence-based positions. A distinct, credible voice cuts through hype.",
        post_frequency: "1x per week",
        example_topic:
          "\"Most 'superfoods' are marketing. Here's what actually moves the needle.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Nutrition POV", topic_idea: "An evidence-based position", format: "Caption" },
      { day: "Tuesday", content_type: "Myth-Busting with Evidence", topic_idea: "Debunk a diet myth warmly", format: "Carousel" },
      { day: "Wednesday", content_type: "Make Science Usable", topic_idea: "Nuanced science made usable", format: "Carousel" },
      { day: "Thursday", content_type: "Food Peace, Not Rules", topic_idea: "A healthy relationship with food", format: "Caption" },
      { day: "Friday", content_type: "Free the Reader from a Rule", topic_idea: "Bust a restrictive belief", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply to confused readers — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch so you can compete with daily posters", format: "Planning" },
    ],
    growth_tactics: [
      "Bust myths warmly, not condescendingly — your audience was misled, not stupid.",
      "Make real science usable so evidence beats miracle claims.",
      "Champion food peace to differentiate from diet culture.",
      "Batch so your evidence-based voice can compete with constantly-posting influencers.",
      "Pin a myth-busting carousel so a burned visitor sees a credible guide.",
    ],
    common_strategy_mistakes: [
      "Being drowned out by posting too rarely. Fix: batch for daily-level presence.",
      "Condescending myth-busting. Fix: free readers warmly.",
      "Pushing rules like diet culture. Fix: champion food peace.",
      "Dry science with no takeaway. Fix: make it usable.",
    ],
  },
  "yoga-instructors": {
    ideal_audience:
      "Stiff, stressed people who believe yoga isn't for them, plus students seeking depth beyond a workout. You're building a welcoming presence that reaches the large, underserved audience yoga's aspirational aesthetic usually excludes.",
    strategy_pillars: [
      {
        pillar: "Lower the Barrier",
        description:
          "Welcome the intimidated rather than impress practitioners. Most yoga content quietly excludes the exact people who'd benefit most.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"You don't need to touch your toes to start yoga. That's not the point.\"",
      },
      {
        pillar: "Practical Guidance",
        description:
          "Give a usable practice — modifying a pose for tight hips, 5 minutes for desk workers, breathing through stress. Real guidance that eases pain makes them want your class.",
        post_frequency: "1x per week",
        example_topic:
          "\"5 minutes for a desk-bound back — what's actually tight and the modification.\"",
      },
      {
        pillar: "Philosophy Beneath the Poses",
        description:
          "Share the mindset and philosophy, not just postures. This attracts students seeking depth.",
        post_frequency: "1x per week",
        example_topic:
          "\"Yoga was never about the pose. Here's what it's actually training.\"",
      },
      {
        pillar: "Welcoming Stories",
        description:
          "Share a nervous beginner's journey. These reassure the person convinced they'd be the worst in the room.",
        post_frequency: "1x per week",
        example_topic:
          "\"He came convinced he'd be the worst in the room. He was — and his back pain's gone.\"",
      },
      {
        pillar: "Yoga POV",
        description:
          "Take clear, inclusive positions. A distinct, warm voice sets you apart.",
        post_frequency: "1x per week",
        example_topic:
          "\"The 'perfect pose' is a myth that keeps beginners out. Let's retire it.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Yoga POV", topic_idea: "An inclusive position", format: "Caption" },
      { day: "Tuesday", content_type: "Practical Guidance", topic_idea: "A usable practice", format: "Carousel" },
      { day: "Wednesday", content_type: "Philosophy Beneath the Poses", topic_idea: "The mindset behind the practice", format: "Carousel" },
      { day: "Thursday", content_type: "Lower the Barrier", topic_idea: "Welcome the intimidated", format: "Caption" },
      { day: "Friday", content_type: "Welcoming Story", topic_idea: "A nervous beginner's journey", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply to beginners — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch across your studio schedule", format: "Planning" },
    ],
    growth_tactics: [
      "Lower the barrier to reach the huge audience who believes yoga isn't for them.",
      "Give practical guidance that eases pain so people want your class.",
      "Share the philosophy to attract students seeking depth.",
      "Batch across a fragmented multi-studio schedule.",
      "Pin a welcoming carousel so a nervous visitor feels it's for them.",
    ],
    common_strategy_mistakes: [
      "Aspirational content that excludes the stiff and nervous. Fix: lower the barrier.",
      "Only impressing practitioners. Fix: help struggling beginners.",
      "Poses with no philosophy. Fix: share the mindset.",
      "Inconsistency across studios. Fix: batch.",
    ],
  },
  "meditation-coaches": {
    ideal_audience:
      "Stressed, skeptical professionals who assume meditation is woo and have quit after a few days. You're building credibility as a grounded, practical guide who reaches overwhelmed people where they are.",
    strategy_pillars: [
      {
        pillar: "Meet the Skeptic",
        description:
          "Reframe meditation as a practical skill, not a spiritual demand. This reaches the overwhelmed professional who's skeptical of anything mystical.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"You don't need to empty your mind. That's not what meditation is.\"",
      },
      {
        pillar: "Real Practices",
        description:
          "Give a usable practice — a 2-minute reset, a technique for racing thoughts. When it calms someone, they trust your guidance.",
        post_frequency: "1x per week",
        example_topic:
          "\"For a mind that won't slow down — the 2-minute technique that actually works.\"",
      },
      {
        pillar: "Reframe 'Failure'",
        description:
          "Show that a wandering mind is the practice, not failure. This keeps people going who'd otherwise quit.",
        post_frequency: "1x per week",
        example_topic:
          "\"You're not bad at meditation. Noticing the wandering IS the practice.\"",
      },
      {
        pillar: "Grounded, Not Mystical",
        description:
          "Anchor your work in practical benefit, not mysticism. This sets you apart from the woo.",
        post_frequency: "1x per week",
        example_topic:
          "\"Meditation isn't about bliss. It's about noticing sooner when you're spiraling.\"",
      },
      {
        pillar: "Meditation POV",
        description:
          "Take clear, grounded positions. A distinct, credible voice reaches skeptics.",
        post_frequency: "1x per week",
        example_topic:
          "\"Meditation apps made you dependent on a voice. Here's how to actually practice.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Meditation POV", topic_idea: "A grounded position", format: "Caption" },
      { day: "Tuesday", content_type: "Meet the Skeptic", topic_idea: "Reframe meditation as a skill", format: "Carousel" },
      { day: "Wednesday", content_type: "Real Practice", topic_idea: "A usable practice", format: "Carousel" },
      { day: "Thursday", content_type: "Reframe 'Failure'", topic_idea: "Wandering mind is the practice", format: "Caption" },
      { day: "Friday", content_type: "Grounded, Not Mystical", topic_idea: "Practical benefit, not mysticism", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply to skeptics — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week", format: "Planning" },
    ],
    growth_tactics: [
      "Reframe meditation as a skill to reach stressed skeptics, not just the converted.",
      "Give a real practice that genuinely calms someone.",
      "Ground content in practical benefit to set you apart from the woo.",
      "Stay present for the slow decision to try meditation.",
      "Pin a practice carousel so a skeptical visitor gets immediate relief.",
    ],
    common_strategy_mistakes: [
      "Sounding mystical to skeptics. Fix: reframe as a practical skill.",
      "Preaching to the converted. Fix: meet the overwhelmed skeptic.",
      "No usable practice. Fix: give real techniques.",
      "Sporadic posting. Fix: batch for consistency.",
    ],
  },
  "mental-health-coaches": {
    ideal_audience:
      "People quietly struggling in ways they can't name — within your clear coaching scope — who are wary of judgment. You're building trust with people making a personal decision slowly, through compassionate, responsibly-framed content.",
    strategy_pillars: [
      {
        pillar: "Name What They Feel",
        description:
          "Put words to what people feel but can't name, within scope. Precision and responsible framing make content resonant and safe.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"High-functioning anxiety looks like being early, over-prepared, and quietly exhausted.\"",
      },
      {
        pillar: "Real Coping Tools",
        description:
          "Give a usable tool — grounding a spiral, a boundary script, recognizing burnout early. A helpful tool proves substance and eases someone's day.",
        post_frequency: "1x per week",
        example_topic:
          "\"When your thoughts start spiraling — the grounding technique and the early sign.\"",
      },
      {
        pillar: "De-Stigmatize",
        description:
          "Normalize the struggle compassionately. This makes a quietly-suffering reader feel safe.",
        post_frequency: "1x per week",
        example_topic:
          "\"She thought she was lazy. She was depleted. Those look identical from the inside.\"",
      },
      {
        pillar: "Stay in Scope",
        description:
          "Keep content clearly within coaching bounds, not clinical treatment. This keeps it helpful and responsible.",
        post_frequency: "1x per week",
        example_topic:
          "\"What coaching can help with — and when to see a therapist instead.\"",
      },
      {
        pillar: "Mental Wellbeing POV",
        description:
          "Take clear, responsible positions on everyday mental wellbeing. A distinct voice builds trust.",
        post_frequency: "1x per week",
        example_topic:
          "\"Productivity culture is a mental health issue nobody's naming.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Mental Wellbeing POV", topic_idea: "A responsible position", format: "Caption" },
      { day: "Tuesday", content_type: "Name What They Feel", topic_idea: "Put words to an unnamed feeling", format: "Carousel" },
      { day: "Wednesday", content_type: "Real Coping Tool", topic_idea: "A usable tool, within scope", format: "Carousel" },
      { day: "Thursday", content_type: "De-Stigmatize", topic_idea: "Normalize a struggle compassionately", format: "Caption" },
      { day: "Friday", content_type: "Stay in Scope", topic_idea: "Clarify what coaching helps with", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply gently to comments — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week", format: "Planning" },
    ],
    growth_tactics: [
      "Name what people feel but can't articulate so they feel seen and safe.",
      "Give a real coping tool that eases someone's day and proves substance.",
      "Stay clearly within coaching scope so content is helpful and responsible.",
      "Stay present through the slow decision to seek support.",
      "Pin a coping-tool carousel so a struggling visitor gets immediate help.",
    ],
    common_strategy_mistakes: [
      "Generic wellness content. Fix: name specific feelings and give real tools.",
      "Blurring coaching and clinical treatment. Fix: stay clearly in scope.",
      "Judgmental framing. Fix: lead with compassion.",
      "Sporadic posting. Fix: batch for steady presence.",
    ],
  },
  "therapists": {
    ideal_audience:
      "People considering therapy for the first time and those curious about their own patterns, reached through general psychoeducation within strict ethical bounds. You're building trust and reducing stigma so a nervous person feels safe enticing.",
    strategy_pillars: [
      {
        pillar: "Psychoeducation",
        description:
          "Teach general, non-diagnostic concepts — never about specific clients. Responsible framing lets you educate safely.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"Why we repeat patterns — familiar and safe feel identical to a nervous system.\"",
      },
      {
        pillar: "Normalize the Experience",
        description:
          "Normalize difficult experiences without diagnosing or promising. This reduces the fear that keeps people from reaching out.",
        post_frequency: "1x per week",
        example_topic:
          "\"Feeling nothing isn't the absence of emotion. Sometimes it's protection.\"",
      },
      {
        pillar: "Make Psychology Accessible",
        description:
          "Turn a concept into a clear explainer — how anxiety works, what a boundary is, why we self-sabotage. This builds trust and lowers the barrier to help.",
        post_frequency: "1x per week",
        example_topic:
          "\"What a boundary actually is — the misconception and the real definition.\"",
      },
      {
        pillar: "Reduce Stigma",
        description:
          "Frame therapy as normal and worthwhile. This serves both your practice and the public.",
        post_frequency: "1x per week",
        example_topic:
          "\"You don't have to be in crisis to benefit from therapy. Here's the quieter reason people go.\"",
      },
      {
        pillar: "Therapist POV",
        description:
          "Take clear, ethical positions on mental health and the field. A distinct, responsible voice builds trust.",
        post_frequency: "1x per week",
        example_topic:
          "\"'Just think positive' is why people feel worse. Here's what actually helps.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Therapist POV", topic_idea: "An ethical position on mental health", format: "Caption" },
      { day: "Tuesday", content_type: "Psychoeducation", topic_idea: "A general, non-diagnostic concept", format: "Carousel" },
      { day: "Wednesday", content_type: "Make Psychology Accessible", topic_idea: "A concept explained clearly", format: "Carousel" },
      { day: "Thursday", content_type: "Normalize the Experience", topic_idea: "Normalize a difficult experience", format: "Caption" },
      { day: "Friday", content_type: "Reduce Stigma", topic_idea: "Frame therapy as normal", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply gently to comments — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week's content", format: "Planning" },
    ],
    growth_tactics: [
      "Teach general psychoeducation — never about a client — so you educate ethically.",
      "Normalize difficult experiences to reduce the fear that stops people reaching out.",
      "Make psychology accessible to build trust and lower the barrier to help.",
      "Batch so a full caseload doesn't mean your practice's visibility disappears.",
      "Pin a psychoeducation carousel so a nervous visitor feels safe and understood.",
    ],
    common_strategy_mistakes: [
      "Hesitating over the ethical line and posting nothing. Fix: keep it general and non-diagnostic.",
      "Diagnosing or promising outcomes. Fix: normalize and educate.",
      "Clinical, inaccessible language. Fix: make psychology clear.",
      "Sporadic posting. Fix: batch for steady presence.",
    ],
  },
  "psychologists": {
    ideal_audience:
      "A public drowning in pop-psychology myths, plus fellow professionals and decision-makers who value real research. You're building authority by bringing credentialed rigor to a noisy conversation.",
    strategy_pillars: [
      {
        pillar: "Correct the Myths",
        description:
          "Debunk pop-psychology with real evidence. Authoritative and highly shareable where oversimplification dominates.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The left-brain/right-brain personality thing isn't a simplification. It's false.\"",
      },
      {
        pillar: "Rigorous but Accessible",
        description:
          "Explain a concept without dumbing it down — how memory works, what motivation research shows. Bridging science and the public builds rare authority.",
        post_frequency: "1x per week",
        example_topic:
          "\"How memory actually works — and why your confident recollection is often wrong.\"",
      },
      {
        pillar: "Honest Nuance",
        description:
          "Be honest about uncertainty and what the research does and doesn't say. This builds trust and models good science.",
        post_frequency: "1x per week",
        example_topic:
          "\"'Trauma' has been stretched to mean anything bad. Here's what the research says.\"",
      },
      {
        pillar: "Real-World Relevance",
        description:
          "Connect research to everyday life. This makes your expertise matter beyond academia.",
        post_frequency: "1x per week",
        example_topic:
          "\"What decades of habit research means for the resolution you'll break in February.\"",
      },
      {
        pillar: "Psychology POV",
        description:
          "Take grounded positions on the field and public understanding. A credentialed voice cuts through noise.",
        post_frequency: "1x per week",
        example_topic:
          "\"Most 'science-backed' advice online cites studies that don't say what they claim.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Psychology POV", topic_idea: "A grounded position on the field", format: "Caption" },
      { day: "Tuesday", content_type: "Correct the Myths", topic_idea: "Debunk a pop-psych myth with evidence", format: "Carousel" },
      { day: "Wednesday", content_type: "Rigorous but Accessible", topic_idea: "A concept explained without dumbing down", format: "Carousel" },
      { day: "Thursday", content_type: "Honest Nuance", topic_idea: "What the research does and doesn't say", format: "Caption" },
      { day: "Friday", content_type: "Real-World Relevance", topic_idea: "Research applied to everyday life", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment in the field — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch without stealing research time", format: "Planning" },
    ],
    growth_tactics: [
      "Correct widely-misused studies with authority — a public service that's highly shareable.",
      "Make hard ideas legible without dumbing them down to build a public profile.",
      "Be honest about nuance to build trust and model good science.",
      "Batch so contributing doesn't cost clinical or research time.",
      "Pin an accessible explainer that reaches beyond your paper-readers.",
    ],
    common_strategy_mistakes: [
      "Dense academic writing nobody reads. Fix: make it accessible.",
      "Leaving the field to pop-psych accounts. Fix: bring credentialed rigor.",
      "Overclaiming to seem punchy. Fix: keep honest nuance.",
      "Staying invisible outside academia. Fix: build a public profile.",
    ],
  },
  "online-course-creators": {
    ideal_audience:
      "The learners your course serves — people with the specific problem you solve — who you help and warm toward buying. You're building an audience between launches so your next launch starts warm, not cold.",
    strategy_pillars: [
      {
        pillar: "Teach a Real Lesson",
        description:
          "Give away a genuine piece of your curriculum. When free content teaches something real, people trust the paid version.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The entire framework from module 1 of my course — free.\"",
      },
      {
        pillar: "Value-First Samples",
        description:
          "Demonstrate your teaching quality. A prospect who learns from your carousel has effectively sampled your course.",
        post_frequency: "1x per week",
        example_topic:
          "\"The one thing my students master in week one that changes everything.\"",
      },
      {
        pillar: "Speak to the Struggle",
        description:
          "Name the specific problem your course solves. This attracts the exact person who needs it.",
        post_frequency: "1x per week",
        example_topic:
          "\"You've bought 6 courses and finished none. It's not discipline.\"",
      },
      {
        pillar: "Results & Proof",
        description:
          "Share student wins (with permission). This proves your course delivers.",
        post_frequency: "1x per week",
        example_topic:
          "\"A student went from zero to their first paying client in 6 weeks. Here's how.\"",
      },
      {
        pillar: "Teaching POV",
        description:
          "Take positions on how people actually learn your topic. A distinct voice builds authority.",
        post_frequency: "1x per week",
        example_topic:
          "\"Most courses are built to be bought, not completed. Mine is the opposite.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Teaching POV", topic_idea: "A position on how people learn your topic", format: "Caption" },
      { day: "Tuesday", content_type: "Teach a Real Lesson", topic_idea: "A genuine lesson from your curriculum", format: "Carousel" },
      { day: "Wednesday", content_type: "Value-First Sample", topic_idea: "A carousel that samples your teaching", format: "Carousel" },
      { day: "Thursday", content_type: "Speak to the Struggle", topic_idea: "Name the problem your course solves", format: "Caption" },
      { day: "Friday", content_type: "Results & Proof", topic_idea: "A student win", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply to learners — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch to keep your audience warm between launches", format: "Planning" },
    ],
    growth_tactics: [
      "Give away genuine lessons — the counterintuitive engine of course sales.",
      "Make free content a true sample of your teaching quality.",
      "Build an audience between launches so the next launch starts warm.",
      "Share student wins to prove your course delivers.",
      "Pin a value-first carousel so a visitor samples your course.",
    ],
    common_strategy_mistakes: [
      "Only posting during launches, so your list goes cold. Fix: build an audience continuously.",
      "Withholding value to protect the course. Fix: give real lessons — it drives sales.",
      "Vague content that samples nothing. Fix: teach real curriculum.",
      "No proof. Fix: share student wins.",
    ],
  },
  "edtech-founders": {
    ideal_audience:
      "Skeptical educators and institutions who adopt slowly, plus mission-driven talent and patient investors. You're building credibility by showing you understand real learning, not just software.",
    strategy_pillars: [
      {
        pillar: "Understand Learning",
        description:
          "Lead with genuine insight about how people learn, not a product pitch. Educators detect sales instantly; pedagogy earns their trust.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"Most edtech optimizes for engagement metrics that have nothing to do with learning.\"",
      },
      {
        pillar: "Build Lessons",
        description:
          "Share the honest reality of building in education. This attracts talent and patient investors who respect the difficulty.",
        post_frequency: "1x per week",
        example_topic:
          "\"We built a feature teachers begged for. Nobody used it. Here's why.\"",
      },
      {
        pillar: "Challenge Ed Assumptions",
        description:
          "Take positions on what actually works in education. This resonates with educators tired of shiny tools.",
        post_frequency: "1x per week",
        example_topic:
          "\"Engagement is the wrong metric. Here's what we measure instead.\"",
      },
      {
        pillar: "Champion Educators",
        description:
          "Celebrate teachers and learners you serve. This builds trust with your core audience.",
        post_frequency: "1x per week",
        example_topic:
          "\"A teacher told us our tool gave her back an hour a day. That's the whole point.\"",
      },
      {
        pillar: "EdTech POV",
        description:
          "Take clear positions on where education technology should go. A distinct voice attracts believers.",
        post_frequency: "1x per week",
        example_topic:
          "\"AI won't replace teachers. It'll expose the edtech that never understood them.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "EdTech POV", topic_idea: "A position on education technology", format: "Caption" },
      { day: "Tuesday", content_type: "Understand Learning", topic_idea: "A genuine insight about how people learn", format: "Carousel" },
      { day: "Wednesday", content_type: "Challenge Ed Assumptions", topic_idea: "What actually works in education", format: "Carousel" },
      { day: "Thursday", content_type: "Build Lessons", topic_idea: "The honest reality of building in ed", format: "Caption" },
      { day: "Friday", content_type: "Champion Educators", topic_idea: "Celebrate a teacher or learner", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on educators' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch through the build cycle", format: "Planning" },
    ],
    growth_tactics: [
      "Lead with pedagogy, not product, to earn skeptical educators' trust.",
      "Share the honest reality of building in ed to attract mission-driven talent.",
      "Demonstrate you understand real learning to stand out from another app.",
      "Batch so credibility-building survives a demanding build cycle.",
      "Pin a learning-insight carousel so educators see a founder who gets it.",
    ],
    common_strategy_mistakes: [
      "Pitching product to educators who detect sales instantly. Fix: lead with learning.",
      "Looking like another app. Fix: prove you understand pedagogy.",
      "Ignoring teachers. Fix: champion them.",
      "Going silent building. Fix: batch.",
    ],
  },
  "corporate-trainers": {
    ideal_audience:
      "L&D leaders and executives who book training and are tired of workshops that change nothing. You're building authority that turns you from a price-competed vendor into a sought-after name.",
    strategy_pillars: [
      {
        pillar: "Why Training Fails",
        description:
          "Reframe why training doesn't stick. A sharper diagnosis signals expertise to buyers tired of one-off workshops.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"90% of training is forgotten in a week — because you delivered it as an event.\"",
      },
      {
        pillar: "Methodology That Sticks",
        description:
          "Show how you make training stick — reinforcement, manager involvement, behavior change over information. This proves substance.",
        post_frequency: "1x per week",
        example_topic:
          "\"Why training doesn't stick, and the reinforcement system that fixes it.\"",
      },
      {
        pillar: "Workplace Insight",
        description:
          "Reframe a common workplace or leadership problem. This positions you as a strategic voice.",
        post_frequency: "1x per week",
        example_topic:
          "\"Your managers weren't promoted for managing. Then you're surprised they can't.\"",
      },
      {
        pillar: "Proof of Change",
        description:
          "Share results from real engagements (anonymized). This proves you drive behavior change, not attendance.",
        post_frequency: "1x per week",
        example_topic:
          "\"Six months after the program, the behavior actually held. Here's what made it.\"",
      },
      {
        pillar: "L&D POV",
        description:
          "Take positions on learning and development. A distinct voice builds a sought-after reputation.",
        post_frequency: "1x per week",
        example_topic:
          "\"Stop measuring training by attendance. Measure it by what changed on the job.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "L&D POV", topic_idea: "A position on learning and development", format: "Caption" },
      { day: "Tuesday", content_type: "Why Training Fails", topic_idea: "A sharp diagnosis of failed training", format: "Carousel" },
      { day: "Wednesday", content_type: "Methodology That Sticks", topic_idea: "How you make training stick", format: "Carousel" },
      { day: "Thursday", content_type: "Workplace Insight", topic_idea: "Reframe a workplace problem", format: "Caption" },
      { day: "Friday", content_type: "Proof of Change", topic_idea: "A real engagement result", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on L&D leaders' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch between engagements", format: "Planning" },
    ],
    growth_tactics: [
      "Reframe why training fails to signal expertise to L&D buyers.",
      "Show your methodology to prove substance over one-off workshops.",
      "Comment on L&D leaders' posts where engagements originate.",
      "Batch between engagements so authority stays visible.",
      "Pin a methodology carousel that shows you drive real change.",
    ],
    common_strategy_mistakes: [
      "Competing on price via RFPs. Fix: build visible authority.",
      "Generic training content. Fix: reframe why training fails.",
      "No proof of behavior change. Fix: share real results.",
      "Going quiet between engagements. Fix: batch.",
    ],
  },
  "professors": {
    ideal_audience:
      "A curious public, prospective students, and peers, plus the grant and institutional world that increasingly values public scholarship. You're building a public profile that reaches far beyond your paper-readers.",
    strategy_pillars: [
      {
        pillar: "Accessible Scholarship",
        description:
          "Translate your research and field for a curious non-specialist without dumbing it down. This reaches far beyond the few who read papers.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"I've studied this for 15 years. The thing everyone gets wrong is intuitive and backwards.\"",
      },
      {
        pillar: "Correct the Record",
        description:
          "Correct widely-misused studies with authority. A public service that's highly shareable.",
        post_frequency: "1x per week",
        example_topic:
          "\"Everyone cites this study to argue the opposite of what it found.\"",
      },
      {
        pillar: "Why It Matters",
        description:
          "Connect scholarship to real life and current debates. This makes your expertise matter beyond academia.",
        post_frequency: "1x per week",
        example_topic:
          "\"What this research means for a decision you'll make this week.\"",
      },
      {
        pillar: "Behind the Research",
        description:
          "Share how research actually works — the surprises, the dead ends. This humanizes scholarship and builds following.",
        post_frequency: "1x per week",
        example_topic:
          "\"Our biggest finding came from an experiment that was supposed to fail.\"",
      },
      {
        pillar: "Scholarly POV",
        description:
          "Take grounded positions in your field. A credentialed voice builds authority.",
        post_frequency: "1x per week",
        example_topic:
          "\"The popular version of my field is a decade behind the actual research.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Scholarly POV", topic_idea: "A grounded position in your field", format: "Caption" },
      { day: "Tuesday", content_type: "Accessible Scholarship", topic_idea: "Your research made accessible", format: "Carousel" },
      { day: "Wednesday", content_type: "Why It Matters", topic_idea: "Research connected to real life", format: "Carousel" },
      { day: "Thursday", content_type: "Correct the Record", topic_idea: "Correct a misused study", format: "Caption" },
      { day: "Friday", content_type: "Behind the Research", topic_idea: "How the research actually happened", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment in your field — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch without stealing research or teaching time", format: "Planning" },
    ],
    growth_tactics: [
      "Make your research accessible to reach far beyond your paper's readers.",
      "Correct misused studies with authority — a shareable public service.",
      "Connect scholarship to real life so it matters beyond academia.",
      "Batch so public scholarship doesn't steal from research or teaching.",
      "Pin an accessible explainer that builds a public profile.",
    ],
    common_strategy_mistakes: [
      "Dense academic prose nobody reads. Fix: make it accessible.",
      "Staying invisible outside academia. Fix: build a public profile.",
      "Research with no stated relevance. Fix: show why it matters.",
      "Inconsistency. Fix: batch.",
    ],
  },
  "tutors": {
    ideal_audience:
      "Anxious parents and discouraged students in your subject and level, searching for someone who clearly understands their struggle. You're building findability and trust beyond word of mouth so your schedule fills.",
    strategy_pillars: [
      {
        pillar: "Make It Click",
        description:
          "Explain a concept the way that finally makes it click. When a parent sees this, they want you for their child.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"Why your child freezes on word problems — and the translation step nobody teaches.\"",
      },
      {
        pillar: "Reassure the Parent",
        description:
          "Speak to the anxious parent or discouraged student. A calm, encouraging tone earns the booking.",
        post_frequency: "1x per week",
        example_topic:
          "\"He wasn't bad at maths. He missed one foundational week two years ago.\"",
      },
      {
        pillar: "Study Techniques",
        description:
          "Share a real technique — a study method, exam-anxiety reduction. When free advice helps, a parent wants more.",
        post_frequency: "1x per week",
        example_topic:
          "\"The revision technique that actually works — and why re-reading doesn't.\"",
      },
      {
        pillar: "Common Mistakes",
        description:
          "Name the mistakes you see repeatedly in your subject. Parents recognize their child and reach out.",
        post_frequency: "1x per week",
        example_topic:
          "\"The three mistakes almost every student makes with fractions.\"",
      },
      {
        pillar: "Tutoring POV",
        description:
          "Take positions on how your subject should be taught. A distinct, warm voice sets you apart.",
        post_frequency: "1x per week",
        example_topic:
          "\"Kids don't hate maths. They hate feeling stupid. Those are different problems.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Tutoring POV", topic_idea: "A position on teaching your subject", format: "Caption" },
      { day: "Tuesday", content_type: "Make It Click", topic_idea: "A concept explained so it clicks", format: "Carousel" },
      { day: "Wednesday", content_type: "Study Techniques", topic_idea: "A real study technique", format: "Carousel" },
      { day: "Thursday", content_type: "Common Mistakes", topic_idea: "Mistakes you see repeatedly", format: "Caption" },
      { day: "Friday", content_type: "Reassure the Parent", topic_idea: "A reassuring student story", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply to parents' comments — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week", format: "Planning" },
    ],
    growth_tactics: [
      "Explain concepts so they click, so parents want you for their child.",
      "Reassure anxious parents and discouraged students to earn the booking.",
      "Give a real study technique so a parent wants more.",
      "Own a subject and level so searchers can find you beyond word of mouth.",
      "Pin a make-it-click carousel that shows you can help.",
    ],
    common_strategy_mistakes: [
      "Relying only on word of mouth. Fix: build findable visibility.",
      "Lecturing instead of reassuring. Fix: speak to the anxious parent.",
      "Abstract content. Fix: make concepts click concretely.",
      "Inconsistency. Fix: batch.",
    ],
  },
  "video-editors": {
    ideal_audience:
      "Content creators, brands, and agencies who need skilled editing, plus fellow editors who share craft. You're making an invisible, deadline-driven skill visible to attract better projects.",
    strategy_pillars: [
      {
        pillar: "Reveal the Craft",
        description:
          "Show the invisible decisions behind good editing. This fascinates clients and editors and signals mastery.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The edit that makes a video feel expensive isn't the color grade.\"",
      },
      {
        pillar: "Teach a Technique",
        description:
          "Break down pacing, retention editing, sound design, color. A well-crafted carousel demonstrates the taste clients hire for.",
        post_frequency: "1x per week",
        example_topic:
          "\"Editing for retention — the drop-off points and the pattern interrupt.\"",
      },
      {
        pillar: "Before & After",
        description:
          "Show what your editing does to raw footage. This is proof-of-skill that markets you.",
        post_frequency: "1x per week",
        example_topic:
          "\"Same footage, two edits. Here's why one keeps you watching.\"",
      },
      {
        pillar: "The Psychology of Attention",
        description:
          "Explain why edits keep people watching. This shows you understand retention, not just software.",
        post_frequency: "1x per week",
        example_topic:
          "\"This video kept you for 8 minutes. Here are the 4 tricks doing the work.\"",
      },
      {
        pillar: "Editing POV",
        description:
          "Take positions on the craft. A distinct voice builds a memorable reputation.",
        post_frequency: "1x per week",
        example_topic:
          "\"More cuts isn't better editing. Knowing when NOT to cut is.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Editing POV", topic_idea: "A position on the craft", format: "Caption" },
      { day: "Tuesday", content_type: "Reveal the Craft", topic_idea: "An invisible editing decision", format: "Carousel" },
      { day: "Wednesday", content_type: "Teach a Technique", topic_idea: "An editing technique, taught", format: "Carousel" },
      { day: "Thursday", content_type: "The Psychology of Attention", topic_idea: "Why edits keep people watching", format: "Caption" },
      { day: "Friday", content_type: "Before & After", topic_idea: "What your editing does to raw footage", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on creators' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch through deadline weeks", format: "Planning" },
    ],
    growth_tactics: [
      "Reveal the hidden craft to fascinate clients and signal mastery.",
      "Teach a technique that proves the taste clients hire for.",
      "Show before-and-afters as proof-of-skill that markets you.",
      "Batch so marketing survives deadline-driven crunch.",
      "Pin a craft carousel that makes your invisible skill visible.",
    ],
    common_strategy_mistakes: [
      "Letting your skill stay invisible until hired. Fix: reveal the craft.",
      "A reel link with no thinking. Fix: teach techniques.",
      "Not showing before-and-afters. Fix: publish proof-of-skill.",
      "Marketing stopping during deadlines. Fix: batch ahead.",
    ],
  },
  "photographers": {
    ideal_audience:
      "The clients who book your kind of photography — brands, businesses, couples, or individuals — plus peers who share craft. You're building a reputation and a body of visible work so clients come to you.",
    strategy_pillars: [
      {
        pillar: "Show the Work",
        description:
          "Share your photography with the story and decisions behind it. Your images are proof, and the thinking sets you apart.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"This shot took 40 minutes of waiting. Here's what I was waiting for.\"",
      },
      {
        pillar: "Teach the Craft",
        description:
          "Break down light, composition, or direction. This demonstrates expertise and gives shareable value.",
        post_frequency: "1x per week",
        example_topic:
          "\"Why your photos look flat — and the one lighting change that fixes it.\"",
      },
      {
        pillar: "Behind the Shoot",
        description:
          "Show how a shoot actually comes together — the setup, the problem solved. This builds connection and trust.",
        post_frequency: "1x per week",
        example_topic:
          "\"The client wanted 'natural.' Here's how much planning natural actually takes.\"",
      },
      {
        pillar: "The Client Experience",
        description:
          "Speak to what it's like to work with you and why it matters. This attracts the right bookings.",
        post_frequency: "1x per week",
        example_topic:
          "\"You're not paying for the photos. You're paying for me to make you forget the camera.\"",
      },
      {
        pillar: "Photography POV",
        description:
          "Take positions on the craft and industry. A distinct voice builds a memorable reputation.",
        post_frequency: "1x per week",
        example_topic:
          "\"Gear doesn't make the photo. Here's what actually separates pros from hobbyists.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Photography POV", topic_idea: "A position on the craft", format: "Caption" },
      { day: "Tuesday", content_type: "Show the Work", topic_idea: "An image with the decisions behind it", format: "Image" },
      { day: "Wednesday", content_type: "Teach the Craft", topic_idea: "A lesson on light or composition", format: "Carousel" },
      { day: "Thursday", content_type: "Behind the Shoot", topic_idea: "How a shoot came together", format: "Carousel" },
      { day: "Friday", content_type: "The Client Experience", topic_idea: "Why working with you matters", format: "Caption" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on clients' and peers' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch through busy shoot weeks", format: "Planning" },
    ],
    growth_tactics: [
      "Share work with the story behind it — the images are proof, the thinking sets you apart.",
      "Teach the craft to demonstrate expertise and earn shares.",
      "Show behind-the-shoot to build connection and trust.",
      "Batch so marketing survives busy shoot weeks.",
      "Pin a signature-work carousel that shows your style and thinking.",
    ],
    common_strategy_mistakes: [
      "Posting images with no story or thinking. Fix: share the decisions behind them.",
      "Never teaching. Fix: break down your craft.",
      "Competing on gear talk. Fix: show taste and client experience.",
      "Going quiet during busy weeks. Fix: batch ahead.",
    ],
  },
  "videographers": {
    ideal_audience:
      "Brands, businesses, and creators who need video, plus peers who share craft. You're making your storytelling and technical skill visible so better clients come to you.",
    strategy_pillars: [
      {
        pillar: "Show the Storytelling",
        description:
          "Share your work with the narrative and decisions behind it. Video is storytelling, and showing the thinking sets you apart.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"This 60-second brand film has a three-act structure. Here's how it works.\"",
      },
      {
        pillar: "Teach a Technique",
        description:
          "Break down shooting, lighting, or story structure. A well-made carousel demonstrates the skill clients hire for.",
        post_frequency: "1x per week",
        example_topic:
          "\"Why your videos feel amateur — and the framing rule that fixes it.\"",
      },
      {
        pillar: "Behind the Production",
        description:
          "Show how a shoot comes together — the plan, the problem solved on set. This builds trust and connection.",
        post_frequency: "1x per week",
        example_topic:
          "\"The client's timeline was impossible. Here's how we shot it in one day.\"",
      },
      {
        pillar: "Video That Performs",
        description:
          "Explain what makes video actually work for a client's goal. This shows you understand results, not just aesthetics.",
        post_frequency: "1x per week",
        example_topic:
          "\"A beautiful video that doesn't convert is expensive art. Here's the difference.\"",
      },
      {
        pillar: "Videography POV",
        description:
          "Take positions on the craft and industry. A distinct voice builds reputation.",
        post_frequency: "1x per week",
        example_topic:
          "\"The best gear won't save a weak story. Story is the whole job.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Videography POV", topic_idea: "A position on the craft", format: "Caption" },
      { day: "Tuesday", content_type: "Show the Storytelling", topic_idea: "Work with the narrative behind it", format: "Image" },
      { day: "Wednesday", content_type: "Teach a Technique", topic_idea: "A shooting or story technique", format: "Carousel" },
      { day: "Thursday", content_type: "Video That Performs", topic_idea: "What makes video work for a goal", format: "Carousel" },
      { day: "Friday", content_type: "Behind the Production", topic_idea: "How a shoot came together", format: "Caption" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on clients' and peers' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch through busy production weeks", format: "Planning" },
    ],
    growth_tactics: [
      "Show work with the storytelling behind it to set you apart.",
      "Teach techniques that prove the skill clients hire for.",
      "Show behind-the-production to build trust.",
      "Frame video around results, not just aesthetics, to attract serious clients.",
      "Batch so marketing survives busy production weeks.",
    ],
    common_strategy_mistakes: [
      "Posting reels with no thinking. Fix: show the storytelling decisions.",
      "Only aesthetics, no results. Fix: frame video around goals.",
      "Never teaching. Fix: break down techniques.",
      "Going quiet during productions. Fix: batch ahead.",
    ],
  },
  "podcast-producers": {
    ideal_audience:
      "Podcasters, brands, and businesses who need production help, plus peers who share craft. You're making an invisible behind-the-scenes skill visible so clients understand and value what you do.",
    strategy_pillars: [
      {
        pillar: "Demystify Production",
        description:
          "Show what production actually involves — the editing, the structure, the sound. This makes an invisible craft visible and valued.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"Why your podcast sounds amateur — and it's not your mic.\"",
      },
      {
        pillar: "Teach a Technique",
        description:
          "Break down editing, story structure, audio quality. This demonstrates expertise to clients and peers.",
        post_frequency: "1x per week",
        example_topic:
          "\"The edit that keeps listeners past the 5-minute drop-off.\"",
      },
      {
        pillar: "What Makes Shows Grow",
        description:
          "Explain what actually grows a podcast. This positions you as a strategic partner, not just an editor.",
        post_frequency: "1x per week",
        example_topic:
          "\"Most podcasts die at episode 7. Here's the production reason nobody talks about.\"",
      },
      {
        pillar: "Behind the Show",
        description:
          "Share the process of producing a real episode. This builds trust and shows your value.",
        post_frequency: "1x per week",
        example_topic:
          "\"A 45-minute episode takes me 4 hours to produce. Here's every step.\"",
      },
      {
        pillar: "Production POV",
        description:
          "Take positions on podcasting and production. A distinct voice builds reputation.",
        post_frequency: "1x per week",
        example_topic:
          "\"Great content with bad audio still loses. Sound is a retention feature.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Production POV", topic_idea: "A position on podcast production", format: "Caption" },
      { day: "Tuesday", content_type: "Demystify Production", topic_idea: "What production actually involves", format: "Carousel" },
      { day: "Wednesday", content_type: "Teach a Technique", topic_idea: "An editing or audio technique", format: "Carousel" },
      { day: "Thursday", content_type: "What Makes Shows Grow", topic_idea: "The production side of growth", format: "Caption" },
      { day: "Friday", content_type: "Behind the Show", topic_idea: "Producing a real episode", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on podcasters' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch through busy production weeks", format: "Planning" },
    ],
    growth_tactics: [
      "Demystify production so clients understand and value the invisible work.",
      "Teach techniques that prove your expertise.",
      "Frame production around show growth to be a strategic partner.",
      "Batch so marketing survives busy production weeks.",
      "Pin a behind-the-show carousel that reveals your value.",
    ],
    common_strategy_mistakes: [
      "Letting production stay invisible and undervalued. Fix: demystify it.",
      "Positioning as just an editor. Fix: tie production to growth.",
      "Never teaching. Fix: break down techniques.",
      "Going quiet during production weeks. Fix: batch ahead.",
    ],
  },
  "podcasters": {
    ideal_audience:
      "Potential listeners in your niche and the guests, sponsors, and collaborators who grow a show. You're building an audience and authority so your podcast compounds beyond the feed.",
    strategy_pillars: [
      {
        pillar: "Repurpose Episodes",
        description:
          "Turn your best episode moments into standalone posts. This extends each episode's reach far beyond listeners.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"My guest said one line that reframed how I think about this entire topic.\"",
      },
      {
        pillar: "Share Your Take",
        description:
          "Post your own POV on your show's themes. This builds you as a voice, not just a host.",
        post_frequency: "1x per week",
        example_topic:
          "\"After 100 episodes interviewing founders, here's the pattern nobody admits.\"",
      },
      {
        pillar: "Behind the Mic",
        description:
          "Share the journey of building the show. This builds connection and a rooting audience.",
        post_frequency: "1x per week",
        example_topic:
          "\"Episode 1 had 12 downloads. Here's what changed by episode 50.\"",
      },
      {
        pillar: "Guest Highlights",
        description:
          "Spotlight guests and their best insights. This taps their audiences and builds relationships.",
        post_frequency: "1x per week",
        example_topic:
          "\"This week's guest built a $10M business on one counterintuitive bet.\"",
      },
      {
        pillar: "Podcaster POV",
        description:
          "Take positions on your niche's topics. A distinct voice grows your authority and audience.",
        post_frequency: "1x per week",
        example_topic:
          "\"Everyone in this space agrees on something that's quietly wrong.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Podcaster POV", topic_idea: "A take on your niche's topic", format: "Caption" },
      { day: "Tuesday", content_type: "Repurpose Episodes", topic_idea: "A standalone post from a key moment", format: "Carousel" },
      { day: "Wednesday", content_type: "Share Your Take", topic_idea: "Your POV on a show theme", format: "Carousel" },
      { day: "Thursday", content_type: "Guest Highlight", topic_idea: "A guest's best insight", format: "Image" },
      { day: "Friday", content_type: "Behind the Mic", topic_idea: "The journey of building the show", format: "Caption" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment in your niche — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch repurposed content from recent episodes", format: "Planning" },
    ],
    growth_tactics: [
      "Repurpose your best episode moments to extend reach beyond listeners.",
      "Share your own take to build yourself as a voice, not just a host.",
      "Highlight guests to tap their audiences and build relationships.",
      "Batch repurposed content so every episode works harder.",
      "Pin a signature take that captures what your show is about.",
    ],
    common_strategy_mistakes: [
      "Only posting 'new episode out' announcements. Fix: repurpose real moments.",
      "Being just a host with no voice. Fix: share your own POV.",
      "Not tapping guest audiences. Fix: highlight guests.",
      "Letting episodes work once. Fix: batch-repurpose them.",
    ],
  },
  "authors": {
    ideal_audience:
      "Readers who'd love your book and the audience that sustains an author's career beyond one release. You're building a platform so your ideas — and your next book — reach people directly.",
    strategy_pillars: [
      {
        pillar: "Ideas from the Book",
        description:
          "Share the concepts and arguments from your work as standalone value. This spreads your ideas and draws readers.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The central argument of my book, in one post — and why it's uncomfortable.\"",
      },
      {
        pillar: "The Writing Life",
        description:
          "Share the honest reality of writing. This builds connection with readers and aspiring writers.",
        post_frequency: "1x per week",
        example_topic:
          "\"I rewrote the first chapter 14 times. Here's what finally worked.\"",
      },
      {
        pillar: "Your Themes & POV",
        description:
          "Take positions on the themes you write about. This builds you as a thinker people follow.",
        post_frequency: "1x per week",
        example_topic:
          "\"Everything I write comes back to one idea most people resist.\"",
      },
      {
        pillar: "Reader Connection",
        description:
          "Engage with what your book means to readers. This deepens the relationship that sustains a career.",
        post_frequency: "1x per week",
        example_topic:
          "\"A reader told me a chapter changed a decision. That's the whole reason I write.\"",
      },
      {
        pillar: "Behind the Craft",
        description:
          "Share how you think and work as a writer. This fascinates readers and writers alike.",
        post_frequency: "1x per week",
        example_topic:
          "\"How I turn a vague idea into a chapter — my actual process.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Your Themes & POV", topic_idea: "A position on your themes", format: "Caption" },
      { day: "Tuesday", content_type: "Ideas from the Book", topic_idea: "A concept from your work as value", format: "Carousel" },
      { day: "Wednesday", content_type: "Behind the Craft", topic_idea: "How you think and work as a writer", format: "Carousel" },
      { day: "Thursday", content_type: "The Writing Life", topic_idea: "The honest reality of writing", format: "Caption" },
      { day: "Friday", content_type: "Reader Connection", topic_idea: "What your book means to readers", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply to readers — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch ideas from your book", format: "Planning" },
    ],
    growth_tactics: [
      "Share your book's ideas as standalone value to spread them and draw readers.",
      "Share the writing life to build connection with readers and writers.",
      "Take positions on your themes to build yourself as a thinker people follow.",
      "Build a platform between releases so your next book starts with an audience.",
      "Pin a signature-idea carousel that captures what you're about.",
    ],
    common_strategy_mistakes: [
      "Only posting 'buy my book.' Fix: share the ideas as value.",
      "Only promoting near launch. Fix: build a platform continuously.",
      "Hiding the craft. Fix: share how you write.",
      "No point of view. Fix: take positions on your themes.",
    ],
  },
  "speakers": {
    ideal_audience:
      "Event organizers and corporate bookers who hire speakers, plus the audience that builds a speaking reputation. You're building visible authority on your signature topic so you get booked.",
    strategy_pillars: [
      {
        pillar: "Signature Ideas",
        description:
          "Share the core ideas from your talks as standalone value. This demonstrates your message and draws bookers.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The one idea I build every keynote around — and why audiences remember it.\"",
      },
      {
        pillar: "Speaking Proof",
        description:
          "Share moments and reactions from talks. This is social proof that you deliver on stage.",
        post_frequency: "1x per week",
        example_topic:
          "\"The room went silent at this line. Here's why it lands every time.\"",
      },
      {
        pillar: "Your Topic POV",
        description:
          "Take strong positions on your subject. A clear, ownable message is what gets you booked.",
        post_frequency: "1x per week",
        example_topic:
          "\"The advice everyone gives on this topic is exactly backwards.\"",
      },
      {
        pillar: "Behind the Talk",
        description:
          "Share how you craft a talk and connect with a room. This fascinates and builds credibility.",
        post_frequency: "1x per week",
        example_topic:
          "\"How I open a keynote so the room is with me in the first 60 seconds.\"",
      },
      {
        pillar: "Value for Bookers",
        description:
          "Speak to what event organizers actually need. This attracts the people who book you.",
        post_frequency: "1x per week",
        example_topic:
          "\"What makes a keynote worth the fee — from the organizer's side.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Your Topic POV", topic_idea: "A strong position on your subject", format: "Caption" },
      { day: "Tuesday", content_type: "Signature Ideas", topic_idea: "A core idea from your talks", format: "Carousel" },
      { day: "Wednesday", content_type: "Behind the Talk", topic_idea: "How you craft and deliver a talk", format: "Carousel" },
      { day: "Thursday", content_type: "Value for Bookers", topic_idea: "What organizers actually need", format: "Caption" },
      { day: "Friday", content_type: "Speaking Proof", topic_idea: "A moment or reaction from a talk", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on organizers' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch ideas from your talks", format: "Planning" },
    ],
    growth_tactics: [
      "Share signature ideas as value to demonstrate your message and draw bookers.",
      "Post speaking proof — moments and reactions — as social proof you deliver.",
      "Own a clear, strong topic POV, which is what gets you booked.",
      "Speak to what organizers need to attract the people who hire.",
      "Pin a signature-idea carousel that captures your keynote.",
    ],
    common_strategy_mistakes: [
      "No clear, ownable message. Fix: own a strong topic POV.",
      "No proof you deliver on stage. Fix: share speaking moments.",
      "Ignoring the booker's needs. Fix: speak to organizers.",
      "Sporadic posting. Fix: batch.",
    ],
  },
  "newsletter-writers": {
    ideal_audience:
      "Potential subscribers in your niche who'd love your newsletter, reached by giving away value that proves it's worth subscribing to. You're building a growth engine that feeds your list.",
    strategy_pillars: [
      {
        pillar: "Repurpose the Best",
        description:
          "Turn your strongest newsletter ideas into standalone posts. This proves your value and drives subscriptions.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The idea from this week's newsletter that got the most replies.\"",
      },
      {
        pillar: "Give Real Value",
        description:
          "Deliver genuine insight in every post. When people learn from your free content, they subscribe for more.",
        post_frequency: "1x per week",
        example_topic:
          "\"One framework I use every week — free, no signup required.\"",
      },
      {
        pillar: "Your Niche POV",
        description:
          "Take positions on your newsletter's topic. A distinct voice is what makes yours worth subscribing to.",
        post_frequency: "1x per week",
        example_topic:
          "\"Everyone in this niche says X. I think they're missing the point.\"",
      },
      {
        pillar: "Behind the Newsletter",
        description:
          "Share the journey and process. This builds connection and a rooting audience.",
        post_frequency: "1x per week",
        example_topic:
          "\"From 0 to 10,000 subscribers — the three posts that actually moved it.\"",
      },
      {
        pillar: "Curation & Insight",
        description:
          "Share what you're reading and thinking. This demonstrates the taste that makes your newsletter valuable.",
        post_frequency: "1x per week",
        example_topic:
          "\"The three things I read this week that changed how I think.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Your Niche POV", topic_idea: "A position on your topic", format: "Caption" },
      { day: "Tuesday", content_type: "Repurpose the Best", topic_idea: "A standalone post from your newsletter", format: "Carousel" },
      { day: "Wednesday", content_type: "Give Real Value", topic_idea: "A genuine insight, free", format: "Carousel" },
      { day: "Thursday", content_type: "Curation & Insight", topic_idea: "What you're reading and thinking", format: "Caption" },
      { day: "Friday", content_type: "Behind the Newsletter", topic_idea: "The journey and process", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply to comments — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch repurposed content from recent issues", format: "Planning" },
    ],
    growth_tactics: [
      "Repurpose your best newsletter ideas to prove value and drive subscriptions.",
      "Give real value so people subscribe for more.",
      "Take a distinct niche POV that makes yours worth subscribing to.",
      "Batch repurposed content so every issue feeds your growth.",
      "Pin a high-value post with a clear subscribe CTA.",
    ],
    common_strategy_mistakes: [
      "Only posting 'new issue out.' Fix: repurpose real value.",
      "Giving nothing away. Fix: prove worth with free insight.",
      "No distinct voice. Fix: take a clear niche POV.",
      "Letting issues work once. Fix: batch-repurpose.",
    ],
  },
  "journalists": {
    ideal_audience:
      "Readers, sources, and editors in your beat, plus the audience that increasingly follows individual journalists over outlets. You're building a personal brand and a direct relationship with readers that outlasts any single employer.",
    strategy_pillars: [
      {
        pillar: "Behind Your Reporting",
        description:
          "Share the story behind a story — how you found it, what didn't make the cut. This builds trust and fascination.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"This story took 4 months and 30 interviews. Here's the detail that cracked it.\"",
      },
      {
        pillar: "Your Beat's Context",
        description:
          "Give readers the context and analysis behind the news in your beat. This positions you as the go-to voice.",
        post_frequency: "1x per week",
        example_topic:
          "\"Everyone reported the headline. Here's what it actually means.\"",
      },
      {
        pillar: "Informed POV",
        description:
          "Share your analysis and perspective (within your outlet's norms). People follow journalists with a distinct lens.",
        post_frequency: "1x per week",
        example_topic:
          "\"After covering this beat for a decade, here's the pattern I keep seeing.\"",
      },
      {
        pillar: "Media Literacy",
        description:
          "Help readers understand how news works — sourcing, verification, why coverage looks the way it does. This builds trust in a low-trust environment.",
        post_frequency: "1x per week",
        example_topic:
          "\"Why 'sources say' isn't lazy — how anonymous sourcing actually works.\"",
      },
      {
        pillar: "Connect with Readers",
        description:
          "Engage directly with your audience. This builds the direct relationship that sustains a modern journalism career.",
        post_frequency: "1x per week",
        example_topic:
          "\"You asked why I covered this the way I did. Here's my honest answer.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Informed POV", topic_idea: "Your analysis of a beat development", format: "Caption" },
      { day: "Tuesday", content_type: "Behind Your Reporting", topic_idea: "The story behind a story", format: "Carousel" },
      { day: "Wednesday", content_type: "Your Beat's Context", topic_idea: "Context behind the news", format: "Carousel" },
      { day: "Thursday", content_type: "Media Literacy", topic_idea: "How news actually works", format: "Caption" },
      { day: "Friday", content_type: "Connect with Readers", topic_idea: "Engage with reader questions", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply to readers and sources — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch context from your reporting", format: "Planning" },
    ],
    growth_tactics: [
      "Share the story behind your reporting to build trust and fascination.",
      "Give context behind the news so you become the go-to voice on your beat.",
      "Build a direct reader relationship that outlasts any single employer.",
      "Batch so your personal brand grows alongside deadline-driven work.",
      "Pin a behind-the-reporting carousel that shows your rigor.",
    ],
    common_strategy_mistakes: [
      "Only sharing links to your articles. Fix: add context and the story behind them.",
      "Relying on the outlet's brand, not your own. Fix: build a direct reader relationship.",
      "No distinct lens. Fix: share informed perspective.",
      "Inconsistency. Fix: batch.",
    ],
  },
  "animators": {
    ideal_audience:
      "Studios, brands, and creators who commission animation, plus peers who share craft. You're making a labor-intensive, often-invisible skill visible so better projects come to you.",
    strategy_pillars: [
      {
        pillar: "Show the Work",
        description:
          "Share your animation with the decisions and process behind it. The work is proof; the thinking sets you apart.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"This 5-second shot took two days. Here's every frame decision.\"",
      },
      {
        pillar: "Teach a Principle",
        description:
          "Break down timing, weight, appeal — the fundamentals. A well-made carousel demonstrates your craft.",
        post_frequency: "1x per week",
        example_topic:
          "\"Why your animation feels stiff — and the timing principle that fixes it.\"",
      },
      {
        pillar: "Process & Progress",
        description:
          "Show the journey from sketch to final. This reveals the labor and value clients don't see.",
        post_frequency: "1x per week",
        example_topic:
          "\"Blocking to final — the stages nobody outside animation ever sees.\"",
      },
      {
        pillar: "The Value of Animation",
        description:
          "Explain what animation does for a client's goal. This shows you understand impact, not just craft.",
        post_frequency: "1x per week",
        example_topic:
          "\"A good explainer animation isn't decoration. It's a comprehension tool.\"",
      },
      {
        pillar: "Animation POV",
        description:
          "Take positions on the craft and industry. A distinct voice builds reputation.",
        post_frequency: "1x per week",
        example_topic:
          "\"AI can generate frames. It can't generate timing that makes you feel something.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Animation POV", topic_idea: "A position on the craft", format: "Caption" },
      { day: "Tuesday", content_type: "Show the Work", topic_idea: "A shot with the decisions behind it", format: "Image" },
      { day: "Wednesday", content_type: "Teach a Principle", topic_idea: "An animation fundamental", format: "Carousel" },
      { day: "Thursday", content_type: "The Value of Animation", topic_idea: "What animation does for a goal", format: "Carousel" },
      { day: "Friday", content_type: "Process & Progress", topic_idea: "Sketch to final journey", format: "Caption" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on studios' and peers' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch through busy project weeks", format: "Planning" },
    ],
    growth_tactics: [
      "Show work with the decisions behind it — the craft is proof, the thinking sets you apart.",
      "Teach a principle that demonstrates your mastery.",
      "Show process to reveal the labor and value clients don't see.",
      "Batch so marketing survives labor-intensive project weeks.",
      "Pin a craft carousel that makes your invisible skill visible.",
    ],
    common_strategy_mistakes: [
      "Posting final shots with no process or thinking. Fix: show the decisions.",
      "Never teaching. Fix: break down principles.",
      "Only craft, no client value. Fix: connect animation to goals.",
      "Going quiet during projects. Fix: batch ahead.",
    ],
  },
  "real-estate-investors": {
    ideal_audience:
      "Aspiring and active investors who learn from real deals, plus the partners, lenders, and sellers who track credible operators. You're building authority through real numbers so opportunities and capital come to you.",
    strategy_pillars: [
      {
        pillar: "Real Deal Breakdowns",
        description:
          "Share actual deals with the numbers — what you bought, the returns, the mistakes. Specific numbers build credibility no theory can match.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"I bought this property for $180k. Here's every number, including what I got wrong.\"",
      },
      {
        pillar: "Lessons & Mistakes",
        description:
          "Share what deals taught you, especially the losses. Honest post-mortems build the most trust.",
        post_frequency: "1x per week",
        example_topic:
          "\"My worst deal cost me $40k. Here's the due diligence step I skipped.\"",
      },
      {
        pillar: "Market Analysis",
        description:
          "Share how you read a market and evaluate opportunity. This proves you have a repeatable process.",
        post_frequency: "1x per week",
        example_topic:
          "\"How I evaluate a rental market in 20 minutes — the four numbers that matter.\"",
      },
      {
        pillar: "Strategy & Frameworks",
        description:
          "Teach your investing approach. This positions you as a strategic operator worth partnering with.",
        post_frequency: "1x per week",
        example_topic:
          "\"The BRRRR mistake that traps new investors — and how to structure it right.\"",
      },
      {
        pillar: "Investor POV",
        description:
          "Take positions on real estate investing. A distinct, credible voice attracts capital and deals.",
        post_frequency: "1x per week",
        example_topic:
          "\"Cash flow beats appreciation — and here's the math that proves it in a downturn.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Investor POV", topic_idea: "A position on real estate investing", format: "Caption" },
      { day: "Tuesday", content_type: "Real Deal Breakdown", topic_idea: "An actual deal with the numbers", format: "Carousel" },
      { day: "Wednesday", content_type: "Strategy & Frameworks", topic_idea: "Your investing approach, taught", format: "Carousel" },
      { day: "Thursday", content_type: "Market Analysis", topic_idea: "How you read a market", format: "Caption" },
      { day: "Friday", content_type: "Lessons & Mistakes", topic_idea: "What a deal taught you", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on investors' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch from your deal pipeline", format: "Planning" },
    ],
    growth_tactics: [
      "Break down real deals with the numbers — specificity builds credibility no theory can.",
      "Share losses honestly; post-mortems build the most trust and reach.",
      "Show your market analysis to prove a repeatable process.",
      "Batch so your authority grows alongside active deals.",
      "Pin a deal-breakdown carousel that proves you actually operate.",
    ],
    common_strategy_mistakes: [
      "Vague 'wealth mindset' content with no numbers. Fix: break down real deals.",
      "Only sharing wins. Fix: dissect the losses.",
      "No visible process. Fix: show your market analysis.",
      "Inconsistency. Fix: batch.",
    ],
  },
  "real-estate-coaches": {
    ideal_audience:
      "Agents and investors who want to grow their business and are tired of generic coaching. You're building proof-driven authority so the right clients seek you out.",
    strategy_pillars: [
      {
        pillar: "Proof from Clients",
        description:
          "Share client results led by the specific change. Agents are skeptical of coaches who can't show they've moved a business.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"An agent went from 12 to 40 deals a year. We changed one thing about lead follow-up.\"",
      },
      {
        pillar: "Tactical Playbooks",
        description:
          "Teach a real system — lead gen, follow-up, listing presentations. When an agent applies it and it works, they want your coaching.",
        post_frequency: "1x per week",
        example_topic:
          "\"The follow-up sequence that converts old leads most agents ignore.\"",
      },
      {
        pillar: "Agent Frustrations",
        description:
          "Name the specific struggles agents face — inconsistent income, burnout, lead quality. This makes the right agent feel seen.",
        post_frequency: "1x per week",
        example_topic:
          "\"Your income isn't inconsistent because of the market. It's your pipeline.\"",
      },
      {
        pillar: "Business Systems",
        description:
          "Teach building a real estate business, not just doing deals. This attracts agents ready to scale.",
        post_frequency: "1x per week",
        example_topic:
          "\"Top producers don't work harder. They built a system. Here's the first piece.\"",
      },
      {
        pillar: "Coaching POV",
        description:
          "Take positions that challenge generic real estate advice. A distinct voice sets you apart.",
        post_frequency: "1x per week",
        example_topic:
          "\"'Just cold call more' is why agents burn out. Here's what actually scales.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Coaching POV", topic_idea: "A take challenging generic advice", format: "Caption" },
      { day: "Tuesday", content_type: "Proof from Clients", topic_idea: "A client result led by the change", format: "Carousel" },
      { day: "Wednesday", content_type: "Tactical Playbook", topic_idea: "A real system, taught", format: "Carousel" },
      { day: "Thursday", content_type: "Agent Frustrations", topic_idea: "Name a specific agent struggle", format: "Caption" },
      { day: "Friday", content_type: "Business Systems", topic_idea: "Building a business, not just deals", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on agents' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch from client wins", format: "Planning" },
    ],
    growth_tactics: [
      "Turn client results into proof that you've actually moved a business.",
      "Teach tactical playbooks so an agent applies one and wants your coaching.",
      "Name specific agent frustrations so the right person feels seen.",
      "Batch so you stay visible when an agent decides to invest in coaching.",
      "Pin a proof carousel that separates you from generic coaches.",
    ],
    common_strategy_mistakes: [
      "Generic motivation like every other coach. Fix: lead with proof and playbooks.",
      "Keeping client results private. Fix: publish them.",
      "Teaching deals, not business systems. Fix: help agents scale.",
      "Inconsistency. Fix: batch.",
    ],
  },
  "mortgage-brokers": {
    ideal_audience:
      "Homebuyers (especially first-timers), plus the real estate agents who refer clients. You're building trust and referral relationships by demystifying a confusing, high-stakes process.",
    strategy_pillars: [
      {
        pillar: "Demystify the Process",
        description:
          "Explain how mortgages actually work — rates, approvals, the timeline. Anxious buyers desperately want clarity.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"What actually determines your rate — and it's not just your credit score.\"",
      },
      {
        pillar: "Answer Buyer Questions",
        description:
          "Address the questions buyers ask you daily. If one asks, hundreds are wondering.",
        post_frequency: "1x per week",
        example_topic:
          "\"How much do you actually need for a down payment? Less than you think.\"",
      },
      {
        pillar: "Save Them Money",
        description:
          "Show the mistakes that cost buyers money and how to avoid them. This builds enormous trust.",
        post_frequency: "1x per week",
        example_topic:
          "\"The pre-approval mistake that costs first-time buyers the house they wanted.\"",
      },
      {
        pillar: "Market & Rates Context",
        description:
          "Give clear context on rates and the market. This positions you as the calm expert.",
        post_frequency: "1x per week",
        example_topic:
          "\"Rates went up. Here's what that actually means for your monthly payment.\"",
      },
      {
        pillar: "Broker POV & Referrals",
        description:
          "Take clear positions and speak to the agents who refer you. A distinct voice builds trust and a referral network.",
        post_frequency: "1x per week",
        example_topic:
          "\"Why the lowest rate isn't always the best deal — the fees nobody flags.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Broker POV & Referrals", topic_idea: "A clear position on mortgages", format: "Caption" },
      { day: "Tuesday", content_type: "Demystify the Process", topic_idea: "How mortgages actually work", format: "Carousel" },
      { day: "Wednesday", content_type: "Save Them Money", topic_idea: "A costly mistake and the fix", format: "Carousel" },
      { day: "Thursday", content_type: "Answer Buyer Questions", topic_idea: "A question buyers ask daily", format: "Caption" },
      { day: "Friday", content_type: "Market & Rates Context", topic_idea: "Clear context on rates", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on agents' and buyers' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week's content", format: "Planning" },
    ],
    growth_tactics: [
      "Demystify the mortgage process to reach anxious buyers desperate for clarity.",
      "Answer the questions buyers ask daily to reach hundreds wondering the same.",
      "Show how to save money to build enormous trust.",
      "Engage with real estate agents to build the referral network that drives your business.",
      "Pin a process carousel so a nervous buyer feels guided.",
    ],
    common_strategy_mistakes: [
      "Dry rate posts nobody reads. Fix: demystify and lead with what's at stake.",
      "Ignoring the referral relationship with agents. Fix: engage with them.",
      "Jargon that intimidates buyers. Fix: make it clear and calming.",
      "Inconsistency. Fix: batch.",
    ],
  },
  "property-managers": {
    ideal_audience:
      "Property owners and investors deciding whether to self-manage or hire, plus the landlords who become clients. You're building authority that shows the value of professional management.",
    strategy_pillars: [
      {
        pillar: "The Cost of Self-Managing",
        description:
          "Show the hidden headaches and costs owners don't anticipate. This makes the case for professional management.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The 2am call about a burst pipe is why owners hire managers. Here's the real cost.\"",
      },
      {
        pillar: "Educate Owners",
        description:
          "Teach what owners need to know — tenant screening, legal compliance, maintenance. This builds trust and demonstrates expertise.",
        post_frequency: "1x per week",
        example_topic:
          "\"The tenant screening step most DIY landlords skip — and regret.\"",
      },
      {
        pillar: "Real Situations",
        description:
          "Share how you handle real property challenges (anonymized). This proves your value in action.",
        post_frequency: "1x per week",
        example_topic:
          "\"A tenant stopped paying. Here's exactly how we handled it — legally and fast.\"",
      },
      {
        pillar: "Maximize Returns",
        description:
          "Show how good management protects and grows an owner's investment. This reframes management as ROI, not cost.",
        post_frequency: "1x per week",
        example_topic:
          "\"Good management isn't a cost. Here's how it protects your yield.\"",
      },
      {
        pillar: "Property Management POV",
        description:
          "Take clear positions on managing property well. A distinct voice builds authority.",
        post_frequency: "1x per week",
        example_topic:
          "\"The cheapest property manager will cost you the most. Here's why.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Property Management POV", topic_idea: "A position on managing property well", format: "Caption" },
      { day: "Tuesday", content_type: "The Cost of Self-Managing", topic_idea: "Hidden costs owners don't anticipate", format: "Carousel" },
      { day: "Wednesday", content_type: "Educate Owners", topic_idea: "Something owners need to know", format: "Carousel" },
      { day: "Thursday", content_type: "Maximize Returns", topic_idea: "How management grows an investment", format: "Caption" },
      { day: "Friday", content_type: "Real Situations", topic_idea: "How you handled a real challenge", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on owners' and investors' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week's content", format: "Planning" },
    ],
    growth_tactics: [
      "Show the hidden cost of self-managing to make the case for professional management.",
      "Educate owners to build trust and demonstrate expertise.",
      "Share real situations to prove your value in action.",
      "Reframe management as ROI, not cost, to attract owners.",
      "Pin a value carousel that shows what good management protects.",
    ],
    common_strategy_mistakes: [
      "Marketing management as a cost. Fix: reframe it as protecting returns.",
      "Generic content with no proof. Fix: share real situations.",
      "Not educating owners. Fix: teach what they need to know.",
      "Inconsistency. Fix: batch.",
    ],
  },
  "course-creators": {
    ideal_audience:
      "Learners with the specific problem your course solves, whom you help and warm toward buying. You're building an audience between launches so your list stays warm and your launches start strong.",
    strategy_pillars: [
      {
        pillar: "Teach Real Lessons",
        description:
          "Give away genuine pieces of your curriculum. When free content teaches something real, people trust the paid version.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The framework from module 1 of my course — the whole thing, free.\"",
      },
      {
        pillar: "Value-First Samples",
        description:
          "Demonstrate your teaching quality. A prospect who learns from your post has sampled your course.",
        post_frequency: "1x per week",
        example_topic:
          "\"The mistake I fix for every student in week one.\"",
      },
      {
        pillar: "Speak to the Struggle",
        description:
          "Name the exact problem your course solves. This attracts the person who needs it.",
        post_frequency: "1x per week",
        example_topic:
          "\"You keep starting and stopping. It's not motivation — it's a missing system.\"",
      },
      {
        pillar: "Student Proof",
        description:
          "Share results (with permission). This proves your course delivers.",
        post_frequency: "1x per week",
        example_topic:
          "\"A student landed their first client 6 weeks after finishing. Here's how.\"",
      },
      {
        pillar: "Creator POV",
        description:
          "Take positions on how people learn your topic. A distinct voice builds authority.",
        post_frequency: "1x per week",
        example_topic:
          "\"Most courses are built to sell, not to finish. Mine is the opposite.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Creator POV", topic_idea: "A position on how people learn your topic", format: "Caption" },
      { day: "Tuesday", content_type: "Teach Real Lessons", topic_idea: "A genuine lesson from your curriculum", format: "Carousel" },
      { day: "Wednesday", content_type: "Value-First Sample", topic_idea: "A post that samples your teaching", format: "Carousel" },
      { day: "Thursday", content_type: "Speak to the Struggle", topic_idea: "Name the problem your course solves", format: "Caption" },
      { day: "Friday", content_type: "Student Proof", topic_idea: "A student result", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply to learners — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch to keep your audience warm between launches", format: "Planning" },
    ],
    growth_tactics: [
      "Give away real lessons — the counterintuitive engine of course sales.",
      "Make free content a true sample of your teaching.",
      "Build an audience between launches so the next starts warm.",
      "Share student proof that your course delivers.",
      "Pin a value-first carousel that samples your course.",
    ],
    common_strategy_mistakes: [
      "Only posting during launches. Fix: build an audience continuously.",
      "Withholding value. Fix: give real lessons — it drives sales.",
      "Vague content. Fix: teach real curriculum.",
      "No proof. Fix: share student results.",
    ],
  },
  "community-builders": {
    ideal_audience:
      "Founders and creators who want to build a community, plus peers in the community space. You're building authority as someone who understands what makes communities actually thrive.",
    strategy_pillars: [
      {
        pillar: "What Makes Community Work",
        description:
          "Reveal the non-obvious drivers of thriving communities. A sharp diagnosis signals real expertise.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"Your community is quiet because you're the only one allowed to be useful.\"",
      },
      {
        pillar: "Teach a System",
        description:
          "Break down onboarding, sparking member-led conversation, rituals. Teaching attracts people building communities.",
        post_frequency: "1x per week",
        example_topic:
          "\"The first 48 hours decide whether a member stays. Here's the onboarding ritual.\"",
      },
      {
        pillar: "Community as Moat",
        description:
          "Make the case that community is a defensible advantage. This resonates with founders realizing its value.",
        post_frequency: "1x per week",
        example_topic:
          "\"Anyone can copy your product. Nobody can copy your community.\"",
      },
      {
        pillar: "Real Examples",
        description:
          "Analyze communities that thrive or fail. Familiar examples make your expertise tangible.",
        post_frequency: "1x per week",
        example_topic:
          "\"Why this community grew to 50k engaged members — and what most get wrong.\"",
      },
      {
        pillar: "Community POV",
        description:
          "Take positions on building community. A distinct voice builds authority.",
        post_frequency: "1x per week",
        example_topic:
          "\"More members isn't growth. Engagement per member is.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Community POV", topic_idea: "A position on building community", format: "Caption" },
      { day: "Tuesday", content_type: "What Makes Community Work", topic_idea: "A non-obvious driver", format: "Carousel" },
      { day: "Wednesday", content_type: "Teach a System", topic_idea: "A community system, broken down", format: "Carousel" },
      { day: "Thursday", content_type: "Community as Moat", topic_idea: "The defensible advantage of community", format: "Caption" },
      { day: "Friday", content_type: "Real Examples", topic_idea: "Analyze a thriving or failed community", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment in the community space — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week's content", format: "Planning" },
    ],
    growth_tactics: [
      "Reveal what actually makes community work to signal expertise.",
      "Teach systems that founders adopt.",
      "Make the case for community as a moat to resonate with founders.",
      "Analyze real communities to make your expertise tangible.",
      "Pin a system carousel that proves you understand community.",
    ],
    common_strategy_mistakes: [
      "Generic engagement tips. Fix: reveal non-obvious drivers.",
      "No proof or examples. Fix: analyze real communities.",
      "Framing community as soft. Fix: make the case for it as a moat.",
      "Inconsistency. Fix: batch.",
    ],
  },
  "newsletter-founders": {
    ideal_audience:
      "Potential subscribers in your niche and the sponsors and partners who monetize a newsletter. You're building a growth engine on LinkedIn that feeds your list and proves your newsletter's value.",
    strategy_pillars: [
      {
        pillar: "Repurpose Best Issues",
        description:
          "Turn your strongest newsletter content into standalone posts. This extends reach and drives subscriptions.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The most-forwarded idea from this week's issue — here's the whole thing.\"",
      },
      {
        pillar: "Prove the Value",
        description:
          "Deliver genuine insight in every post so people subscribe for more. Free value is your best conversion tool.",
        post_frequency: "1x per week",
        example_topic:
          "\"A framework my subscribers get every week — sample it here, free.\"",
      },
      {
        pillar: "Build the Brand",
        description:
          "Share your niche POV so people follow you, not just the newsletter. A distinct voice is what makes yours worth subscribing to.",
        post_frequency: "1x per week",
        example_topic:
          "\"Everyone in this space is optimizing for the wrong thing. Here's my case.\"",
      },
      {
        pillar: "Behind the Growth",
        description:
          "Share the journey and lessons of building the newsletter. This builds connection and attracts an audience.",
        post_frequency: "1x per week",
        example_topic:
          "\"From 0 to 25,000 subscribers — the three decisions that actually mattered.\"",
      },
      {
        pillar: "Curation & Taste",
        description:
          "Share what you're reading and thinking. This demonstrates the taste that makes your newsletter valuable.",
        post_frequency: "1x per week",
        example_topic:
          "\"The three things I read this week worth your time.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Build the Brand", topic_idea: "Your niche POV", format: "Caption" },
      { day: "Tuesday", content_type: "Repurpose Best Issues", topic_idea: "A standalone post from your newsletter", format: "Carousel" },
      { day: "Wednesday", content_type: "Prove the Value", topic_idea: "A genuine insight, free", format: "Carousel" },
      { day: "Thursday", content_type: "Curation & Taste", topic_idea: "What you're reading and thinking", format: "Caption" },
      { day: "Friday", content_type: "Behind the Growth", topic_idea: "A lesson from building the newsletter", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply to comments — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch repurposed content from recent issues", format: "Planning" },
    ],
    growth_tactics: [
      "Repurpose your best issues to prove value and drive subscriptions.",
      "Deliver real value in every post so people subscribe for more.",
      "Build your personal brand so people follow you, not just the newsletter.",
      "Batch repurposed content so every issue feeds your growth.",
      "Pin a high-value post with a clear subscribe CTA.",
    ],
    common_strategy_mistakes: [
      "Only announcing new issues. Fix: repurpose real value.",
      "Giving nothing away. Fix: prove worth with free insight.",
      "No distinct voice. Fix: build your brand with a niche POV.",
      "Letting issues work once. Fix: batch-repurpose.",
    ],
  },
  "content-creators": {
    ideal_audience:
      "Your target audience in your niche, plus the brands and sponsors who partner with creators who have engaged followings. You're building a distinct voice and a loyal audience that compounds across platforms.",
    strategy_pillars: [
      {
        pillar: "Signature Content",
        description:
          "Create the kind of content you want to be known for, consistently. A recognizable style and topic is what builds a following.",
        post_frequency: "2x per week",
        example_topic:
          "\"The format I've made my signature — and why it works every time.\"",
      },
      {
        pillar: "Genuine Value",
        description:
          "Give your audience something useful or entertaining every time. Value and consistency are what grow and retain a following.",
        post_frequency: "1x per week",
        example_topic:
          "\"Everything I've learned about hooks in one post.\"",
      },
      {
        pillar: "Your POV",
        description:
          "Take clear positions in your niche. A distinct point of view is what makes people follow you specifically.",
        post_frequency: "1x per week",
        example_topic:
          "\"The advice everyone in my niche repeats is quietly holding people back.\"",
      },
      {
        pillar: "Behind the Creation",
        description:
          "Share your process and journey. This builds the parasocial connection that turns viewers into a loyal audience.",
        post_frequency: "1x per week",
        example_topic:
          "\"How I went from 0 to an engaged audience — the three things that moved it.\"",
      },
      {
        pillar: "Creator Business",
        description:
          "Share how you build and monetize as a creator. This attracts both aspiring creators and brand partners.",
        post_frequency: "1x per week",
        example_topic:
          "\"How I actually make a living as a creator — the honest breakdown.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Your POV", topic_idea: "A clear position in your niche", format: "Caption" },
      { day: "Tuesday", content_type: "Signature Content", topic_idea: "Content in your recognizable style", format: "Carousel" },
      { day: "Wednesday", content_type: "Genuine Value", topic_idea: "Something useful or entertaining", format: "Carousel" },
      { day: "Thursday", content_type: "Creator Business", topic_idea: "How you build and monetize", format: "Caption" },
      { day: "Friday", content_type: "Behind the Creation", topic_idea: "Your process and journey", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply to your audience — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week's content", format: "Planning" },
    ],
    growth_tactics: [
      "Create signature content consistently so you become recognizable.",
      "Give genuine value every time to grow and retain a following.",
      "Take a distinct POV so people follow you specifically.",
      "Share your journey to build the connection that creates loyalty.",
      "Pin your best signature piece so new visitors instantly get you.",
    ],
    common_strategy_mistakes: [
      "Chasing trends with no consistent identity. Fix: build signature content.",
      "No point of view. Fix: take clear positions.",
      "Only broadcasting, never connecting. Fix: engage and share your journey.",
      "Inconsistency. Fix: batch.",
    ],
  },
  "influencers": {
    ideal_audience:
      "Your engaged niche audience and the brands that partner with influencers who have real trust with their followers. You're building the authentic authority that makes both audience and sponsors value you.",
    strategy_pillars: [
      {
        pillar: "Authentic Authority",
        description:
          "Share genuine expertise and perspective, not just lifestyle. Real authority is what makes an audience trust your recommendations.",
        post_frequency: "2x per week",
        example_topic:
          "\"Why I turned down a brand deal last week — and what it says about what I recommend.\"",
      },
      {
        pillar: "Value for the Audience",
        description:
          "Give your followers something useful. Value builds the trust that makes influence real, not just reach.",
        post_frequency: "1x per week",
        example_topic:
          "\"The thing I wish someone had told me before I started in this space.\"",
      },
      {
        pillar: "Your POV",
        description:
          "Take clear positions in your niche. A distinct voice is what makes you an influencer, not just an account.",
        post_frequency: "1x per week",
        example_topic:
          "\"An unpopular opinion in my niche that I'll defend.\"",
      },
      {
        pillar: "Behind the Scenes",
        description:
          "Share the real journey and process. Authenticity is what sustains genuine influence.",
        post_frequency: "1x per week",
        example_topic:
          "\"What building this audience actually looked like — not the highlight reel.\"",
      },
      {
        pillar: "Brand Partnerships Done Right",
        description:
          "Show how you partner with brands authentically. This attracts sponsors and reassures your audience.",
        post_frequency: "1x per week",
        example_topic:
          "\"How I choose which brands to work with — and why I say no to most.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Your POV", topic_idea: "A clear position in your niche", format: "Caption" },
      { day: "Tuesday", content_type: "Authentic Authority", topic_idea: "Genuine expertise, not lifestyle", format: "Carousel" },
      { day: "Wednesday", content_type: "Value for the Audience", topic_idea: "Something genuinely useful", format: "Carousel" },
      { day: "Thursday", content_type: "Brand Partnerships Done Right", topic_idea: "How you partner authentically", format: "Caption" },
      { day: "Friday", content_type: "Behind the Scenes", topic_idea: "The real journey and process", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply to your audience — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week's content", format: "Planning" },
    ],
    growth_tactics: [
      "Share authentic authority so your audience trusts your recommendations.",
      "Give real value to build the trust that makes influence real.",
      "Take a distinct POV to be an influencer, not just an account.",
      "Show authentic brand partnerships to attract sponsors and keep audience trust.",
      "Pin a post that captures your authentic authority.",
    ],
    common_strategy_mistakes: [
      "Only lifestyle content with no authority. Fix: share genuine expertise.",
      "Reach without trust. Fix: give real value.",
      "Inauthentic brand deals that burn trust. Fix: partner selectively and transparently.",
      "No point of view. Fix: take clear positions.",
    ],
  },
  "brand-ambassadors": {
    ideal_audience:
      "The brands seeking authentic advocates and the audience that trusts your recommendations. You're building a reputation as a credible, values-aligned voice that brands want representing them.",
    strategy_pillars: [
      {
        pillar: "Authentic Advocacy",
        description:
          "Champion products and brands you genuinely believe in, with real reasoning. Authenticity is what makes advocacy credible.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"I only represent brands I'd recommend to my closest friend. Here's why that one made the cut.\"",
      },
      {
        pillar: "Value to Your Audience",
        description:
          "Give followers useful content, not just promotion. Value is what keeps an audience trusting your recommendations.",
        post_frequency: "1x per week",
        example_topic:
          "\"How to actually choose products in this category — beyond the marketing.\"",
      },
      {
        pillar: "Your Niche Expertise",
        description:
          "Share genuine knowledge in your space. This makes your advocacy credible and attracts aligned brands.",
        post_frequency: "1x per week",
        example_topic:
          "\"After trying dozens of these, here's what actually separates good from great.\"",
      },
      {
        pillar: "Behind the Partnership",
        description:
          "Show how you choose and work with brands. This builds trust with both audience and future partners.",
        post_frequency: "1x per week",
        example_topic:
          "\"Why I say no to most partnership offers — and the two things that make me say yes.\"",
      },
      {
        pillar: "Ambassador POV",
        description:
          "Take clear positions on authentic advocacy and your niche. A distinct voice builds a reputation brands want.",
        post_frequency: "1x per week",
        example_topic:
          "\"The difference between an ambassador and an ad — and why it matters to your audience.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Ambassador POV", topic_idea: "A position on authentic advocacy", format: "Caption" },
      { day: "Tuesday", content_type: "Your Niche Expertise", topic_idea: "Genuine knowledge in your space", format: "Carousel" },
      { day: "Wednesday", content_type: "Value to Your Audience", topic_idea: "Useful content, not promotion", format: "Carousel" },
      { day: "Thursday", content_type: "Behind the Partnership", topic_idea: "How you choose and work with brands", format: "Caption" },
      { day: "Friday", content_type: "Authentic Advocacy", topic_idea: "A brand you genuinely believe in", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply to your audience — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week's content", format: "Planning" },
    ],
    growth_tactics: [
      "Champion only brands you believe in, with real reasoning, to stay credible.",
      "Give genuine value so your audience keeps trusting your recommendations.",
      "Share niche expertise to make your advocacy credible and attract aligned brands.",
      "Show how you choose partners to build trust with audience and brands.",
      "Pin a post that captures your authentic, values-aligned advocacy.",
    ],
    common_strategy_mistakes: [
      "Promoting anything for a fee, burning trust. Fix: advocate authentically.",
      "Pure promotion with no value. Fix: give useful content.",
      "No niche expertise. Fix: share genuine knowledge.",
      "No point of view. Fix: take clear positions.",
    ],
  },
  "cohort-based-course-founders": {
    ideal_audience:
      "Professionals who want a transformation, not just information — and the peers and partners in the cohort-based learning space. You're building an audience that fills each cohort and understands why live, together beats self-paced.",
    strategy_pillars: [
      {
        pillar: "Why Cohorts Work",
        description:
          "Make the case for live, together learning over self-paced courses. This positions your model and attracts people tired of unfinished courses.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"You've bought 6 self-paced courses and finished none. Here's why cohorts are different.\"",
      },
      {
        pillar: "Teach Real Value",
        description:
          "Give away genuine lessons from your curriculum. When free content teaches, people trust the transformation.",
        post_frequency: "1x per week",
        example_topic:
          "\"The core framework of my cohort — the whole thing, free.\"",
      },
      {
        pillar: "Transformation Proof",
        description:
          "Share cohort results and the community effect. This proves your program delivers change, not just content.",
        post_frequency: "1x per week",
        example_topic:
          "\"What happens in week 4 of a cohort that a video course can never replicate.\"",
      },
      {
        pillar: "Behind the Cohort",
        description:
          "Share how you design and run a transformative cohort. This fascinates and builds credibility.",
        post_frequency: "1x per week",
        example_topic:
          "\"How I design a cohort so people actually finish and get results.\"",
      },
      {
        pillar: "Learning POV",
        description:
          "Take positions on how adults actually learn and change. A distinct voice builds authority.",
        post_frequency: "1x per week",
        example_topic:
          "\"Information doesn't change behavior. Accountability and community do.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Learning POV", topic_idea: "A position on how adults learn", format: "Caption" },
      { day: "Tuesday", content_type: "Teach Real Value", topic_idea: "A lesson from your curriculum", format: "Carousel" },
      { day: "Wednesday", content_type: "Why Cohorts Work", topic_idea: "The case for live, together learning", format: "Carousel" },
      { day: "Thursday", content_type: "Behind the Cohort", topic_idea: "How you design a transformative cohort", format: "Caption" },
      { day: "Friday", content_type: "Transformation Proof", topic_idea: "A cohort result or community effect", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Reply to prospective students — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch to keep cohorts filling between launches", format: "Planning" },
    ],
    growth_tactics: [
      "Make the case for cohorts to attract people tired of unfinished self-paced courses.",
      "Give away real lessons so people trust the transformation.",
      "Share transformation proof and the community effect.",
      "Build an audience between cohorts so each launch fills faster.",
      "Pin a 'why cohorts work' carousel that frames your model.",
    ],
    common_strategy_mistakes: [
      "Selling information when you're selling transformation. Fix: make the case for cohorts.",
      "Only promoting during enrollment. Fix: build an audience continuously.",
      "Withholding value. Fix: teach real lessons.",
      "No proof. Fix: share transformation and community effects.",
    ],
  },
  "recruiters": {
    ideal_audience:
      "The candidates you want to attract and the hiring companies you want as clients. You're building a reputation as a credible, insightful voice in your niche so both sides come to you.",
    strategy_pillars: [
      {
        pillar: "Candidate Value",
        description:
          "Give job seekers genuine help — resume advice, interview insight, market reality. This attracts the candidates you want in your network.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"What I actually look for in the first 10 seconds of a resume.\"",
      },
      {
        pillar: "Hiring Insight",
        description:
          "Help companies hire better — what makes a great job post, why candidates ghost. This attracts client companies.",
        post_frequency: "1x per week",
        example_topic:
          "\"Your best candidates are dropping out at the offer stage. Here's why.\"",
      },
      {
        pillar: "Market Intelligence",
        description:
          "Share what you see in your niche's hiring market — salaries, demand, trends. This positions you as the go-to expert.",
        post_frequency: "1x per week",
        example_topic:
          "\"What's actually happening with salaries in [field] right now.\"",
      },
      {
        pillar: "Behind Recruiting",
        description:
          "Demystify how recruiting really works. This builds trust with candidates wary of recruiters.",
        post_frequency: "1x per week",
        example_topic:
          "\"Why recruiters ghost — and how to make sure I never ghost you.\"",
      },
      {
        pillar: "Recruiting POV",
        description:
          "Take positions on hiring and careers. A distinct, credible voice builds a reputation both sides trust.",
        post_frequency: "1x per week",
        example_topic:
          "\"The best candidates aren't applying. Here's how you actually reach them.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Recruiting POV", topic_idea: "A position on hiring or careers", format: "Caption" },
      { day: "Tuesday", content_type: "Candidate Value", topic_idea: "Genuine help for job seekers", format: "Carousel" },
      { day: "Wednesday", content_type: "Hiring Insight", topic_idea: "Help companies hire better", format: "Carousel" },
      { day: "Thursday", content_type: "Market Intelligence", topic_idea: "What you see in the hiring market", format: "Caption" },
      { day: "Friday", content_type: "Behind Recruiting", topic_idea: "Demystify how recruiting works", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on candidates' and clients' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week's content", format: "Planning" },
    ],
    growth_tactics: [
      "Give candidates genuine help to attract them into your network.",
      "Offer hiring insight to attract client companies.",
      "Share market intelligence to become the go-to expert in your niche.",
      "Demystify recruiting to build trust with wary candidates.",
      "Pin a value post that serves both sides of your market.",
    ],
    common_strategy_mistakes: [
      "Only posting job listings. Fix: give genuine value to both sides.",
      "Serving only clients or only candidates. Fix: build value for both.",
      "No market perspective. Fix: share intelligence.",
      "Inconsistency. Fix: batch.",
    ],
  },
  "hr-professionals": {
    ideal_audience:
      "Fellow HR practitioners, the leaders who shape people strategy, and employees who benefit from good HR. You're building authority as a strategic people leader, not an administrator.",
    strategy_pillars: [
      {
        pillar: "People Strategy",
        description:
          "Share how great people practices drive business outcomes. This positions you as strategic, not administrative.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"Your retention problem isn't pay. It's the manager relationship. Here's the data.\"",
      },
      {
        pillar: "Practical Frameworks",
        description:
          "Teach a real HR practice — feedback, onboarding, performance. This demonstrates substance to peers and leaders.",
        post_frequency: "1x per week",
        example_topic:
          "\"How to run a performance review that people don't dread — the structure.\"",
      },
      {
        pillar: "Workplace Reality",
        description:
          "Name the honest realities of work and culture. This resonates and shows you understand the human side.",
        post_frequency: "1x per week",
        example_topic:
          "\"'We're like a family' is a culture red flag. Here's what to say instead.\"",
      },
      {
        pillar: "Employee Experience",
        description:
          "Champion what actually makes work better. This builds a reputation as a people-first leader.",
        post_frequency: "1x per week",
        example_topic:
          "\"The onboarding first week that decides whether someone stays two years.\"",
      },
      {
        pillar: "HR POV",
        description:
          "Take positions on the future of work and HR. A distinct voice builds strategic authority.",
        post_frequency: "1x per week",
        example_topic:
          "\"HR's job isn't to protect the company from employees. It's the opposite.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "HR POV", topic_idea: "A position on the future of work", format: "Caption" },
      { day: "Tuesday", content_type: "People Strategy", topic_idea: "How people practices drive outcomes", format: "Carousel" },
      { day: "Wednesday", content_type: "Practical Frameworks", topic_idea: "A real HR practice, taught", format: "Carousel" },
      { day: "Thursday", content_type: "Workplace Reality", topic_idea: "An honest truth about work and culture", format: "Caption" },
      { day: "Friday", content_type: "Employee Experience", topic_idea: "What makes work genuinely better", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on HR and leadership posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week's content", format: "Planning" },
    ],
    growth_tactics: [
      "Tie people practices to business outcomes to be seen as strategic.",
      "Teach practical frameworks to demonstrate substance.",
      "Name workplace realities to resonate and show the human side.",
      "Champion employee experience to build a people-first reputation.",
      "Pin a strategy carousel that proves you operate above administration.",
    ],
    common_strategy_mistakes: [
      "Being seen as administrative. Fix: tie people practices to outcomes.",
      "Corporate-speak nobody relates to. Fix: name workplace realities.",
      "No frameworks. Fix: teach practical practices.",
      "Inconsistency. Fix: batch.",
    ],
  },
  "project-managers": {
    ideal_audience:
      "Fellow PMs, the leaders who staff and promote them, and cross-functional partners. You're building a reputation as someone who delivers under complexity — the profile that earns senior roles.",
    strategy_pillars: [
      {
        pillar: "Delivery Lessons",
        description:
          "Turn real project challenges into teaching content — the scope creep, the stakeholder conflict, the recovery. Lived examples beat methodology summaries.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The project was three weeks behind. Here's how I got it back without burning the team.\"",
      },
      {
        pillar: "Frameworks from Practice",
        description:
          "Extract a reusable framework from a real project. This positions you as a practitioner-thinker.",
        post_frequency: "1x per week",
        example_topic:
          "\"My 3-question test before agreeing to any deadline.\"",
      },
      {
        pillar: "Managing People & Politics",
        description:
          "Share the soft-skill realities — influencing without authority, managing stakeholders. This is the real job and what senior roles hire for.",
        post_frequency: "1x per week",
        example_topic:
          "\"Managing up is 80% of the PM job nobody trains you for. Here's what I've learned.\"",
      },
      {
        pillar: "Honest Failures",
        description:
          "Share a project that went wrong and what you learned. Reflecting on a miss signals maturity.",
        post_frequency: "1x per week",
        example_topic:
          "\"I shipped a project everyone hated. The plan was perfect. The communication wasn't.\"",
      },
      {
        pillar: "PM POV",
        description:
          "Take positions on project management practice. A distinct voice builds reputation.",
        post_frequency: "1x per week",
        example_topic:
          "\"Most status meetings are theater. Here's what I replaced ours with.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "PM POV", topic_idea: "A position on PM practice", format: "Caption" },
      { day: "Tuesday", content_type: "Delivery Lesson", topic_idea: "A real project challenge, taught", format: "Carousel" },
      { day: "Wednesday", content_type: "Frameworks from Practice", topic_idea: "A reusable framework from a project", format: "Carousel" },
      { day: "Thursday", content_type: "Managing People & Politics", topic_idea: "A soft-skill reality of the job", format: "Caption" },
      { day: "Friday", content_type: "Honest Failure", topic_idea: "A project that went wrong and the lesson", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on PMs' and leaders' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week from your projects", format: "Planning" },
    ],
    growth_tactics: [
      "Turn real delivery challenges into teaching posts grounded in practice.",
      "Share the people-and-politics side — what senior roles actually hire for.",
      "Reflect on failures to signal maturity.",
      "Batch so reputation-building survives busy delivery periods.",
      "Pin a framework carousel that shows how you think.",
    ],
    common_strategy_mistakes: [
      "Reciting methodology instead of lived lessons. Fix: teach from real projects.",
      "Ignoring the soft-skill reality. Fix: share managing people and politics.",
      "Only wins. Fix: reflect on failures.",
      "Inconsistency. Fix: batch.",
    ],
  },
  "business-analysts": {
    ideal_audience:
      "Fellow analysts, the product and business leaders who value clear thinking, and the stakeholders you serve. You're building a reputation as someone who turns ambiguity into clarity — the profile that earns influence.",
    strategy_pillars: [
      {
        pillar: "Turn Ambiguity into Clarity",
        description:
          "Show how you take a messy problem and structure it. This is the core BA skill and proves your value.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"'The system is slow' isn't a requirement. Here's how I turn it into one.\"",
      },
      {
        pillar: "Frameworks & Methods",
        description:
          "Teach a real method — requirements gathering, process mapping, stakeholder analysis. This demonstrates substance.",
        post_frequency: "1x per week",
        example_topic:
          "\"The 5 questions that surface the requirement nobody stated.\"",
      },
      {
        pillar: "Bridge Business & Tech",
        description:
          "Share how you translate between stakeholders and engineers. This shows the rare communication skill that gets analysts promoted.",
        post_frequency: "1x per week",
        example_topic:
          "\"Engineering and the business heard the same meeting differently. Here's how I bridged it.\"",
      },
      {
        pillar: "Honest Lessons",
        description:
          "Share a project where the requirements were wrong and what you learned. This signals real judgment.",
        post_frequency: "1x per week",
        example_topic:
          "\"We built exactly what was asked. It was the wrong thing. Here's what I missed.\"",
      },
      {
        pillar: "BA POV",
        description:
          "Take positions on analysis and requirements. A distinct voice builds reputation.",
        post_frequency: "1x per week",
        example_topic:
          "\"Most requirements documents are where clarity goes to die. Here's the alternative.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "BA POV", topic_idea: "A position on analysis practice", format: "Caption" },
      { day: "Tuesday", content_type: "Turn Ambiguity into Clarity", topic_idea: "Structuring a messy problem", format: "Carousel" },
      { day: "Wednesday", content_type: "Frameworks & Methods", topic_idea: "A real BA method, taught", format: "Carousel" },
      { day: "Thursday", content_type: "Bridge Business & Tech", topic_idea: "Translating between stakeholders", format: "Caption" },
      { day: "Friday", content_type: "Honest Lesson", topic_idea: "A requirements miss and the lesson", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on analysts' and PMs' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch next week from your work", format: "Planning" },
    ],
    growth_tactics: [
      "Show how you turn ambiguity into clarity — the core skill that proves your value.",
      "Share how you bridge business and tech — the skill that gets analysts promoted.",
      "Reflect on requirements misses to signal judgment.",
      "Batch so reputation-building survives busy periods.",
      "Pin a clarity carousel that demonstrates your thinking.",
    ],
    common_strategy_mistakes: [
      "Dry methodology posts. Fix: show real ambiguity-to-clarity work.",
      "Ignoring the translation skill. Fix: share how you bridge business and tech.",
      "Only wins. Fix: reflect on misses.",
      "Inconsistency. Fix: batch.",
    ],
  },
  "biotech-founders": {
    ideal_audience:
      "Investors who understand long timelines, mission-driven scientific talent, and partners in the biotech ecosystem. You're building credibility by making complex science compelling and showing progress across capital-heavy, slow-moving development.",
    strategy_pillars: [
      {
        pillar: "Make the Science Compelling",
        description:
          "Translate your complex science into a clear, compelling story. This is what attracts investors and talent who can't follow the jargon.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"What our therapy actually does, explained without a single acronym.\"",
      },
      {
        pillar: "The Mission & Why Now",
        description:
          "Share the problem you exist to solve and why the moment is right. Mission attracts patient capital and believers.",
        post_frequency: "1x per week",
        example_topic:
          "\"The disease we're taking on affects millions. Here's why it's finally solvable.\"",
      },
      {
        pillar: "Progress & Milestones",
        description:
          "Show momentum across long timelines. In capital-heavy biotech, visible progress reassures investors and sustains belief.",
        post_frequency: "1x per week",
        example_topic:
          "\"A milestone most people don't understand the significance of — here's why it matters.\"",
      },
      {
        pillar: "Building in Hard Tech",
        description:
          "Share the honest reality of building biotech — the timelines, the science, the regulatory path. This attracts talent and investors who respect the difficulty.",
        post_frequency: "1x per week",
        example_topic:
          "\"Why biotech takes a decade — and why that's the point, not the problem.\"",
      },
      {
        pillar: "Biotech POV",
        description:
          "Take positions on the field and its future. A distinct voice builds a following of believers.",
        post_frequency: "1x per week",
        example_topic:
          "\"The next decade of medicine will be defined by one shift most are underestimating.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "Biotech POV", topic_idea: "A position on the field's future", format: "Caption" },
      { day: "Tuesday", content_type: "Make the Science Compelling", topic_idea: "Your science, made clear", format: "Carousel" },
      { day: "Wednesday", content_type: "The Mission & Why Now", topic_idea: "The problem and why the moment is right", format: "Carousel" },
      { day: "Thursday", content_type: "Building in Hard Tech", topic_idea: "The honest reality of building biotech", format: "Caption" },
      { day: "Friday", content_type: "Progress & Milestones", topic_idea: "A milestone and its significance", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on investors' and scientists' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch across long development timelines", format: "Planning" },
    ],
    growth_tactics: [
      "Translate complex science into a compelling story for investors and talent.",
      "Lead with mission and 'why now' to attract patient capital and believers.",
      "Show progress across long timelines to reassure investors and sustain belief.",
      "Batch so visibility holds across capital-heavy, slow-moving development.",
      "Pin a science-made-clear carousel that makes your work feel real and fundable.",
    ],
    common_strategy_mistakes: [
      "Dense scientific jargon that reassures no one. Fix: make the science compelling.",
      "Going silent across long timelines. Fix: show momentum-building progress.",
      "Hiding the mission. Fix: lead with why it matters and why now.",
      "Too busy building to tell the story. Fix: batch it.",
    ],
  },
  "medtech-founders": {
    ideal_audience:
      "Investors, clinicians, health systems, and mission-driven talent. You're building credibility by making complex medical technology clear and showing you understand both the science and the realities of healthcare.",
    strategy_pillars: [
      {
        pillar: "Make the Technology Clear",
        description:
          "Translate your medical technology into a clear story of patient impact. This attracts investors, clinicians, and talent.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"What our device actually does for a patient — in plain terms.\"",
      },
      {
        pillar: "The Clinical Problem",
        description:
          "Share the real clinical problem you solve and why it matters. Grounding in patient and clinician reality builds credibility.",
        post_frequency: "1x per week",
        example_topic:
          "\"The gap in care our tech closes — and the cost of leaving it open.\"",
      },
      {
        pillar: "Navigating Healthcare",
        description:
          "Share the honest reality of building in medtech — regulation, clinical validation, adoption. This attracts talent and investors who respect the difficulty.",
        post_frequency: "1x per week",
        example_topic:
          "\"Why medtech adoption is slow — and the one thing that actually moves a health system.\"",
      },
      {
        pillar: "Progress & Validation",
        description:
          "Show milestones — trials, approvals, partnerships. Visible progress reassures a cautious ecosystem.",
        post_frequency: "1x per week",
        example_topic:
          "\"A clinical milestone that de-risks everything — here's why it matters.\"",
      },
      {
        pillar: "MedTech POV",
        description:
          "Take positions on healthcare technology and its future. A distinct voice builds believers.",
        post_frequency: "1x per week",
        example_topic:
          "\"The future of care isn't more apps. Here's what actually changes outcomes.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "MedTech POV", topic_idea: "A position on healthcare technology", format: "Caption" },
      { day: "Tuesday", content_type: "Make the Technology Clear", topic_idea: "Your tech and patient impact, clear", format: "Carousel" },
      { day: "Wednesday", content_type: "The Clinical Problem", topic_idea: "The real problem you solve", format: "Carousel" },
      { day: "Thursday", content_type: "Navigating Healthcare", topic_idea: "The honest reality of building medtech", format: "Caption" },
      { day: "Friday", content_type: "Progress & Validation", topic_idea: "A milestone and why it matters", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on clinicians' and investors' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch across long development timelines", format: "Planning" },
    ],
    growth_tactics: [
      "Translate complex technology into a clear story of patient impact.",
      "Ground content in the clinical problem to build credibility with clinicians and investors.",
      "Show validation milestones to reassure a cautious ecosystem.",
      "Batch so visibility holds across long regulatory and development timelines.",
      "Pin a technology-made-clear carousel that shows real patient impact.",
    ],
    common_strategy_mistakes: [
      "Jargon that reassures no one. Fix: make the technology clear.",
      "Ignoring clinical and adoption reality. Fix: show you understand healthcare.",
      "Going silent across long timelines. Fix: show validation progress.",
      "Too busy building to tell the story. Fix: batch it.",
    ],
  },
  "legaltech-founders": {
    ideal_audience:
      "Investors, lawyers and legal teams, and mission-driven talent. You're building credibility by showing you understand both the technology and the notoriously change-resistant legal industry.",
    strategy_pillars: [
      {
        pillar: "Solve a Real Legal Pain",
        description:
          "Lead with the specific pain your product solves for legal professionals, not a tech pitch. Lawyers detect hype and respond to genuine understanding of their work.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The task eating 10 hours of every associate's week — and why nobody's fixed it.\"",
      },
      {
        pillar: "Understand the Industry",
        description:
          "Show you understand why legal is change-resistant and how to work with it. This builds credibility with a skeptical market.",
        post_frequency: "1x per week",
        example_topic:
          "\"Selling software to lawyers is brutal. Here's what we learned the hard way.\"",
      },
      {
        pillar: "Building in LegalTech",
        description:
          "Share the honest reality of building for a conservative, high-stakes industry. This attracts talent and investors who respect the difficulty.",
        post_frequency: "1x per week",
        example_topic:
          "\"Why 'move fast and break things' is a disaster in legal — and what replaces it.\"",
      },
      {
        pillar: "Progress & Adoption",
        description:
          "Show milestones and real adoption. In a skeptical market, proof of traction reassures investors and buyers.",
        post_frequency: "1x per week",
        example_topic:
          "\"A firm that swore they'd never adopt now runs their whole intake on us. Here's how.\"",
      },
      {
        pillar: "LegalTech POV",
        description:
          "Take positions on the future of legal work. A distinct voice builds believers.",
        post_frequency: "1x per week",
        example_topic:
          "\"AI won't replace lawyers. It'll replace the lawyers who ignore it.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "LegalTech POV", topic_idea: "A position on the future of legal work", format: "Caption" },
      { day: "Tuesday", content_type: "Solve a Real Legal Pain", topic_idea: "A specific legal pain you solve", format: "Carousel" },
      { day: "Wednesday", content_type: "Understand the Industry", topic_idea: "Why legal resists change and how to work with it", format: "Carousel" },
      { day: "Thursday", content_type: "Building in LegalTech", topic_idea: "The honest reality of building here", format: "Caption" },
      { day: "Friday", content_type: "Progress & Adoption", topic_idea: "A milestone or real adoption story", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on lawyers' and investors' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch through the build cycle", format: "Planning" },
    ],
    growth_tactics: [
      "Lead with real legal pain, not a tech pitch, so lawyers trust you understand their work.",
      "Show you understand the change-resistant industry to build credibility.",
      "Share adoption proof to reassure a skeptical market.",
      "Batch so credibility-building survives a demanding build cycle.",
      "Pin a real-pain carousel that shows you get the legal world.",
    ],
    common_strategy_mistakes: [
      "Pitching tech to lawyers who detect hype. Fix: lead with their real pain.",
      "Ignoring why legal resists change. Fix: show industry understanding.",
      "No adoption proof in a skeptical market. Fix: share traction.",
      "Going silent building. Fix: batch.",
    ],
  },
  "proptech-founders": {
    ideal_audience:
      "Investors, real estate professionals and firms, and mission-driven talent. You're building credibility by showing you understand both the technology and the relationship-driven, slow-moving property industry.",
    strategy_pillars: [
      {
        pillar: "Solve a Real Property Pain",
        description:
          "Lead with the specific pain your product solves for the industry, not a tech pitch. Real estate is relationship-driven and responds to genuine understanding.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The manual process every property manager hates — and why it's still manual.\"",
      },
      {
        pillar: "Understand the Industry",
        description:
          "Show you understand how the property industry actually works and why it adopts slowly. This builds credibility.",
        post_frequency: "1x per week",
        example_topic:
          "\"Real estate doesn't buy software. It buys trust. Here's what that changed for us.\"",
      },
      {
        pillar: "Building in PropTech",
        description:
          "Share the honest reality of building for a traditional, relationship-heavy industry. This attracts talent and investors who respect the difficulty.",
        post_frequency: "1x per week",
        example_topic:
          "\"Why proptech sales cycles are brutal — and the one thing that shortens them.\"",
      },
      {
        pillar: "Progress & Adoption",
        description:
          "Show milestones and real adoption. Proof of traction reassures a cautious industry and investors.",
        post_frequency: "1x per week",
        example_topic:
          "\"A brokerage that resisted for a year now can't work without us. Here's the tipping point.\"",
      },
      {
        pillar: "PropTech POV",
        description:
          "Take positions on the future of real estate technology. A distinct voice builds believers.",
        post_frequency: "1x per week",
        example_topic:
          "\"The future of real estate isn't more listings tech. Here's the actual opportunity.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "PropTech POV", topic_idea: "A position on the future of property tech", format: "Caption" },
      { day: "Tuesday", content_type: "Solve a Real Property Pain", topic_idea: "A specific industry pain you solve", format: "Carousel" },
      { day: "Wednesday", content_type: "Understand the Industry", topic_idea: "How property works and why it adopts slowly", format: "Carousel" },
      { day: "Thursday", content_type: "Building in PropTech", topic_idea: "The honest reality of building here", format: "Caption" },
      { day: "Friday", content_type: "Progress & Adoption", topic_idea: "A milestone or adoption story", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on real estate pros' and investors' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch through the build cycle", format: "Planning" },
    ],
    growth_tactics: [
      "Lead with real property pain, not a tech pitch, so the industry trusts you get it.",
      "Show you understand the relationship-driven, slow-adopting industry.",
      "Share adoption proof to reassure a cautious market.",
      "Batch so credibility-building survives a demanding build cycle.",
      "Pin a real-pain carousel that shows you understand real estate.",
    ],
    common_strategy_mistakes: [
      "Pitching tech to a relationship-driven industry. Fix: lead with real pain and trust.",
      "Ignoring slow adoption dynamics. Fix: show industry understanding.",
      "No adoption proof. Fix: share traction.",
      "Going silent building. Fix: batch.",
    ],
  },
  "hrtech-founders": {
    ideal_audience:
      "Investors, HR and people leaders, and mission-driven talent. You're building credibility by showing you understand both the technology and the human, trust-sensitive world of people operations.",
    strategy_pillars: [
      {
        pillar: "Solve a Real People-Ops Pain",
        description:
          "Lead with the specific pain your product solves for HR teams, not a tech pitch. People leaders respond to genuine understanding of their work.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The onboarding chaos every HR team lives with — and why the tools don't fix it.\"",
      },
      {
        pillar: "Understand People & Work",
        description:
          "Show you understand the human side of HR, not just the software. This builds credibility with a people-first buyer.",
        post_frequency: "1x per week",
        example_topic:
          "\"HR software fails when it forgets HR is about people, not process. Here's our approach.\"",
      },
      {
        pillar: "Building in HRTech",
        description:
          "Share the honest reality of building for people teams — trust, data sensitivity, adoption. This attracts talent and investors who respect the difficulty.",
        post_frequency: "1x per week",
        example_topic:
          "\"Selling to HR means selling trust with sensitive data. Here's what we learned.\"",
      },
      {
        pillar: "Progress & Adoption",
        description:
          "Show milestones and real adoption. Proof reassures a cautious, trust-sensitive market.",
        post_frequency: "1x per week",
        example_topic:
          "\"A people team that runs everything on us now — here's what won them over.\"",
      },
      {
        pillar: "HRTech POV",
        description:
          "Take positions on the future of work and people technology. A distinct voice builds believers.",
        post_frequency: "1x per week",
        example_topic:
          "\"The future of HR tech isn't automation. It's giving managers better judgment.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "HRTech POV", topic_idea: "A position on the future of people tech", format: "Caption" },
      { day: "Tuesday", content_type: "Solve a Real People-Ops Pain", topic_idea: "A specific HR pain you solve", format: "Carousel" },
      { day: "Wednesday", content_type: "Understand People & Work", topic_idea: "The human side of HR", format: "Carousel" },
      { day: "Thursday", content_type: "Building in HRTech", topic_idea: "The honest reality of building here", format: "Caption" },
      { day: "Friday", content_type: "Progress & Adoption", topic_idea: "A milestone or adoption story", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on HR leaders' and investors' posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch through the build cycle", format: "Planning" },
    ],
    growth_tactics: [
      "Lead with real people-ops pain, not a tech pitch, so HR leaders trust you get it.",
      "Show you understand the human side of HR to build credibility.",
      "Share adoption proof to reassure a trust-sensitive market.",
      "Batch so credibility-building survives a demanding build cycle.",
      "Pin a real-pain carousel that shows you understand people operations.",
    ],
    common_strategy_mistakes: [
      "Pitching tech to a people-first buyer. Fix: lead with real pain and the human side.",
      "Ignoring data-trust sensitivity. Fix: show you understand it.",
      "No adoption proof. Fix: share traction.",
      "Going silent building. Fix: batch.",
    ],
  },
  "cleantech-founders": {
    ideal_audience:
      "Patient investors, mission-driven scientific and engineering talent, and partners in the climate ecosystem. You're building credibility by making your climate mission and science compelling and showing momentum across long, capital-heavy timelines.",
    strategy_pillars: [
      {
        pillar: "The Climate Mission",
        description:
          "Share the problem you exist to solve and why now is the moment. Mission attracts patient capital and mission-driven talent.",
        post_frequency: "1–2x per week",
        example_topic:
          "\"The climate problem we're taking on is solvable — and the window is now.\"",
      },
      {
        pillar: "Make the Science Clear",
        description:
          "Translate your technology into a clear, optimistic story. This attracts investors and talent who can't follow the technical detail.",
        post_frequency: "1x per week",
        example_topic:
          "\"How our technology actually removes carbon — without the jargon.\"",
      },
      {
        pillar: "Building Hard Climate Tech",
        description:
          "Share the honest reality of capital-intensive, long-timeline cleantech. This attracts believers who respect the difficulty.",
        post_frequency: "1x per week",
        example_topic:
          "\"Why hard climate tech takes a decade — and why that's the point.\"",
      },
      {
        pillar: "Progress & Momentum",
        description:
          "Show milestones across long timelines. Visible progress keeps investors and talent believing.",
        post_frequency: "1x per week",
        example_topic:
          "\"A milestone that de-risks the whole path — here's why it matters.\"",
      },
      {
        pillar: "CleanTech POV",
        description:
          "Take grounded positions on climate technology and its future. A distinct voice builds a community of believers.",
        post_frequency: "1x per week",
        example_topic:
          "\"The climate solution everyone's hyping won't scale. Here's what actually will.\"",
      },
    ],
    posting_schedule: [
      { day: "Monday", content_type: "CleanTech POV", topic_idea: "A grounded position on climate tech", format: "Caption" },
      { day: "Tuesday", content_type: "The Climate Mission", topic_idea: "The problem and why now is the moment", format: "Carousel" },
      { day: "Wednesday", content_type: "Make the Science Clear", topic_idea: "Your technology, made clear and optimistic", format: "Carousel" },
      { day: "Thursday", content_type: "Building Hard Climate Tech", topic_idea: "The honest reality of long timelines", format: "Caption" },
      { day: "Friday", content_type: "Progress & Momentum", topic_idea: "A milestone and its significance", format: "Image" },
      { day: "Saturday", content_type: "Engage only", topic_idea: "Comment on investors' and climate posts — no new post", format: "Engagement" },
      { day: "Sunday", content_type: "Rest / plan", topic_idea: "Batch across long development timelines", format: "Planning" },
    ],
    growth_tactics: [
      "Lead with the climate mission and 'why now' to attract patient capital and believers.",
      "Make the science clear and optimistic for investors and talent.",
      "Show momentum across long timelines to sustain belief.",
      "Batch so visibility holds across capital-heavy, slow-moving development.",
      "Pin a mission carousel that makes your climate solution feel real and fundable.",
    ],
    common_strategy_mistakes: [
      "Dense science that obscures the mission. Fix: make it clear and compelling.",
      "Going silent across long timelines. Fix: show momentum-building progress.",
      "Hiding the mission. Fix: lead with why it matters and why now.",
      "Too busy building to tell the story. Fix: batch it.",
    ],
  },
}
