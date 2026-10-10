import { describe, expect, it } from "vitest";
import { loadMessageContext, saveMessageContext, MAX_MESSAGE_PURPOSE_CHARS, MESSAGE_TONES } from "@/lib/messageThread";
import {
  loadConnectContext,
  loadConnectLength,
  CONNECT_NOTE_HARD_MAX,
  CONNECT_NOTE_MIN,
  DEFAULT_CONNECT_LENGTH,
} from "@/lib/connectionNote";
import { chromeMock } from "../setup/chrome";

const URL_A = "/in/ACoAABharti000";

describe("per-contact conversation memory", () => {
  it("round-trips a saved setting", async () => {
    await saveMessageContext(URL_A, { choice: "custom", profileId: "", purpose: "Lead", tone: "Direct" });
    expect(await loadMessageContext(URL_A)).toEqual({ choice: "custom", profileId: "", purpose: "Lead", tone: "Direct" });
  });

  it("round-trips a conversation's agent", async () => {
    await saveMessageContext(URL_A, { choice: "agent", agentId: "ag1", profileId: "mp1", purpose: "", tone: "" });
    expect(await loadMessageContext(URL_A)).toEqual({ choice: "agent", agentId: "ag1", profileId: "mp1", purpose: "", tone: "" });
  });

  it("caps the stored purpose", async () => {
    await saveMessageContext(URL_A, { choice: "custom", profileId: "", purpose: "x".repeat(5000), tone: "" });
    expect((await loadMessageContext(URL_A))?.purpose).toHaveLength(MAX_MESSAGE_PURPOSE_CHARS);
  });

  it("is a no-op without a profile URL (nothing to key it on)", async () => {
    await saveMessageContext("", { choice: "flow", profileId: "", purpose: "", tone: "" });
    expect(Object.keys(chromeMock().__store)).toHaveLength(0);
    expect(await loadMessageContext("")).toBeNull();
  });

  it.each([
    ["a string", "profile"],
    ["a number", 7],
    ["null", null],
    ["an unknown choice", { choice: "spam", purpose: "x" }],
  ])("treats %s in storage as 'never set'", async (_label, value) => {
    chromeMock().__store[`messageContext:${URL_A}`] = value;
    expect(await loadMessageContext(URL_A)).toBeNull();
  });

  it("fills a default tone for settings saved before tone existed", async () => {
    chromeMock().__store[`messageContext:${URL_A}`] = { choice: "custom", profileId: "", purpose: "Lead" };
    expect((await loadMessageContext(URL_A))?.tone).toBe(MESSAGE_TONES[0]);
  });

  it("keeps an empty tone for a saved profile (empty means 'use the profile's own tone')", async () => {
    chromeMock().__store[`messageContext:${URL_A}`] = { choice: "profile", profileId: "p1", purpose: "" };
    expect((await loadMessageContext(URL_A))?.tone).toBe("");
  });
});

describe("connection-note preferences", () => {
  it.each([
    ["nothing stored", undefined],
    ["garbage", "not an object"],
    ["an unknown preset", { preset: "huge", min: 1, max: 9999 }],
  ])("falls back to the default length for %s", async (_label, value) => {
    if (value !== undefined) chromeMock().__store.connectNoteLength = value;
    expect(await loadConnectLength()).toEqual(DEFAULT_CONNECT_LENGTH);
  });

  it.each([
    { min: -50, max: 99999 },
    { min: "abc", max: null },
    { min: 400, max: 10 },
    { min: 0, max: 0 },
  ])("clamps a corrupted custom range %o into [min, hard max] with min <= max", async (range) => {
    chromeMock().__store.connectNoteLength = { preset: "custom", ...range };
    const { min, max } = await loadConnectLength();
    expect(min).toBeGreaterThanOrEqual(CONNECT_NOTE_MIN);
    expect(max).toBeLessThanOrEqual(CONNECT_NOTE_HARD_MAX);
    expect(min).toBeLessThanOrEqual(max);
  });

  it("rejects a context with an unknown choice and keeps a missing purpose empty", async () => {
    chromeMock().__store.connectNoteContext = { choice: "everything" };
    expect(await loadConnectContext()).toBeNull();
    chromeMock().__store.connectNoteContext = { choice: "none" };
    expect(await loadConnectContext()).toEqual({ choice: "none", purpose: "" });
  });
});
