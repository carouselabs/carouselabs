// Layout and keyboard checks that only a real browser can make: no screen
// scrolls sideways in the narrowest panel Chrome allows, and every Tab stop
// shows where focus is (an outline, or a ring on it or on the card around it).
import { expect, type Page } from "@playwright/test";
import { test, type Harness } from "./harness";

const stamp = "2026-09-01T00:00:00.000Z";
const PROFILE = {
  id: "p1", userId: null, name: "Thoughtful Expert with a rather long profile name", whoIAm: "An experienced professional",
  goal: "adds one useful insight", tone: "professional", length: "100-220 characters", emoji: "None", language: "English",
  alwaysDo: null, neverDo: null, samples: [], isDefault: true, isSystem: true, isRecommended: false, testsUsed: 0,
  createdAt: stamp, updatedAt: stamp,
};
const ME = {
  email: "a.very.long.email.address.for.layout.testing@carouselabs-example.com", plan: "FREE", commentsThisMonth: 3,
  commentsToday: 1, defaultCommentProfileId: "p1", defaultLanguage: null, insertWarningHidden: false,
  extension: { access: "free", freeUsed: 2, freeLimit: 10, status: null, renewsAt: null, endsAt: null, manageUrl: null },
};
const POST = {
  mode: "comment", capturedAt: Date.now(), authorName: "Priya Raman-Venkataraghavan, PhD",
  authorHeadline: "Head of Growth at a B2B SaaS company | Ex-Stripe | Writing about activation and pricing",
  text: "A long post. ".repeat(40), type: "article", url: "https://www.linkedin.com/feed/update/1",
};
const COMMENT = "Averyveryverylongwordwithoutanyspacesatalltotestwrapping ".repeat(3) + "and a normal ending.";

async function openPanel(harness: Harness, width: number): Promise<Page> {
  harness.apiResponses.set("/api/ext/profiles", { status: 200, body: { profiles: [PROFILE, { ...PROFILE, id: "c1", isSystem: false, userId: "u1" }] } });
  harness.apiResponses.set("/api/ext/me", { status: 200, body: ME });
  harness.apiResponses.set("/api/ext/settings", { status: 200, body: { defaultCommentProfileId: "p1", defaultLanguage: null, insertWarningHidden: false } });
  harness.apiResponses.set("/api/ext/contacts", { status: 200, body: { contacts: [] } });
  harness.apiResponses.set("/api/ext/activity", { status: 200, body: { one: "comment", many: "comments", days: [{ day: new Date().toISOString().slice(0, 10), count: 4 }] } });
  harness.apiResponses.set("/api/ext/history", {
    status: 200,
    body: { nextCursor: null, entries: [{ id: "h1", kind: "comment", postAuthor: POST.authorName, postUrl: POST.url, postSnippet: "x", comment: COMMENT, action: "COPIED", createdAt: stamp, profileName: PROFILE.name }] },
  });
  harness.apiResponses.set("/api/ext/generate", { status: 200, body: { comment: COMMENT, freeRemaining: 7, historyId: "h1" } });
  // A saved comment with a long unbroken name and text, for the Write
  // screen's Saved comments list.
  harness.apiResponses.set("/api/ext/saved-comments", {
    status: 200,
    body: {
      savedComments: [
        {
          id: "s1",
          title: "Averyveryverylongsavedcommentnamewithoutanyspaces",
          body: COMMENT,
          tags: [],
          favorite: true,
          remindOn: "off",
          useCount: 2,
          lastUsedAt: stamp,
          createdAt: stamp,
          updatedAt: stamp,
        },
      ],
    },
  });
  await harness.worker.evaluate(
    (post) => chrome.storage.local.set({ extensionToken: "cl_cmt_qa", onboardingComplete: true, lastSelectedPost: post }),
    POST,
  );
  await harness.open("/feed/", "feed.html");
  const panel = await harness.context.newPage();
  // The panel is a page here; the LinkedIn tab stands in as the active tab
  // (off LinkedIn, Home points back there instead of offering Generate).
  await panel.addInitScript(() => {
    const query = chrome.tabs.query.bind(chrome.tabs);
    chrome.tabs.query = ((info: chrome.tabs.QueryInfo) =>
      info.active ? query({ url: "https://www.linkedin.com/*" }) : query(info)) as typeof chrome.tabs.query;
  });
  await panel.setViewportSize({ width, height: 720 });
  await panel.emulateMedia({ reducedMotion: "reduce" });
  await panel.goto(`chrome-extension://${harness.extensionId}/src/sidepanel/index.html`);
  await expect(panel.getByRole("button", { name: "Generate", exact: true })).toBeEnabled();
  return panel;
}

