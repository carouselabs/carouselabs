// @vitest-environment node
// The admin Posts gallery's feed (app/api/admin/posts): website posts and
// extension generations merged newest-first and paged by one cursor per
// source. Prisma is stood in for in memory, honouring the where/orderBy/take
// shapes the route sends; see extensionPaywall.server.test.ts for how the
// backend's "@/…" imports resolve here.
import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;

const state = vi.hoisted(() => ({ posts: [] as Row[], history: [] as Row[], admin: true }));

const db = vi.hoisted(() => ({
  post: { count: vi.fn(), findMany: vi.fn() },
  commentHistory: { count: vi.fn(), findMany: vi.fn() },
}));
vi.mock("../../../lib/db", () => ({ db }));
vi.mock("../../../lib/adminAuth", async () => {
  const { NextResponse } = await import("next/server");
  return {
    getAdminUser: vi.fn(async () => (state.admin ? { id: "admin", email: "admin@example.com" } : null)),
    adminForbidden: () => NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
});

import { GET } from "../../../app/api/admin/posts/route";
import type { AdminCreation, AdminCreationsResponse } from "../../../lib/adminCreations";

const compare = (a: unknown, b: unknown) => {
  const x = a instanceof Date ? a.getTime() : (a as string);
  const y = b instanceof Date ? b.getTime() : (b as string);
  return x < y ? -1 : x > y ? 1 : 0;
};

// Enough of Prisma's where semantics for what the route sends: AND/OR,
// equality (Dates by value), lt/gte, contains, and relation filters.
function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (cond === undefined) return true;
    if (key === "AND") return (cond as Row[]).every((w) => matches(row, w));
    if (key === "OR") return (cond as Row[]).some((w) => matches(row, w));
    const value = row[key];
    if (cond instanceof Date) return value instanceof Date && value.getTime() === cond.getTime();
    if (cond !== null && typeof cond === "object") {
      const c = cond as Row;
      if ("lt" in c || "gte" in c || "contains" in c) {
        if (c.lt !== undefined && !(compare(value, c.lt) < 0)) return false;
        if (c.gte !== undefined && !(compare(value, c.gte) >= 0)) return false;
        if (c.contains !== undefined && !String(value ?? "").toLowerCase().includes(String(c.contains).toLowerCase()))
          return false;
        return true;
      }
      return value !== null && typeof value === "object" && matches(value as Row, c);
    }
    return value === cond;
  });
}

function fakeTable(rows: () => Row[]) {
  return {
    count: async ({ where }: { where: Row }) => rows().filter((r) => matches(r, where)).length,
    findMany: async ({ where, take }: { where: Row; take: number }) =>
      rows()
        .filter((r) => matches(r, where))
        .sort((a, b) => compare(b.createdAt, a.createdAt) || compare(b.id, a.id))
        .slice(0, take),
  };
}

const user = { id: "u1", email: "maker@example.com" };
const post = (id: string, at: string, extra: Row = {}): Row => ({
  id,
  title: `Post ${id}`,
  caption: null,
  format: "CAROUSEL",
  status: "DRAFT",
  imageUrls: [`https://img.example.com/${id}-1.png`, `https://img.example.com/${id}-2.png`],
  metadata: null,
  createdAt: new Date(at),
  user,
  idea: null,
  ...extra,
});
const gen = (id: string, at: string, extra: Row = {}): Row => ({
  id,
  kind: "comment",
  profileName: "Founder voice",
  postAuthor: "Jane",
  postUrl: "https://www.linkedin.com/feed/update/urn:li:activity:1/",
  postSnippet: "Jane's post",
  comment: `Generated ${id}`,
  createdAt: new Date(at),
  user,
  ...extra,
});

async function page(query: Record<string, string | null | undefined> = {}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v) params.set(k, v);
  const res = await GET(new Request(`https://carouselabs.com/api/admin/posts?${params}`));
  return { status: res.status, body: (await res.json()) as AdminCreationsResponse };
}

// Follows `next` to the end, the way the gallery's Load more / export do.
async function everything(query: Record<string, string> = {}) {
  const seen: AdminCreation[] = [];
  let cursor: AdminCreationsResponse["next"] = null;
  let total: number | null = null;
  for (let guard = 0; guard < 50; guard++) {
    const { body } = await page({ ...query, ...(cursor ?? {}) });
    if (total === null) total = body.total;
    seen.push(...body.items);
    cursor = body.next;
    if (!cursor) break;
  }
  return { seen, total };
}

