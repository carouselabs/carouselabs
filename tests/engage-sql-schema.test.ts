// Raw SQL names its tables as public."X". The Supabase pooler is shared with
// Dharma Mail, whose Prisma sets search_path = dharma on pooled connections;
// an unqualified "User" then isn't found and admin → Engage → Users fails
// ("relation \"User\" does not exist", 2026-10-26). Prisma's own queries
// always name the schema, so only raw SQL needs this.
import fs from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@prisma/client"

const mocks = vi.hoisted(() => ({ queryRaw: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: { $queryRaw: mocks.queryRaw } }))
import { engageErrors } from "@/lib/engage/errorQueries"
import { aiCostByUser } from "@/lib/engage/aiQueries"

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return sourceFiles(p)
    return /\.tsx?$/.test(e.name) ? [p] : []
  })
}

// Postgres's own words for a missing table, as Prisma passes them on (P2010).
const missing = (table: string) =>
  new Prisma.PrismaClientKnownRequestError(`Raw query failed. Code: \`42P01\`. Message: \`relation "${table}" does not exist\``, {
    code: "P2010",
    clientVersion: "5.22.0",
  })
const answer = (failing: string, err: Error) => (q: Prisma.Sql) =>
  q.sql.includes(failing) ? Promise.reject(err) : Promise.resolve([])

beforeEach(() => vi.resetAllMocks())

describe("raw SQL names the public schema", () => {
  const files = ["lib", "app"].flatMap((d) => sourceFiles(path.join(process.cwd(), d)))
  const raw = files.filter((f) => /\$queryRaw|\$executeRaw|Prisma\.sql/.test(fs.readFileSync(f, "utf8")))

  it("finds the raw queries", () => {
    expect(raw.map((f) => path.relative(process.cwd(), f).replaceAll("\\", "/"))).toEqual(
      expect.arrayContaining(["lib/engage/adminQueries.ts", "lib/engage/errorQueries.ts", "lib/engage/aiQueries.ts"]),
    )
  })

  it("never leaves a table to the search path", () => {
    const loose = raw.flatMap((f) => {
      const src = fs.readFileSync(f, "utf8")
      return [
        ...src.matchAll(/\b(?:FROM|JOIN|INTO|UPDATE)\s+"[A-Za-z]+"/g),
        ...src.matchAll(/Prisma\.raw\(`"\$\{/g),
        ...src.matchAll(/to_regclass\('"'/g),
      ].map((m) => `${path.relative(process.cwd(), f)}: ${m[0]}`)
    })
    expect(loose).toEqual([])
  })
})

describe("a table not made yet, named with its schema", () => {
  const from = new Date("2026-10-01T00:00:00Z")
  const to = new Date("2026-10-03T00:00:00Z")

  it("Errors shows the extension side as not recording, not a crash", async () => {
    mocks.queryRaw.mockImplementation(answer('public."EngageClientError"', missing("public.EngageClientError")))
    const errors = await engageErrors(from, to, "all")
    expect(errors.extension.recording).toBe(false)
    expect(errors.ai.recording).toBe(true)
  })

  it("AI cost per person is empty before its table exists", async () => {
    mocks.queryRaw.mockImplementation(answer('public."EngageAiCall"', missing("public.EngageAiCall")))
    await expect(aiCostByUser(from, to, "all", {})).resolves.toEqual([])
  })

  it("any other missing table still fails loudly", async () => {
    mocks.queryRaw.mockImplementation(answer('public."User"', missing("public.User")))
    await expect(aiCostByUser(from, to, "all", {})).rejects.toThrow('relation "public.User" does not exist')
    await expect(engageErrors(from, to, "all")).rejects.toThrow('relation "public.User" does not exist')
  })
})
