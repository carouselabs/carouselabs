// The redesigned side panel: the bottom bar's four places (History, Settings
// and Account inside Profile), voices as one row of buttons, and Profile's "comments per day" grid — five shades, this month,
// tap a day for its count, counted in the browser's own time zone.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { setExtensionAccess } from "@/lib/extensionAccess";
import { heatLevel, heatRanges, monthCells, monthSummary } from "@/lib/heatmap";
import { IconBar } from "@/sidepanel/components/IconBar";
import { VoiceChips } from "@/sidepanel/components/VoiceChips";
import { MonthActivity } from "@/sidepanel/components/MonthActivity";
import { chromeMock } from "../setup/chrome";

afterEach(() => {
  cleanup();
  setExtensionAccess(null);
  vi.unstubAllGlobals();
});


describe("bottom bar", () => {
  it("has Write, Messages, Voices and Profile; Profile covers History, Settings and Account", () => {
    const onSelect = vi.fn();
    const { rerender } = render(<IconBar activeScreen="home" onSelect={onSelect} />);
    const bar = screen.getByRole("navigation", { name: "Screens" });
    expect(within(bar).getAllByRole("button").map((b) => b.textContent)).toEqual(["Write", "Messages", "Voices", "Profile"]);
    expect(within(bar).getByRole("button", { name: "Write" }).getAttribute("aria-current")).toBe("page");

    for (const screenName of ["history", "settings", "account"] as const) {
      rerender(<IconBar activeScreen={screenName} onSelect={onSelect} />);
      expect(within(bar).getByRole("button", { name: "Profile" }).getAttribute("aria-current")).toBe("page");
    }
    fireEvent.click(within(bar).getByRole("button", { name: "Voices" }));
    expect(onSelect).toHaveBeenCalledWith("profiles");
  });

  it("only the screens a panel has, and a dot on Messages when a chat is open", () => {
    const { rerender } = render(<IconBar activeScreen="home" onSelect={() => {}} screens={["home", "profiles", "account"]} />);
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Write", "Voices", "Profile"]);
    rerender(<IconBar activeScreen="home" onSelect={() => {}} attention={{ screen: "messages", description: "A chat is open" }} />);
    const messages = screen.getByRole("button", { name: "Messages" });
    expect(screen.getByTestId("attention-dot-messages")).toBeTruthy();
    expect(messages.getAttribute("aria-describedby")).toBe("attention-messages");
  });
});