beforeEach(() => {
  state.admin = true;
  state.posts = [];
  state.history = [];
  const posts = fakeTable(() => state.posts);
  const history = fakeTable(() => state.history);
  db.post.count.mockImplementation(posts.count);
  db.post.findMany.mockImplementation(posts.findMany);
  db.commentHistory.count.mockImplementation(history.count);
  db.commentHistory.findMany.mockImplementation(history.findMany);
});

describe("GET /api/admin/posts", () => {
  it("is admin-only", async () => {
    state.admin = false;
    expect((await page()).status).toBe(403);
    expect(db.post.findMany).not.toHaveBeenCalled();
  });

  it("pages through both sources: every item exactly once, newest first", async () => {
    // 40 posts from one bulk upload share a timestamp; 30 generations are
    // spread around it, some at that same instant too.
    const bulk = "2026-09-20T10:00:00.000Z";
    for (let i = 0; i < 40; i++) state.posts.push(post(`p${String(i).padStart(2, "0")}`, bulk));
    state.posts.push(post("p-new", "2026-09-25T09:00:00.000Z"), post("p-old", "2026-09-01T09:00:00.000Z"));
    for (let i = 0; i < 30; i++) {
      const at = i % 3 === 0 ? bulk : new Date(Date.parse(bulk) + (i - 15) * 3600_000).toISOString();
      state.history.push(gen(`h${String(i).padStart(2, "0")}`, at));
    }

    const { seen, total } = await everything();
    const keys = seen.map((c) => `${c.source}:${c.id}`);

    expect(total).toBe(72);
    expect(keys).toHaveLength(72);
    expect(new Set(keys).size).toBe(72);
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i - 1].createdAt >= seen[i].createdAt).toBe(true);
    }
    expect(seen[0].id).toBe("p-new");
    expect(seen.at(-1)?.id).toBe("p-old");
  });

  it("sends the total only on the first page", async () => {
    for (let i = 0; i < 30; i++) state.posts.push(post(`p${String(i).padStart(2, "0")}`, `2026-09-${String((i % 28) + 1).padStart(2, "0")}T10:00:00.000Z`));
    const first = await page();
    expect(first.body.total).toBe(30);
    expect(first.body.items).toHaveLength(24);
    const second = await page({ ...first.body.next });
    expect(second.body.total).toBeNull();
    expect(second.body.items).toHaveLength(6);
    expect(second.body.next).toBeNull();
  });

  it("filters by type: one post format, all extension, or one extension kind", async () => {
    state.posts.push(
      post("car", "2026-09-10T10:00:00.000Z"),
      post("img", "2026-09-11T10:00:00.000Z", { format: "SINGLE_IMAGE", imageUrls: ["https://img.example.com/img.png"] }),
    );
    state.history.push(gen("com", "2026-09-12T10:00:00.000Z"), gen("msg", "2026-09-13T10:00:00.000Z", { kind: "message" }));

    const ids = async (type: string) => (await everything({ type })).seen.map((c) => c.id).sort();
    expect(await ids("SINGLE_IMAGE")).toEqual(["img"]);
    expect(await ids("EXTENSION")).toEqual(["com", "msg"]);
    expect(await ids("ext:message")).toEqual(["msg"]);
    expect(await ids("")).toEqual(["car", "com", "img", "msg"]);
  });

  it("maps each source to a card: title, images, text and where it was written", async () => {
    state.posts.push(
      post("thumb", "2026-09-10T10:00:00.000Z", {
        title: "",
        format: "THUMBNAIL",
        imageUrls: ["https://img.example.com/t.png"],
        metadata: { videoContent: "A video about pricing" },
        idea: { hook: "Why pricing is hard", title: null },
      }),
    );
    state.history.push(gen("com", "2026-09-11T10:00:00.000Z"));

    const { body } = await page();
    const [comment, thumbnail] = body.items;
    expect(thumbnail).toMatchObject({
      source: "post",
      typeLabel: "Thumbnail",
      title: "Why pricing is hard",
      text: "A video about pricing",
      images: ["https://img.example.com/t.png"],
      credits: 15,
      userId: "u1",
      email: "maker@example.com",
    });
    expect(comment).toMatchObject({
      source: "extension",
      typeLabel: "Comment",
      title: "Comment for Jane",
      text: "Generated com",
      context: "Jane's post",
      profileName: "Founder voice",
      images: [],
      linkUrl: "https://www.linkedin.com/feed/update/urn:li:activity:1/",
    });
  });
});
