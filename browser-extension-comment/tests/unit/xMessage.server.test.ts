// @vitest-environment node
// DMs on both sites through one handler (lib/engage/messageRoute.ts): X's
// route counts "x_messages", writes for X, takes the contact's @handle and
// saves "x_message" with the chat's link; LinkedIn's is unchanged. Shared
// reasons (MessageProfile) work on both. Models, Prisma, auth and the gate
// are stood in for.
import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({
  prompts: [] as { system: string; user: string }[],
  gate: [] as string[],
  history: [] as Record<string, unknown>[],
  // GPT Luna failing, so Claude Haiku (the backup) writes.
  lunaDown: false,
}));

vi.mock("openai", () => ({
  default: class {
    chat = {
      completions: {
        create: async (body: { messages: { content: string }[] }) => {
          if (calls.lunaDown) throw new Error("Luna is down");
          calls.prompts.push({ system: body.messages[0].content, user: body.messages[1].content });
          return { choices: [{ message: { content: JSON.stringify({ comment: "Sounds good, happy to share what we tried." }) } }] };
        },
      },
    };
  },
}));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = {
      create: async () => ({
        content: [{ type: "text", text: JSON.stringify({ comment: "Happy to share what we tried, from the backup." }) }],
        usage: { input_tokens: 10, output_tokens: 5 },
      }),
    };
  },
}));

const REASON = { id: "mp1", name: "Potential client", goal: "Understand their needs", tone: "Friendly", alwaysDo: null, neverDo: null, samples: [], isSystem: true, userId: null };

vi.mock("../../../lib/db", () => ({
  db: {
    messageProfile: { findFirst: vi.fn(async ({ where }: { where: { id: string } }) => (where.id === REASON.id ? REASON : null)) },
    commentHistory: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        calls.history.push(data);
        return { id: `h${calls.history.length}` };
      }),
    },
  },
}));
vi.mock("../../../lib/extensionCommentAuth", () => ({
  getUserFromCommentExtensionToken: vi.fn(async () => ({ id: "u1", email: "u1@example.com" })),
}));
vi.mock("../../../lib/engage/gate", () => ({
  engagePreflight: vi.fn(async (_u: string, kind: string) => {
    calls.gate.push(`preflight:${kind}`);
    return { response: null, loaded: null };
  }),
  reserveEngageGeneration: vi.fn(async (_u: string, kind: string) => {
    calls.gate.push(`reserve:${kind}`);
    return { ok: true, freeRemaining: 3, release: vi.fn() };
  }),
}));

import { POST as xMessagePOST } from "../../../app/api/ext/x/message/route";
import { POST as linkedInMessagePOST } from "../../../app/api/ext/message/route";
import { xChatUrl } from "../../../lib/engage/messageRoute";
import { isContactUrl } from "../../../lib/extensionPreferences";

const THREAD = [
  { sender: "me", text: "Would love to compare notes on pricing." },
  { sender: "them", text: "Sure! What are you working on?" },
];

const request = (path: string, body: unknown) =>
  new Request(`https://carouselabs.com${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer cl_cmt_x" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  calls.lunaDown = false;
  calls.prompts = [];
  calls.gate = [];
  calls.history = [];
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("X DMs", () => {
  it("writes for X with a shared reason, counts an X message, and saves it with the chat's link", async () => {
    const res = await xMessagePOST(
      request("/api/ext/x/message", { contact: { name: "Sam Lee", handle: "@sam_lee" }, threadPath: "/i/chat/1234-5678", thread: THREAD, profileId: "mp1" }),
    );
    expect(await res.json()).toEqual({ message: "Sounds good, happy to share what we tried.", freeRemaining: 3, historyId: "h1" });
    expect(calls.gate).toEqual(["preflight:x_messages", "reserve:x_messages"]);
    expect(calls.prompts[0].system).toMatch(/^You write X \(formerly Twitter\) direct messages/);
    expect(calls.prompts[0].system).toMatch(/X DMs are more casual/);
    expect(calls.prompts[0].system).toMatch(/X already\s+shows who sent it/);
    expect(calls.prompts[0].user).toContain('<contact name="Sam Lee" headline="@sam_lee" />');
    expect(calls.prompts[0].user).toContain("copied from X, not");
    expect(calls.history[0]).toMatchObject({
      kind: "x_message",
      profileName: "Potential client",
      postAuthor: "Sam Lee",
      postUrl: "https://x.com/i/chat/1234-5678",
      postSnippet: "Sure! What are you working on?",
      model: "gpt-6-luna",
    });
  });

  it("records the model that actually wrote it: the backup, when the first model failed", async () => {
    calls.lunaDown = true;
    const res = await xMessagePOST(
      request("/api/ext/x/message", { contact: { name: "Sam Lee", handle: "@sam_lee" }, threadPath: "/i/chat/1234-5678", thread: THREAD, profileId: "mp1" }),
    );
    expect(((await res.json()) as { message: string }).message).toBe("Happy to share what we tried, from the backup.");
    expect(calls.history[0]).toMatchObject({ kind: "x_message", model: "claude-haiku-4-5-20251001" });
  });

  it("refuses a chat with no one in it", async () => {
    const res = await xMessagePOST(request("/api/ext/x/message", { contact: { name: "" }, threadPath: "/i/chat/1", thread: [], flow: true }));
    expect(res.status).toBe(400);
  });
});

describe("LinkedIn DMs, unchanged", () => {
  it("still writes for LinkedIn and saves a LinkedIn message", async () => {
    const res = await linkedInMessagePOST(
      request("/api/ext/message", {
        contact: { name: "Bharti Agrawal", headline: "Founder at Loop" },
        threadPath: "/messaging/thread/2-bharti/",
        thread: THREAD,
        profileId: "mp1",
      }),
    );
    expect(res.status).toBe(200);
    expect(calls.gate).toEqual(["preflight:messages", "reserve:messages"]);
    expect(calls.prompts[0].system).toMatch(/^You write LinkedIn direct messages/);
    expect(calls.prompts[0].system).not.toMatch(/X DMs/);
    expect(calls.prompts[0].user).toContain("copied from LinkedIn, not");
    expect(calls.history[0]).toMatchObject({ kind: "message", postUrl: "https://www.linkedin.com/messaging/thread/2-bharti/" });
  });
});

describe("links and keys", () => {
  it.each([
    ["/i/chat/1234-5678", "https://x.com/i/chat/1234-5678"],
    ["/i/chat/1234-5678/", "https://x.com/i/chat/1234-5678"],
    ["/messages/1234", ""],
    ["/i/chat/../../evil", ""],
    [42, ""],
  ])("X chat link %j → %j", (path, url) => {
    expect(xChatUrl(path)).toBe(url);
  });

  it("keys a person by LinkedIn path or X handle, nothing else", () => {
    expect(isContactUrl("/in/bharti")).toBe(true);
    expect(isContactUrl("/x/sam_lee")).toBe(true);
    expect(isContactUrl("/x/Not-A-Handle")).toBe(false);
    expect(isContactUrl("/x/averyveryverylonghandle")).toBe(false);
    expect(isContactUrl("https://x.com/sam_lee")).toBe(false);
  });
});
