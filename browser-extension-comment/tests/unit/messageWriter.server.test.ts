// @vitest-environment node
// The DM writer (lib/engage/messageWriter.ts), shared by real replies and an
// agent's test: a figure from nowhere, a template bracket or a mangled reply
// is never kept; generic filler gets one more try and is the fallback;
// alternatives keep every reply that passes; the agent's test gets its "why".
import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ answers: [] as string[], users: [] as string[] }));

vi.mock("../../../lib/ai/commentModel", async (importOriginal) => {
  const real = await importOriginal<Record<string, unknown>>();
  return {
    ...real,
    callCommentModelWithInfo: vi.fn(async (_system: string, user: string) => {
      calls.users.push(user);
      return { raw: calls.answers.shift() ?? "", model: "test-model" };
    }),
  };
});

import { writeMessage } from "../../../lib/engage/messageWriter";

const comment = (text: string) => JSON.stringify({ comment: text });
const write = (output?: "single" | "alternatives" | "explained") =>
  writeMessage({
    system: "system",
    user: "user",
    numberSources: "They asked about the 2 plans. Pro is $29.",
    label: "test",
    engage: { userId: "u1", kind: "messages" },
    output,
  });

beforeEach(() => {
  calls.answers = [];
  calls.users = [];
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("one reply", () => {
  it("keeps a clean reply at once", async () => {
    calls.answers = [comment("Pro is $29 and there's a free plan too. What would you use it for?")];
    expect(await write()).toMatchObject({ message: "Pro is $29 and there's a free plan too. What would you use it for?", alternatives: [], model: "test-model" });
  });

  it("never keeps a figure from nowhere, and reminds the model before trying again", async () => {
    calls.answers = [comment("We helped 300 founders grow 5x."), comment("Happy to walk you through the 2 plans.")];
    expect((await write())?.message).toBe("Happy to walk you through the 2 plans.");
    expect(calls.users[1]).not.toBe(calls.users[0]);
  });

  it("never keeps a left-over template bracket", async () => {
    calls.answers = [comment("Love what you're doing at [their company]!"), comment("Love what you're building.")];
    expect((await write())?.message).toBe("Love what you're building.");
  });

  it("tries again on generic filler, and falls back to it when the retry fails", async () => {
    calls.answers = [comment("Hope this finds you well! Quick question about your work."), "not json at all"];
    expect((await write())?.message).toBe("Hope this finds you well! Quick question about your work.");
    expect(calls.users).toHaveLength(2);
  });

  it("nothing usable is null (the route then says so and gives the free use back)", async () => {
    calls.answers = ["", ""];
    expect(await write()).toBeNull();
  });
});

describe("alternatives", () => {
  it("keeps every reply that passes, and drops one with a figure from nowhere", async () => {
    calls.answers = [
      JSON.stringify({
        replies: ["What made you start posting more?", "We've helped 400 teams with this.", "How do you plan your posts each week?"],
      }),
    ];
    const result = await write("alternatives");
    expect(result?.alternatives).toEqual(["What made you start posting more?", "How do you plan your posts each week?"]);
    expect(result?.message).toBe("What made you start posting more?");
  });

  it("asks again when only one passes, and keeps what it has", async () => {
    calls.answers = [JSON.stringify({ replies: ["Only one good reply here.", "We grew 900%."] }), "nothing"];
    const result = await write("alternatives");
    expect(result?.alternatives).toEqual(["Only one good reply here."]);
    expect(calls.users).toHaveLength(2);
  });
});

describe("explained (an agent's test)", () => {
  it("returns why the reply fits", async () => {
    calls.answers = [JSON.stringify({ comment: "What does your posting week look like?", why: "Asks about their process before any pitch." })];
    expect(await write("explained")).toMatchObject({ message: "What does your posting week look like?", why: "Asks about their process before any pitch." });
  });
});
