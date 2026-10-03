// Sign-in hand-off in real Chromium, for whichever extension is loaded
// (EXT_DIST=dist or dist-store for LinkedIn, dist-x or dist-x-store for X).
// The website's hand-off page posts the token under the asking extension's
// name; with both extensions installed, each must store only its own.
import { expect, test } from "./harness";

const isX = /dist-x/.test(process.env.EXT_DIST ?? "dist");
const OWN = isX ? "carouselabs:x-extension-token" : "carouselabs:extension-token";
const OTHER = isX ? "carouselabs:extension-token" : "carouselabs:x-extension-token";

// The hand-off page, reduced to what reaches the extension: postMessage calls
// to itself, run when the test asks.
const PAGE = `<!doctype html><html><body><p>Connecting…</p><script>
  window.post = (type, token) => window.postMessage({ type, token }, window.location.origin);
</script></body></html>`;

test(`stores only its own token (${isX ? "X" : "LinkedIn"} extension) and closes the hand-off tab`, async ({ harness }) => {
  await harness.context.route("https://carouselabs.com/extension-connect**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: PAGE }),
  );
  const page = await harness.context.newPage();
  const relayLoaded = page.waitForEvent("console", { predicate: (msg) => msg.text().startsWith("[authRelay] content script loaded") });
  await page.goto(`https://carouselabs.com/extension-connect${isX ? "?for=x" : ""}`);
  await relayLoaded;

  // The other extension's token: ignored.
  await page.evaluate(([type]) => (window as unknown as { post: (t: string, k: string) => void }).post(type, "cl_cmt_other"), [OTHER]);
  await page.waitForTimeout(800);
  expect((await harness.storage()).extensionToken).toBeUndefined();
  expect(page.isClosed()).toBe(false);

  // Its own: stored, and the hand-off tab closed.
  const closed = page.waitForEvent("close");
  await page.evaluate(([type]) => (window as unknown as { post: (t: string, k: string) => void }).post(type, "cl_cmt_own"), [OWN]);
  await expect.poll(async () => (await harness.storage()).extensionToken).toBe("cl_cmt_own");
  await closed;
});
