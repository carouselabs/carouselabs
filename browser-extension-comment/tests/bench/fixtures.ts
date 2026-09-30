// Test data shared by the Generate benchmarks: real system profiles, as seeded
// (scripts/seed-comment-profiles.js), and three realistic LinkedIn posts.

export const PROFILES = [
  {
    id: "sys-thoughtful-expert",
    name: "Thoughtful Expert",
    whoIAm: "An experienced professional in this field who adds real value",
    goal: "adds one useful insight",
    tone: "professional",
    length: "Medium (2-3 lines)",
    emoji: "None",
    language: "English",
    alwaysDo: null,
    neverDo: null,
    samples: [],
  },
  {
    id: "sys-supportive-peer",
    name: "Supportive Peer",
    whoIAm: "A peer in the same field who relates to the poster's experience",
    goal: "agrees and adds a personal angle",
    tone: "friendly",
    length: "Short (1-2 lines)",
    emoji: "None",
    language: "English",
    alwaysDo: null,
    neverDo: null,
    samples: [],
  },
  {
    id: "sys-carouselabs-top-relevance",
    name: "CarouseLabs — Top Relevance Format",
    whoIAm:
      "Someone who writes comments LinkedIn's algorithm favors. Structured, specific, and genuinely adds value to the conversation",
    goal: "Build authority and maximize engagement",
    tone: "Professional",
    length: "100-220 characters",
    emoji: "None",
    language: "English",
    alwaysDo:
      "Follow this exact structure in order: 1) A specific observation about something in the post, 2) Your own unique insight or a brief real example, 3) A practical implication - why this matters, 4) An optional question at the end when it fits naturally. Keep it to a maximum of 2-3 lines total. Use simple, plain English. Adapt specifically to what THIS post actually says.",
    neverDo: "Don't skip the specific observation. Don't exceed 2-3 lines. Don't use complex vocabulary.",
    samples: [
      "The point about hiring for adaptability over experience stands out. Listing years of experience may screen for the wrong thing. That changes what a strong hire looks like. Does this hold for senior roles?",
      "The personalized outreach result is the key detail here. It shows relevance beating volume, since a smaller list with real context did better than a bigger generic one. Generic templates are losing ground for a reason.",
    ],
  },
  {
    id: "sys-carouselabs-quick-human",
    name: "CarouseLabs — Quick Human",
    whoIAm: "Someone who reacts fast and genuine, like texting a friend. Not someone writing an essay",
    goal: "Quick genuine reaction",
    tone: "Casual",
    length: "15-45 characters",
    emoji: "None",
    language: "English",
    alwaysDo:
      "Use lowercase like a real text message. Use dashes or '...' instead of commas. Sound like something typed fast on a phone, not composed. Even though this is a quick reaction, still reference the post's topic briefly if possible. Don't be purely generic.",
    neverDo: "No commas, no proper capitalization at the start. No hashtags. No corporate/polished phrasing.",
    samples: ["okay this one got me", "needed this today fr", "saving this for later", "no notes... just facts", "wait why is this so true", "big one right here"],
  },
];

export const POSTS = [
  {
    author: "Priya Raman",
    headline: "Head of Growth at a B2B SaaS company",
    type: "text",
    url: "https://www.linkedin.com/feed/update/urn:li:activity:1",
    text: "We cut our onboarding from 14 steps to 5 last quarter. Activation went from 31% to 48%.\n\nThe biggest win wasn't removing steps. It was moving the \"invite your team\" prompt to AFTER the first real result. People invite teammates when they have something to show, not before.\n\nIf your activation is stuck, look at the order of your steps before you look at the number of them.",
  },
  {
    author: "Daniel Okafor",
    headline: "Engineering Manager | Building high-trust teams",
    type: "text",
    url: "https://www.linkedin.com/feed/update/urn:li:activity:2",
    text: "The best feedback I ever got as a new manager came from a junior engineer.\n\nShe told me my 1:1s felt like status updates. She was right. I was asking \"what are you working on?\" when I should have been asking \"what's getting in your way?\"\n\nI changed one question. Within a month, people started bringing me problems early instead of late. Nothing else about the meeting changed.\n\nManagers: your team already knows what you should fix. The question is whether you've made it safe for them to say it.",
  },
  {
    author: "Maya Lindqvist",
    headline: "Talent Partner | Hiring for early-stage startups",
    type: "text",
    url: "https://www.linkedin.com/feed/update/urn:li:activity:3",
    text: "I reviewed 600 applications for a single product role last month. Here's what stood out.\n\n1. About 70% of CVs now read like the same AI draft. Same verbs, same structure, same \"spearheaded cross-functional initiatives\".\n2. The candidates who got interviews almost all did one thing: they described a specific decision they made and what happened after.\n3. Portfolio links beat long CVs every time. A 2-minute Loom walking through a real project got more attention than 3 pages of bullet points.\n\nThe tools make everyone sound polished. That's exactly why specifics matter more than ever. If a hiring manager can't tell your application apart from 400 others, polish won't save it.\n\nWhat's one specific thing you've seen make a candidate stand out recently?",
  },
];
