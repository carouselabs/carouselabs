// EXAMPLE DATA for the design preview only. Never imported by real pages,
// never sent to an API. People and emails are fictional (example.com).

import type { IdeaCategory } from "@/components/patterns/IdeaCard"

export const exampleIdeas: { id: string; category: IdeaCategory; hook: string; postType: string }[] = [
  { id: "i1", category: "news", hook: "A new EU rule changes how SaaS companies store customer data. Here's what founders need to do this quarter.", postType: "Explainer" },
  { id: "i2", category: "news", hook: "Remote hiring just hit a two-year high. Three things that changed in how teams interview.", postType: "List post" },
  { id: "i3", category: "news", hook: "Another big AI model launched this week. Most teams don't need it — here's how to tell.", postType: "Hot take" },
  { id: "i4", category: "trending", hook: "Your users don't leave on day one. They leave on day two.", postType: "List post" },
  { id: "i5", category: "trending", hook: "I stopped sending weekly reports. Our team started reading them again.", postType: "Story" },
  { id: "i6", category: "trending", hook: "The best onboarding I've seen this year had no product tour at all.", postType: "Hot take" },
  { id: "i7", category: "industry", hook: "Pricing pages that convert all answer one question in the first five seconds.", postType: "Educational" },
  { id: "i8", category: "industry", hook: "What a 15-minute customer call teaches you that a dashboard never will.", postType: "Story" },
  { id: "i9", category: "industry", hook: "Five signs your B2B content is written for your team, not your buyer.", postType: "List post" },
  { id: "i10", category: "random", hook: "The most useful feedback I ever got was one sentence long.", postType: "Story" },
]

export const exampleSuggestions = [
  "A lesson I learned the hard way",
  "What's trending in my industry today",
  "A common myth in my field, debunked",
]

export type ExampleUser = {
  id: string
  name: string
  email: string
  plan: "Free" | "Pro" | "Growth"
  credits: string
  status: "active" | "past_due" | "cancelled"
  joined: string
}

export const exampleUsers: ExampleUser[] = [
  { id: "u1", name: "Aarav Mehta", email: "aarav@example.com", plan: "Pro", credits: "642 / 1,000", status: "active", joined: "Sep 28, 2026" },
  { id: "u2", name: "Sofia Laurent", email: "sofia.laurent@example.com", plan: "Growth", credits: "1,820 / 2,000", status: "active", joined: "Sep 22, 2026" },
  { id: "u3", name: "Kenji Watanabe", email: "kenji@example.com", plan: "Free", credits: "10 / 25", status: "active", joined: "Sep 19, 2026" },
  { id: "u4", name: "Maya Okonkwo-Richardson", email: "maya.okonkwo.richardson.longname@example.com", plan: "Pro", credits: "0 / 1,000", status: "past_due", joined: "Sep 11, 2026" },
  { id: "u5", name: "Liam Novak", email: "liam@example.com", plan: "Pro", credits: "318 / 1,000", status: "cancelled", joined: "Aug 30, 2026" },
  { id: "u6", name: "Ishita Rao", email: "ishita@example.com", plan: "Free", credits: "25 / 25", status: "active", joined: "Aug 24, 2026" },
]
