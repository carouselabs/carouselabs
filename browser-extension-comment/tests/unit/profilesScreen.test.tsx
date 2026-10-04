// The Profiles screen: a profile is only deleted after the user confirms it;
// presets can only be duplicated; the kind switch changes the list; the
// builder opens with a way back and keeps its Save error by the Save button,
// and a failed Test preview reports inside the Test box.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ProfilesScreen } from "@/sidepanel/components/screens/ProfilesScreen";
import { chromeMock } from "../setup/chrome";

const stamp = "2026-09-01T00:00:00.000Z";
const profile = (id: string, name: string, over: Record<string, unknown> = {}) => ({
  id, userId: null, name, whoIAm: `${name} voice`, goal: "adds one useful insight", tone: "professional",
  length: "100-220 characters", emoji: "None", language: "English", alwaysDo: null, neverDo: null, samples: [],
  isDefault: false, isSystem: true, isRecommended: false, testsUsed: 0, createdAt: stamp, updatedAt: stamp, ...over,
});
const PROFILES = [
  profile("r1", "Top Relevance", { isRecommended: true }),
  profile("p1", "Thoughtful Expert"),
  profile("c1", "Founder voice", { isSystem: false, userId: "u1" }),
];

type Call = { url: string; method: string };

function server(routes: Record<string, { status: number; body: unknown }> = {}) {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      calls.push({ url, method });
      const key = `${method} ${new URL(url).pathname}`;
      const route = routes[key];
      if (route) return new Response(JSON.stringify(route.body), { status: route.status });
      if (url.endsWith("/api/ext/profiles")) return new Response(JSON.stringify({ profiles: PROFILES }), { status: 200 });
      if (url.endsWith("/api/ext/connection-profiles")) return new Response(JSON.stringify({ profiles: [] }), { status: 200 });
      if (url.endsWith("/api/ext/me")) return new Response(JSON.stringify({ defaultCommentProfileId: "p1" }), { status: 200 });
      return new Response(JSON.stringify({}), { status: 200 });
    }),
  );
  return calls;
}

beforeEach(() => {
  chromeMock().__store.extensionToken = "cl_cmt_abc";
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const yours = () => screen.getByRole("region", { name: "Your profiles" });

describe("Profiles screen", () => {
  it("deletes a profile only after the user confirms", async () => {
    const calls = server();
    render(<ProfilesScreen />);
    await screen.findByText("Founder voice");

    fireEvent.click(within(yours()).getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Delete this profile?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Keep it" }));
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);

    fireEvent.click(within(yours()).getByRole("button", { name: "Delete" }));
    fireEvent.click(within(screen.getByRole("group", { name: "Delete Founder voice?" })).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(calls).toContainEqual({ url: expect.stringContaining("/api/ext/profiles/c1"), method: "DELETE" }));
  });

  it("offers presets for duplicating only", async () => {
    server();
    render(<ProfilesScreen />);
    const builtIn = await screen.findByRole("region", { name: "Built-in" });

    expect(within(builtIn).getByRole("button", { name: "Duplicate" })).toBeTruthy();
    expect(within(builtIn).queryByRole("button", { name: "Edit" })).toBeNull();
    expect(within(builtIn).queryByRole("button", { name: "Delete" })).toBeNull();
    expect(within(yours()).getByRole("button", { name: "Make default" })).toBeTruthy();
  });

  it("switches kind with the switch at the top", async () => {
    server();
    render(<ProfilesScreen />);
    await screen.findByText("Comment profiles");

    fireEvent.click(screen.getByRole("radio", { name: "Notes" }));
    expect(await screen.findByText("Connection note profiles")).toBeTruthy();
  });

  it("opens the builder with a way back, and shows a failed save by the Save button", async () => {
    server({ "POST /api/ext/profiles": { status: 403, body: { error: "Profile limit reached" } } });
    render(<ProfilesScreen />);
    fireEvent.click(await screen.findByRole("button", { name: "New profile" }));

    expect(screen.getByRole("heading", { name: "New comment profile" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Profile name/), { target: { value: "Mine" } });
    fireEvent.change(screen.getByLabelText(/Who I am/), { target: { value: "A founder" } });
    fireEvent.click(screen.getByRole("button", { name: "Create profile" }));
    expect(await screen.findByText("Profile limit reached")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Profiles" }));
    expect(await screen.findByText("Comment profiles")).toBeTruthy();
  });

  it("reports a failed Test inside the Test box", async () => {
    server({ "POST /api/ext/profiles/test": { status: 429, body: { error: "No tests left for this profile" } } });
    render(<ProfilesScreen />);
    fireEvent.click(await screen.findByRole("button", { name: "New profile" }));
    fireEvent.change(screen.getByLabelText(/Profile name/), { target: { value: "Mine" } });
    fireEvent.change(screen.getByLabelText(/Who I am/), { target: { value: "A founder" } });
    fireEvent.change(screen.getByRole("textbox", { name: "LinkedIn post to test on" }), { target: { value: "A post" } });
    fireEvent.click(screen.getByRole("button", { name: "Test" }));

    const testBox = screen.getByRole("region", { name: "Test this profile" });
    expect(await within(testBox).findByText("No tests left for this profile")).toBeTruthy();
  });
});