describe("voices as buttons", () => {
  const OPTIONS = [
    { id: "r1", name: "Recommended one", isRecommended: true },
    { id: "d1", name: "My default", isDefault: true },
    { id: "c1", name: "Custom" },
  ];

  it("one tap picks; the default is starred; arrows move; + makes a new one", () => {
    const onChange = vi.fn();
    const onCreate = vi.fn();
    render(<VoiceChips label="Voice" options={OPTIONS} value="d1" onChange={onChange} onCreate={onCreate} />);
    const group = screen.getByRole("radiogroup", { name: "Voice" });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((r) => r.getAttribute("aria-checked"))).toEqual(["false", "true", "false"]);
    expect(radios[1].textContent).toContain("(default)");
    // Only the chosen one is a Tab stop.
    expect(radios.map((r) => r.tabIndex)).toEqual([-1, 0, -1]);

    fireEvent.click(radios[2]);
    expect(onChange).toHaveBeenLastCalledWith("c1");
    fireEvent.keyDown(radios[1], { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith("r1");
    fireEvent.keyDown(radios[2], { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("r1");

    fireEvent.click(screen.getByRole("button", { name: "Create custom profile" }));
    expect(onCreate).toHaveBeenCalled();
  });
});

describe("comments per day", () => {
  it("shades, calendar and totals", () => {
    // Against the month's busiest day (20): a quarter of it per shade.
    expect([0, 1, 5, 6, 10, 11, 15, 16, 20].map((n) => heatLevel(n, 20))).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
    expect(heatRanges(20)).toEqual(["0", "1–5", "6–10", "11–15", "16–20"]);
    expect(heatRanges(2)).toEqual(["0", "", "1", "", "2"]);
    expect(heatLevel(3, 0)).toBe(0);
    const today = new Date(2026, 10, 12);
    const cells = monthCells(today);
    expect(cells[0]?.key).toBe("2026-11-01");
    expect(cells.filter((c) => c?.future)).toHaveLength(18);
    expect(
      monthSummary(
        new Map([
          ["2026-10-31", 40],
          ["2026-11-06", 14],
          ["2026-11-09", 14],
          ["2026-11-12", 4],
        ]),
        today,
      ),
    ).toEqual({ total: 32, best: { key: "2026-11-06", count: 14 }, activeDays: 3, daysSoFar: 12 });
  });

  it("asks for this month in this browser's zone, and shows each day's shade and count", async () => {
    chromeMock().__store.extensionToken = "cl_cmt_live";
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        urls.push(url);
        return new Response(
          JSON.stringify({
            one: "comment",
            many: "comments",
            days: [
              { day: "2026-11-02", count: 6 },
              { day: "2026-11-06", count: 14 },
              { day: "2026-11-12", count: 1 },
            ],
          }),
          { status: 200 },
        );
      }),
    );
    render(<MonthActivity today={new Date(2026, 10, 12, 15)} />);

    await waitFor(() => expect(screen.getByText("21")).toBeTruthy());
    const asked = new URL(urls[0]);
    expect(asked.pathname).toBe("/api/ext/activity");
    expect(asked.searchParams.get("platform")).toBe("linkedin");
    expect(asked.searchParams.get("days")).toBe("12");
    expect(asked.searchParams.get("tz")).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);

    expect(screen.getByText("14 on 6 Nov")).toBeTruthy();
    expect(screen.getByText("3 of 12")).toBeTruthy();

    const busiest = screen.getByRole("button", { name: "Friday 6 Nov: 14 comments" });
    expect(busiest.style.backgroundColor).toBe("var(--heat-4)");
    expect(screen.getByRole("button", { name: "Monday 2 Nov: 6 comments" }).style.backgroundColor).toBe("var(--heat-2)");
    expect(screen.getByRole("button", { name: "Tuesday 3 Nov: 0 comments" }).style.backgroundColor).toBe("var(--heat-0)");
    const future = screen.getByRole("button", { name: "Friday 13 Nov, still to come" }) as HTMLButtonElement;
    expect(future.disabled).toBe(true);

    // Today is picked to start; tapping a day says its count.
    expect(screen.getByRole("button", { name: "Thursday 12 Nov: 1 comment" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(busiest);
    expect(busiest.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Friday 6 Nov")).toBeTruthy();
    expect(screen.getByText("14 comments")).toBeTruthy();
  });

  it("a quiet month: its busiest day is the darkest, and the legend shows this month's numbers", async () => {
    chromeMock().__store.extensionToken = "cl_cmt_live";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            one: "comment",
            many: "comments",
            days: [
              { day: "2026-11-02", count: 1 },
              { day: "2026-11-04", count: 2 },
              { day: "2026-11-09", count: 4 },
            ],
          }),
          { status: 200 },
        ),
      ),
    );
    render(<MonthActivity today={new Date(2026, 10, 12, 15)} />);
    await waitFor(() => expect(screen.getByText("7")).toBeTruthy());

    const shade = (name: string) => screen.getByRole("button", { name }).style.backgroundColor;
    // 4 is the most this month, so it's the darkest (not the pale shade of 1–3 or 4–7).
    expect(shade("Monday 9 Nov: 4 comments")).toBe("var(--heat-4)");
    expect(shade("Wednesday 4 Nov: 2 comments")).toBe("var(--heat-2)");
    expect(shade("Monday 2 Nov: 1 comment")).toBe("var(--heat-1)");
    expect(shade("Tuesday 3 Nov: 0 comments")).toBe("var(--heat-0)");

    const legend = within(screen.getByRole("group", { name: "Shades, from none to this month's busiest day" }));
    for (const range of ["0", "1", "2", "3", "4"]) expect(legend.getByText(range)).toBeTruthy();
    expect(legend.queryByText("12+")).toBeNull();
  });

  it("says so when the month can't be loaded", async () => {
    chromeMock().__store.extensionToken = "cl_cmt_live";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
    render(<MonthActivity today={new Date(2026, 10, 12)} />);
    expect(await screen.findByText("Couldn't load this month")).toBeTruthy();
  });
});
