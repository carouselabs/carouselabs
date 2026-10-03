// The development-only layout saver (src/x/content/devSnapshot.ts) in real
// Chromium on the X extension's dev build: Ctrl+Alt+Shift+S downloads the
// page's structure, reaching into a CLOSED shadow root (where X's Chat
// sits), with every word scrubbed. Store builds don't contain it.
import fs from "node:fs";
import { expect, test } from "./harness";

const dist = process.env.EXT_DIST ?? "dist";
test.skip(dist !== "dist-x", "the X extension's development build only (EXT_DIST=dist-x)");

test("saves the layout of a chat in a closed shadow root, with no words in it", async ({ harness }) => {
  harness.xPages.set("/messages/123-456", "");
  await harness.context.route("https://x.com/messages/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: `<!doctype html><html><body>
        <div data-testid="primaryColumn"><div data-testid="xchatEmbedRoute" id="chat"></div></div>
        <script>
          const root = document.getElementById("chat").attachShadow({ mode: "closed" });
          root.innerHTML = '<div role="log" class="thread"><div data-testid="message" aria-label="Message from Priya Raman">Secret plans for Tuesday 4pm</div></div>' +
            '<div contenteditable="true" role="textbox" aria-label="Start a new message"></div>';
        </script>
      </body></html>`,
    }),
  );
  const page = await harness.context.newPage();
  await page.goto("https://x.com/messages/123-456");
  await expect
    .poll(() =>
      harness.worker.evaluate(async () => {
        const [tab] = await chrome.tabs.query({ url: "https://x.com/*" });
        try {
          return ((await chrome.tabs.sendMessage(tab.id!, { type: "carouselabs:ping" })) as { ok?: boolean })?.ok === true;
        } catch {
          return false;
        }
      }),
    )
    .toBe(true);

  const download = page.waitForEvent("download");
  await page.keyboard.press("Control+Alt+Shift+KeyS");
  const file = await (await download).path();
  const html = fs.readFileSync(file, "utf8");

  // The structure inside the closed shadow root is there…
  expect(html).toContain('<template shadowrootmode="closed">');
  expect(html).toContain('data-testid="message"');
  expect(html).toContain('role="textbox"');
  expect(html).toContain('contenteditable="true"');
  // …and none of the words.
  expect(html).not.toMatch(/Secret|plans|Tuesday|Priya|Raman/);
  expect(html).toContain("xxxxxx xxxxx xxx xxxxxxx 0xx");
});
