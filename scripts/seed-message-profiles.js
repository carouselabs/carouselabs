/* eslint-disable */
// scripts/seed-message-profiles.js — one-time (but idempotent) seed for the
// built-in Conversation Assistant profiles (isSystem: true, userId: null —
// shared by every user, never owned by one). Same pattern as
// scripts/seed-connection-profiles.js; fixed, human-readable ids so
// re-running upserts rather than duplicating.
//
// Run with: node scripts/seed-message-profiles.js
const { PrismaClient } = require("@prisma/client")

const db = new PrismaClient()

// Deliberately NO DIGITS in any sample: the message route rejects figures
// that don't appear in the conversation or the contact's profile, so a
// sample containing one would teach the model to invent them.
const SYSTEM_PROFILES = [
  {
    id: "sys-msg-warm-intro",
    name: "Warm Intro / Relationship Builder",
    goal:
      "Building a genuine professional relationship with this person. No pitch, no ask — just staying in touch, sharing real thoughts, and letting the relationship develop on its own timeline.",
    tone: "Natural, warm, unhurried",
    alwaysDo:
      "Respond to what they actually said. Add a genuine thought or question of your own. Let the conversation breathe — it's fine for a reply to be short.",
    neverDo:
      "No pitching what you do. No asking for a call or a favour. No corporate networking language.",
    samples: [
      "That's a sharp way to put it. I've been thinking about the same shift in our space, mostly wondering how teams actually change habits once they see it.",
      "Good to hear from you. Been meaning to ask how the new role's going, especially the part you mentioned about rebuilding the team.",
    ],
    isRecommended: true,
    isDefault: true,
  },
  {
    id: "sys-msg-lead",
    name: "Lead — Understand Their Situation",
    goal:
      "This is a potential client or lead. Keep it conversational, not salesy: understand what they're actually dealing with before proposing anything. The goal right now is a real conversation, not a pitch.",
    tone: "Professional, curious, low-pressure",
    alwaysDo:
      "Ask about their specific situation or ask a genuine follow-up to what they said. Make it easy for them to say a little or a lot.",
    neverDo:
      "No pitching a product or service in the first few messages. No 'quick call?' asks before there's a real conversation. No assuming their problem — ask.",
    samples: [
      "Makes sense. When you say the handoffs are the painful part, is that mostly between sales and delivery, or earlier than that too?",
      "That tracks with what I hear from a lot of teams your size. Curious what you've already tried for it, if anything.",
    ],
    isRecommended: true,
  },
  {
    id: "sys-msg-peer",
    name: "Peer Network",
    goal:
      "Someone in the same field or a related one. Keeping a loose professional connection going — swapping notes, occasionally useful to each other, no agenda beyond that.",
    tone: "Casual, professional, easy-going",
    alwaysDo: "Talk shop like a peer. Share your own take, not just questions.",
    neverDo: "No pitching. No treating them like a prospect.",
    samples: [
      "Been dealing with the exact same thing on my side lately. Feels like everyone's hitting this at once.",
      "Fair point. We ended up going the opposite way on that and it mostly worked, though not without some pain.",
    ],
    isRecommended: true,
  },
  {
    id: "sys-msg-reconnect",
    name: "Reconnecting",
    goal:
      "Someone the sender already knows — a former colleague, an old contact — picking the relationship back up after a while. Low-key, no big ask, just genuinely catching up.",
    tone: "Familiar, relaxed",
    alwaysDo: "Sound like you actually know them. Reference the real gap in touch honestly if it fits.",
    neverDo: "No pretending you never lost touch. No pitching in the reconnect message.",
    samples: [
      "It's been a while. Saw your update and had to say congrats, that's a big move.",
      "Good to hear from you again. Things have been busy but good on my end, how about you?",
    ],
    isRecommended: true,
  },
]

async function main() {
  for (const profile of SYSTEM_PROFILES) {
    const data = {
      ...profile,
      userId: null,
      isSystem: true,
      isDefault: profile.isDefault ?? false,
      isRecommended: profile.isRecommended ?? false,
    }
    await db.messageProfile.upsert({
      where: { id: profile.id },
      create: data,
      update: data,
    })
    console.log(`Seeded: ${profile.name}${profile.isDefault ? " (default)" : ""}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
