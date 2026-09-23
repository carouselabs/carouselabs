/* eslint-disable */
// scripts/seed-connection-profiles.js — one-time (but idempotent) seed for the
// built-in Connection Note profiles (isSystem: true, userId: null — shared by
// every user, never owned by one). Same pattern as
// scripts/seed-comment-profiles.js; fixed, human-readable ids so re-running
// upserts rather than duplicating.
//
// Run with: node scripts/seed-connection-profiles.js
const { PrismaClient } = require("@prisma/client")

const db = new PrismaClient()

// All four are written for one job: getting the invite ACCEPTED. That means no
// compliments, no pitch and no ask — a note that reads like flattery ("your
// 8-figure system caught my attention") gets ignored, and one that asks for a
// call gets declined. Deliberately NO DIGITS in any sample: the note route
// rejects figures that don't appear in the recipient's profile, so a sample
// containing one would teach the model to invent them.
const SYSTEM_PROFILES = [
  {
    id: "sys-conn-acceptance-first",
    name: "CarouseLabs — Acceptance First",
    angle:
      "Someone who makes it obvious why connecting is worth it, in as few words as possible. Not a fan, not a salesperson",
    goal: "Get the invite accepted",
    tone: "Plain",
    length: "90-180 characters",
    alwaysDo:
      "Reference ONE concrete detail from their profile: their role, their company, or a phrase from their About. Then give a plain reason to connect. One or two short sentences.",
    neverDo:
      "No compliments about them being inspiring, impressive or amazing. No asking for a call, a chat or their time. No pitching what you do.",
    samples: [
      "Saw you run ops for agencies. I work with the same delivery bottlenecks day to day, would be good to stay connected.",
      "Your work on activation caught my eye, mostly because we keep hitting the same onboarding drop-off. Connecting for that reason.",
    ],
    isRecommended: true,
    isDefault: true,
  },
  {
    id: "sys-conn-warm-intro",
    name: "CarouseLabs — Warm Intro",
    angle: "Someone who says what they do in one clause, tied to what the recipient does",
    goal: "Introduce yourself and the overlap",
    tone: "Friendly",
    length: "120-220 characters",
    alwaysDo:
      "Say what you do in ONE short clause, then name the overlap with their work, tied to something specific on their profile.",
    neverDo:
      "No pitching, no offers, no meeting requests, no describing your company at length. Never make the note mostly about you.",
    samples: [
      "I help service businesses tidy up delivery, so your operating-systems angle is squarely in my world. Would be glad to be connected.",
      "I work on onboarding for software teams, which is why your note about watching users rather than asking them stuck with me. Connecting for that.",
    ],
    isRecommended: true,
  },
  {
    id: "sys-conn-peer-angle",
    name: "CarouseLabs — Peer Angle",
    angle: "A peer in the same field, dealing with the same problems, not an outsider admiring them",
    goal: "Connect as a peer in the same work",
    tone: "Professional",
    length: "100-200 characters",
    alwaysDo:
      "Name their role or company, and a problem people in that role actually deal with. Write as an equal who does similar work.",
    neverDo:
      "Never position yourself as an expert above them, and never as a fan below them. No selling, no advice, no questions.",
    samples: [
      "Fellow ops person here. The founder-stuck-in-delivery problem you describe is the one I spend most of my week on. Worth being connected.",
      "We work the same side of the table, agency delivery and the systems that hold it together. Sending this so we are connected when it comes up.",
    ],
    isRecommended: true,
  },
  {
    id: "sys-conn-founder-direct",
    name: "CarouseLabs — Founder Direct",
    angle: "A founder who writes blunt, plain notes with nothing decorative in them",
    goal: "Say who you are, what you noticed, why connect",
    tone: "Direct",
    length: "60-140 characters",
    alwaysDo: "Plain words and short sentences. What you noticed, then why you are connecting. Nothing else.",
    neverDo:
      "No adjectives like amazing, impressive or inspiring. No compliments. No questions. No sign-off.",
    samples: [
      "You build operating systems for agencies. I run one. Connecting.",
      "Saw the fractional COO work. Same problem I deal with on my side, so connecting.",
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
    await db.connectionProfile.upsert({
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
