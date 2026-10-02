// @vitest-environment node
// The extension's token check (lib/extensionCommentAuth.ts): a suspended or
// deleted account is signed out everywhere, and the side panel's version is
// recorded per browser without ever failing a request. And the error-report
// route (app/api/ext/errors): metadata only, validated, rate limited.
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  record: null as null | { id: string; userId: string; user: { id: string; email: string; suspendedAt: Date | null; deletedAt: Date | null } },
  upserts: [] as Array<Record<string, unknown>>,
  errors: [] as Array<Record<string, unknown>>,
  limited: false,
}));

vi.mock("../../../lib/db", () => ({
  db: {
    extensionToken: {
      findFirst: vi.fn(async () => state.record),
      update: vi.fn(async () => ({})),
    },
    engageClientInfo: {
      upsert: vi.fn(async (args: Record<string, unknown>) => {
        state.upserts.push(args);
        return {};
      }),
    },
    engageClientError: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        state.errors.push(data);
        return {};
      }),
    },
  },
}));
vi.mock("@upstash/redis", () => ({ Redis: { fromEnv: () => ({}) } }));
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow() {
      return {};
    }
    async limit() {
      return { success: !state.limited };
    }
  },
}));

import { getUserFromCommentExtensionToken } from "../../../lib/extensionCommentAuth";
import { POST as reportError } from "../../../app/api/ext/errors/route";

const TOKEN = `cl_cmt_${"a".repeat(64)}`;
const request = (headers: Record<string, string> = {}, body?: unknown) =>
  new Request("https://carouselabs.com/api/ext/errors", {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

let tokenSeq = 0;
beforeEach(() => {
  tokenSeq += 1;
  state.record = { id: `tok${tokenSeq}`, userId: "u1", user: { id: "u1", email: "a@b.co", suspendedAt: null, deletedAt: null } };
  state.upserts = [];
  state.errors = [];
  state.limited = false;
});

describe("extension token check", () => {
  it("signs out a suspended or deleted account", async () => {
    state.record!.user.suspendedAt = new Date();
    expect(await getUserFromCommentExtensionToken(request())).toBeNull();
    state.record!.user.suspendedAt = null;
    state.record!.user.deletedAt = new Date();
    expect(await getUserFromCommentExtensionToken(request())).toBeNull();
  });

  it("records a well-formed version, once per browser for a while", async () => {
    expect((await getUserFromCommentExtensionToken(request({ "x-engage-version": "1.3.0" })))?.id).toBe("u1");
    await getUserFromCommentExtensionToken(request({ "x-engage-version": "1.3.0" }));
    expect(state.upserts).toHaveLength(1);
    expect(state.upserts[0]).toMatchObject({ where: { tokenId: state.record!.id }, create: { userId: "u1", extensionVersion: "1.3.0" } });
    // A new version is recorded straight away.
    await getUserFromCommentExtensionToken(request({ "x-engage-version": "1.3.1" }));
    expect(state.upserts).toHaveLength(2);
  });

  it("ignores missing or malformed versions", async () => {
    for (const v of ["", "latest", "1", "1.3.0; drop table", "9".repeat(40)]) {
      await getUserFromCommentExtensionToken(request(v ? { "x-engage-version": v } : {}));
    }
    expect(state.upserts).toHaveLength(0);
  });
});

describe("error reports from the side panel", () => {
  it("stores metadata only, with the version", async () => {
    const res = await reportError(request({ "x-engage-version": "1.3.0" }, { feature: "insert", code: "no_comment_box", message: "Couldn't find LinkedIn's comment box." }));
    expect(res.status).toBe(204);
    expect(state.errors[0]).toEqual({ userId: "u1", feature: "insert", code: "no_comment_box", message: "Couldn't find LinkedIn's comment box.", extensionVersion: "1.3.0" });
  });

  it("rejects anything that isn't a short known report", async () => {
    for (const body of [
      { feature: "insert", code: "has spaces", message: "x" },
      { feature: "hacking", code: "x", message: "x" },
      { feature: "insert", code: "x", message: "y".repeat(301) },
      null,
    ]) {
      expect((await reportError(request({}, body))).status).toBe(400);
    }
    expect(state.errors).toHaveLength(0);
  });

  it("needs a valid token, and quietly drops reports over the hourly limit", async () => {
    state.record = null;
    expect((await reportError(request({}, { feature: "other", code: "x", message: "x" }))).status).toBe(401);
    state.record = { id: "t", userId: "u1", user: { id: "u1", email: "a@b.co", suspendedAt: null, deletedAt: null } };
    state.limited = true;
    expect((await reportError(request({}, { feature: "other", code: "x", message: "x" }))).status).toBe(204);
    expect(state.errors).toHaveLength(0);
  });
});
