/* eslint-disable */
// scripts/seed-comment-profiles.js — one-time (but idempotent) seed for the
// CarouseLabs Comment extension's 7 built-in system CommentProfile rows
// (isSystem: true, userId: null — shared by every user, never owned by one).
// Plain JS, no ts-node/tsx dependency, same reasoning as prisma/seed.js.
//
// Fixed, human-readable ids (not the cuid() default) so this can safely
// re-run via upsert without creating duplicates on every deploy.
//
// Run with: node scripts/seed-comment-profiles.js
const { PrismaClient } = require("@prisma/client")

const db = new PrismaClient()

const SYSTEM_PROFILES = [
  {
    id: "sys-thoughtful-expert",
    name: "Thoughtful Expert",
    whoIAm: "An experienced professional in this field who adds real value",
    goal: "adds one useful insight",
    tone: "professional",
    length: "Medium (2-3 lines)",
    isDefault: true,
  },
  {
    id: "sys-supportive-peer",
    name: "Supportive Peer",
    whoIAm: "A peer in the same field who relates to the poster's experience",
    goal: "agrees and adds a personal angle",
    tone: "friendly",
    length: "Short (1-2 lines)",
  },
  {
    id: "sys-curious-questioner",
    name: "Curious Questioner",
    whoIAm: "A curious professional genuinely interested in learning more",
    goal: "asks a smart follow-up question",
    tone: "friendly",
    length: "Short (1-2 lines)",
  },
  {
    id: "sys-respectful-challenger",
    name: "Respectful Challenger",
    whoIAm: "A thoughtful professional unafraid to offer a different perspective",
    goal: "offers a different view politely",
    tone: "professional",
    length: "Medium (2-3 lines)",
  },
  {
    id: "sys-storyteller",
    name: "Storyteller",
    whoIAm: "Someone who connects with posts through their own related experiences",
    goal: "shares a short related experience",
    tone: "friendly",
    length: "Long (3-4 lines)",
  },
  {
    id: "sys-celebrator",
    name: "Celebrator",
    whoIAm: "An enthusiastic supporter who loves celebrating others' wins",
    goal: "congratulates with a specific detail",
    tone: "friendly",
    length: "Short (1 line)",
  },
  {
    id: "sys-witty",
    name: "Witty",
    whoIAm: "A quick-witted commenter who keeps things light",
    goal: "light clean humour tied to the post",
    tone: "bold",
    length: "Short (1 line)",
  },
]

async function main() {
  for (const profile of SYSTEM_PROFILES) {
    const data = {
      ...profile,
      userId: null,
      isSystem: true,
      isDefault: profile.isDefault ?? false,
    }
    await db.commentProfile.upsert({
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
