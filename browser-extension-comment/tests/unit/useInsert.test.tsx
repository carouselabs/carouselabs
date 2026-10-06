// The panel's half of Insert (src/sidepanel/useInsert.ts), on its own: one
// click is one Insert even when a second call arrives before the screen has
// re-rendered (the button's own disabled state covers ordinary double clicks;
// see homeResultCard.test.tsx), each Insert carries a new id, and after one
// lands, calls are ignored for a moment.
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { INSERTED_MS, useInsert, type InsertRequest } from "@/sidepanel/useInsert";
import { chromeMock } from "../setup/chrome";

const request: InsertRequest = {
  message: { type: "carouselabs:insert-comment", text: "Hi", mode: "comment" },
  feature: "comments",
  failed: "Couldn't insert.",
  notOnSite: "Open LinkedIn.",
};

const inserts = () =>
  (chromeMock().tabs.sendMessage as Mock).mock.calls.filter(([, m]) => (m as { type?: string }).type === request.message.type);

beforeEach(() => {
  (chromeMock().tabs.query as unknown as Mock).mockResolvedValue([{ id: 7, url: "https://www.linkedin.com/feed/" }]);
  (chromeMock().tabs.sendMessage as Mock).mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useInsert", () => {
  it("a second call before the first finishes is ignored, not sent", async () => {
    const { result } = renderHook(() => useInsert());
    let answers: unknown[] = [];
    await act(async () => {
      answers = await Promise.all([result.current.insert(request), result.current.insert(request)]);
    });
    expect(answers).toEqual([{ ok: true }, null]);
    expect(inserts()).toHaveLength(1);
  });

  it("after one lands it says Inserted, ignores calls for a moment, then a new click is a new Insert with a new id", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const { result } = renderHook(() => useInsert());
    await act(async () => {
      await result.current.insert(request);
    });
    expect(result.current.inserted).toBe(true);
    await act(async () => {
      expect(await result.current.insert(request)).toBeNull();
    });
    await act(async () => {
      vi.advanceTimersByTime(INSERTED_MS);
    });
    expect(result.current.inserted).toBe(false);
    await act(async () => {
      await result.current.insert(request);
    });
    const ids = inserts().map(([, m]) => (m as { insertId: string }).insertId);
    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it("a page that didn't answer in time gets its own words: the text may already be there", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    (chromeMock().tabs.sendMessage as Mock).mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useInsert());
    let answer: unknown;
    await act(async () => {
      const pending = result.current.insert(request);
      await vi.advanceTimersByTimeAsync(12_000);
      answer = await pending;
    });
    expect(answer).toEqual({ ok: false, error: expect.stringMatching(/may already be there/) });
    expect(inserts()).toHaveLength(1);
  });
});
