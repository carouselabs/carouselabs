import { describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach } from "vitest";
import { AccountScreen } from "@/sidepanel/components/screens/AccountScreen";
import { chromeMock } from "../setup/chrome";

afterEach(cleanup);

function server(routes: Record<string, { status: number; body: unknown }>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const route = Object.entries(routes).find(([path]) => url.endsWith(path));
      const { status, body } = route?.[1] ?? { status: 404, body: { error: "not found" } };
      return new Response(JSON.stringify(body), { status });
    }),
  );
}

const ME = { email: "a@b.co", plan: "FREE", creditsAvailable: 5, commentsThisMonth: 2 };

describe("Account screen", () => {
  it("signs out: revokes server-side, then clears the local token", async () => {
    chromeMock().__store.extensionToken = "cl_cmt_live";
    server({ "/api/ext/me": { status: 200, body: ME }, "/api/ext/auth/signout": { status: 200, body: { ok: true } } });
    render(<AccountScreen />);
    fireEvent.click(await screen.findByRole("button", { name: /sign out/i }));
    await waitFor(() => expect(chromeMock().__store.extensionToken).toBeUndefined());
  });

  it("clears the person's cached data on sign out, and keeps device settings", async () => {
    Object.assign(chromeMock().__store, {
      extensionToken: "cl_cmt_live",
      lastSelectedPost: { authorName: "Jane Doe" },
      linkedinSelfName: { name: "Anant Goyal" },
      linkedinSelfProfile: { name: "Anant Goyal", headline: "Founder" },
      connectNoteContext: { choice: "custom", purpose: "I help SaaS founders" },
      "messageContext:/in/acoaabharti000": { choice: "custom", purpose: "Lead" },
      "messageContext:/in/acoaaemma000": { choice: "flow" },
      showInsertButton: false,
      connectNoteLength: { preset: "short", min: 80, max: 150 },
      apiBaseUrl: "http://localhost:3000",
    });
    server({ "/api/ext/me": { status: 200, body: ME }, "/api/ext/auth/signout": { status: 200, body: { ok: true } } });
    render(<AccountScreen />);
    fireEvent.click(await screen.findByRole("button", { name: /sign out/i }));
    await waitFor(() => expect(chromeMock().__store.extensionToken).toBeUndefined());
    expect(Object.keys(chromeMock().__store).sort()).toEqual(["apiBaseUrl", "connectNoteLength", "showInsertButton"]);
  });

  it("keeps the token (and says so) when the server can't be reached to revoke it", async () => {
    chromeMock().__store.extensionToken = "cl_cmt_live";
    server({ "/api/ext/me": { status: 200, body: ME }, "/api/ext/auth/signout": { status: 500, body: { error: "db down" } } });
    render(<AccountScreen />);
    fireEvent.click(await screen.findByRole("button", { name: /sign out/i }));
    expect(await screen.findByText("db down")).toBeTruthy();
    expect(chromeMock().__store.extensionToken).toBe("cl_cmt_live");
  });

  it("still offers Sign out when the token has been revoked (so the user is never locked in)", async () => {
    chromeMock().__store.extensionToken = "cl_cmt_revoked";
    const invalid = { status: 401, body: { error: "Invalid or missing extension token" } };
    server({ "/api/ext/me": invalid, "/api/ext/auth/signout": invalid });
    render(<AccountScreen />);
    fireEvent.click(await screen.findByRole("button", { name: /sign out/i }));
    await waitFor(() => expect(chromeMock().__store.extensionToken).toBeUndefined());
  });
});
