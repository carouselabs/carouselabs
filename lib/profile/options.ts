// lib/profile/options.ts
// Shared option sets for onboarding + settings. Kept in one place so the
// Settings Profile tab edits exactly the same fields onboarding captured.

export const ROLES = [
  { id: "founder", label: "Founder / Entrepreneur", emoji: "🚀" },
  { id: "creator", label: "Content Creator", emoji: "✨" },
  { id: "freelancer", label: "Freelancer", emoji: "💼" },
  { id: "operator", label: "Operator / Manager", emoji: "⚙️" },
  { id: "consultant", label: "Consultant", emoji: "🎯" },
  { id: "executive", label: "Executive / CXO", emoji: "👔" },
  { id: "other", label: "Other", emoji: "🌟" },
] as const

export const INDUSTRIES = [
  "Technology & SaaS",
  "Marketing & Advertising",
  "Finance & Investing",
  "E-commerce & Retail",
  "Healthcare & Wellness",
  "Education & EdTech",
  "Real Estate",
  "Legal & Compliance",
  "HR & Recruiting",
  "Consulting & Coaching",
  "Design & Creative",
  "Media & Entertainment",
  "Nonprofit & Social Impact",
  "Manufacturing & Supply Chain",
  "Food & Hospitality",
  "Travel & Tourism",
  "Sports & Fitness",
  "Sustainability & Climate",
  "Blockchain & Web3",
  "AI & Data Science",
  "Cybersecurity",
  "Logistics & Operations",
] as const

export const TOPIC_SUGGESTIONS = [
  "Leadership",
  "Personal Branding",
  "Entrepreneurship",
  "Marketing Strategy",
  "Productivity",
  "Career Growth",
  "AI & Technology",
  "Sales",
  "Remote Work",
  "Company Culture",
  "Fundraising",
  "Content Creation",
] as const

export const TOPICS_MIN = 3
export const TOPICS_MAX = 7

export const SENIORITY = [
  "Entry-level",
  "Mid-level",
  "Senior",
  "Manager",
  "Director",
  "Executive / C-suite",
] as const

export const GOALS = [
  { id: "brand", label: "Build personal brand", description: "Become the go-to voice in your niche", emoji: "🌟" },
  { id: "leads", label: "Generate leads & clients", description: "Turn followers into paying customers", emoji: "💰" },
  { id: "followers", label: "Grow my audience", description: "Increase reach and follower count", emoji: "📈" },
  { id: "thought-leadership", label: "Establish thought leadership", description: "Be seen as a credible industry expert", emoji: "🎓" },
  { id: "educate", label: "Educate my audience", description: "Share knowledge and help others level up", emoji: "📚" },
] as const

export const TONES = [
  { id: "professional", label: "Professional & Authoritative", description: "Credible, polished, data-backed" },
  { id: "conversational", label: "Conversational & Relatable", description: "Approachable, story-driven, human" },
  { id: "inspirational", label: "Inspirational & Motivational", description: "Energizing, visionary, empowering" },
  { id: "educational", label: "Educational & Informative", description: "Clear, structured, value-first" },
  { id: "bold", label: "Bold & Provocative", description: "Contrarian, direct, opinion-heavy" },
] as const

// ── Shared data shapes ───────────────────────────────────────────

export interface VoicePreset {
  id: string
  name: string
  tones: string[]
}

export const MAX_VOICE_PRESETS = 5

// The normalized profile shape returned by GET /api/profile and consumed by
// the settings pages (mirrors the onboarding fields).
export interface ProfileData {
  role: string
  industry: string
  niche: string
  topics: string[]
  audienceRole: string
  audienceSeniority: string
  audienceIndustry: string
  coreProblem: string
  goals: string[]
  primaryGoal: string
  tones: string[]
  voicePresets: VoicePreset[]
  email: string
  plan: "FREE" | "PRO"
}

export function toneLabel(id: string): string {
  return TONES.find((t) => t.id === id)?.label ?? id
}
