// The Home screen shows the comment-profile list it got last time the moment
// the panel opens, so Generate doesn't wait on the network on every open, and
// the server's answer then replaces it (src/lib/profileCache.ts). Signing out
// removes the cached list with the rest of the account's data.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { CommentProfile } from "@/lib/api";
import { setExtensionAccess } from "@/lib/extensionAccess";
import { clearAccountData } from "@/lib/account";
import { COMMENT_PROFILES_CACHE_KEY, type CachedCommentProfiles } from "@/lib/profileCache";
import { HomeScreen } from "@/sidepanel/components/screens/HomeScreen";
import { chromeMock } from "../setup/chrome";

afterEach(() => {
  cleanup();
  setExtensionAccess(null);
});

const profile = (id: string, name: string, over: Partial<CommentProfile> = {}): CommentProfile =>
  ({
    id,
    name,
    tone: "Friendly",
    isDefault: false,
    isSystem: false,
    isRecommended: false,
    ...over,
  }) as CommentProfile;

const ME = {
  defaultCommentProfileId: "p-server",
  commentsToday: 0,
  insertWarningHidden: false,
  extension: {
    access: "free",
    freeUsed: 0,
    freeLimit: 10,
    status: null,
    renewsAt: null,
    endsAt: null,
    manageUrl: null,
  },
};

// Answers the panel's other startup requests; profiles and /me wait on
// `release` so the test controls when the server "answers".
function server() {
  let release: () => void = () => {};
  const answered = new Promise<void>((resolve) => (release = resolve));
  const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.endsWith("/api/ext/profiles")) {
        await answered;
        return json({ profiles: [profile("p-server", "Server voice")] });
      }
      if (url.endsWith("/api/ext/me")) {
        await answered;
        return json(ME);
      }
      if (url.includes("/api/ext/contacts")) return json({ contacts: [] });
      return json({});
    }),
  );
  return { release };
}

function cacheProfiles(value: CachedCommentProfiles) {
  chromeMock().__store[COMMENT_PROFILES_CACHE_KEY] = value;
}

describe("Home screen: cached profiles", () => {
  it("shows last time's profiles at once, before the server answers", async () => {
    chromeMock().__store.extensionToken = "cl_cmt_live";
    cacheProfiles({ profiles: [profile("p-cached", "Cached voice")], defaultProfileId: "p-cached" });
    server(); // never released: the server hasn't answered

    render(<HomeScreen onCreateProfile={() => {}} />);

    await waitFor(() => expect(screen.getByRole("combobox").textContent).toContain("Cached voice"));
    expect(screen.queryByText("Loading profiles…")).toBeNull();
  });

  it("replaces the cached list with the server's, and saves that for next time", async () => {
    chromeMock().__store.extensionToken = "cl_cmt_live";
    cacheProfiles({ profiles: [profile("p-cached", "Cached voice")], defaultProfileId: "p-cached" });
    const { release } = server();

    render(<HomeScreen onCreateProfile={() => {}} />);
    await waitFor(() => expect(screen.getByRole("combobox").textContent).toContain("Cached voice"));

    release();
    await waitFor(() => expect(screen.getByRole("combobox").textContent).toContain("Server voice"));
    await waitFor(() =>
      expect(chromeMock().__store[COMMENT_PROFILES_CACHE_KEY]).toMatchObject({
        profiles: [{ id: "p-server", name: "Server voice" }],
        defaultProfileId: "p-server",
      }),
    );
  });

  it("with nothing cached, waits for the server as before", async () => {
    chromeMock().__store.extensionToken = "cl_cmt_live";
    const { release } = server();

    render(<HomeScreen onCreateProfile={() => {}} />);
    expect(screen.queryByText("Loading profiles…")).not.toBeNull();

    release();
    await waitFor(() => expect(screen.getByRole("combobox").textContent).toContain("Server voice"));
  });
});

describe("signing out", () => {
  it("removes the cached profile list with the rest of the account's data", async () => {
    chromeMock().__store.extensionToken = "cl_cmt_live";
    cacheProfiles({ profiles: [profile("p-cached", "Cached voice")], defaultProfileId: "p-cached" });
    await clearAccountData();
    expect(chromeMock().__store[COMMENT_PROFILES_CACHE_KEY]).toBeUndefined();
    expect(chromeMock().__store.extensionToken).toBeUndefined();
  });
});