test("no screen scrolls sideways at 320px", async ({ harness }) => {
  const panel = await openPanel(harness, 320);
  await panel.getByRole("button", { name: "Generate", exact: true }).click();
  await expect(panel.getByRole("textbox", { name: "Your comment" })).toHaveValue(COMMENT);

  const overflow: string[] = [];
  // History and Settings are Profile's tabs, so they come after it.
  for (const screen of ["Write", "Messages", "Voices", "Profile", "History", "Settings"]) {
    await panel.getByRole("button", { name: screen, exact: true }).click();
    await panel.waitForTimeout(200);
    // Which element sticks out, so a failure says where to look.
    const wide = await panel.evaluate(() => {
      const main = document.querySelector("main")!;
      if (document.documentElement.scrollWidth <= window.innerWidth && main.scrollWidth <= main.clientWidth) return null;
      const right = main.getBoundingClientRect().right;
      // Not ones inside their own scroller (the voice row), which clips them.
      const clipped = (el: HTMLElement) => {
        for (let p = el.parentElement; p && p !== main; p = p.parentElement) {
          if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX)) return true;
        }
        return false;
      };
      const out = [...main.querySelectorAll<HTMLElement>("*")].find((el) => el.getBoundingClientRect().right > right + 1 && !clipped(el));
      if (out) return `${out.tagName.toLowerCase()}.${String(out.className).slice(0, 60)}`;
      const all = [...main.querySelectorAll<HTMLElement>("*")]
        .map((el) => ({ el, r: el.getBoundingClientRect().right - right }))
        .filter((x) => x.r > 0)
        .slice(0, 4)
        .map((x) => `${x.el.tagName.toLowerCase()}(${getComputedStyle(x.el).position}) +${x.r.toFixed(1)} ${String(x.el.className).slice(0, 40)}`);
      const outside = [...document.body.querySelectorAll<HTMLElement>("*")]
        .filter((el) => !main.contains(el) && el.getBoundingClientRect().right > window.innerWidth + 1)
        .slice(0, 4)
        .map((el) => `${el.tagName.toLowerCase()}(${getComputedStyle(el).position}) ${String(el.className).slice(0, 50)}`);
      return `doc ${document.documentElement.scrollWidth}/${window.innerWidth} main ${main.scrollWidth}/${main.clientWidth} outside: ${outside.join(" | ")}`;
    });
    if (wide) overflow.push(`${screen}: ${wide}`);
  }
  expect(overflow).toEqual([]);
});

// True when the focused element, or the card around it, draws something to
// show focus: an outline, or a box-shadow ring with a real spread.
async function focusIsVisible(page: Page): Promise<{ ok: boolean; what: string }> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return { ok: true, what: "body" };
    const ring = (node: Element | null) => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const outline = style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
      const shadow = style.boxShadow !== "none" && /\s(?!0px)[\d.]+px(,|$)/.test(style.boxShadow.replace(/rgba?\([^)]*\)/g, ""));
      return outline || shadow;
    };
    const ok = ring(el) || ring(el.parentElement) || ring(el.parentElement?.parentElement ?? null);
    const name = el.getAttribute("aria-label") || el.textContent?.trim().slice(0, 30) || el.tagName;
    return { ok, what: `${el.tagName.toLowerCase()} "${name}"` };
  });
}

test("every Tab stop shows where focus is", async ({ harness }) => {
  const panel = await openPanel(harness, 400);
  await panel.getByRole("button", { name: "Generate", exact: true }).click();
  await expect(panel.getByRole("button", { name: "Copy", exact: true })).toBeEnabled();

  const invisible: string[] = [];
  // Settings is one of Profile's tabs, so it comes after it.
  for (const screen of ["Write", "Profile", "Settings", "Voices"]) {
    await panel.getByRole("button", { name: screen, exact: true }).click();
    await panel.waitForTimeout(200);
    await panel.locator("body").click({ position: { x: 1, y: 60 } });
    for (let i = 0; i < 25; i++) {
      await panel.keyboard.press("Tab");
      const { ok, what } = await focusIsVisible(panel);
      if (!ok) invisible.push(`${screen}: ${what}`);
    }
  }
  expect([...new Set(invisible)]).toEqual([]);
});
