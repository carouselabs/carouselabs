/* eslint-disable */
// prisma/seed.js — idempotent seed for the intern points board's initial
// predefined tasks. Plain JS (no tsx/ts-node in devDependencies) so it runs
// directly via `node prisma/seed.js` or `npx prisma db seed`.
const { PrismaClient } = require("@prisma/client")

const db = new PrismaClient()

const TASKS = [
  { name: "HR Post", points: 5 },
  { name: "Job Post", points: 5 },
  { name: "10 Follows (HR)", points: 2 },
  { name: "10 Comments", points: 4 },
  { name: "1 Personal Hire", points: 30 },
]

async function main() {
  for (const task of TASKS) {
    await db.predefinedTask.upsert({
      where: { name: task.name },
      create: task,
      update: { points: task.points },
    })
    console.log(`Seeded: ${task.name} (${task.points} pts)`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
