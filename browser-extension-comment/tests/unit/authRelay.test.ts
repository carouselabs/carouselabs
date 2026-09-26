import { describe, expect, it, vi } from "vitest";
import { chromeMock } from "../setup/chrome";

async function loadRelay() {
  vi.resetModules();
  history.replaceState(null, "", "/extension-connect");
  await import("@/content/authRelay");
}

function post(data: unknown, init: Partial<MessageEventInit> = {}) {
  window.dispatchEvent(new MessageEvent("message", { data, origin: window.location.origin, source: window, ...init }));
}

describe("sign-in relay", () => {
  it("relays a same-origin token message into the extension", async () => {
    await loadRelay();
    post({ type: "carouselabs:extension-token", token: "cl_cmt_abc" });
    expect(chromeMock().runtime.sendMessage).toHaveBeenCalledWith(
      { type: "carouselabs:extension-token", token: "cl_cmt_abc" },
      expect.any(Function),
    );
  });

  it.each([
    ["another origin", { origin: "https://evil.example" }],
    ["another window", { source: null }],
  ])("ignores a message from %s", async (_label, init) => {
    await loadRelay();
    post({ type: "carouselabs:extension-token", token: "cl_cmt_abc" }, init as Partial<MessageEventInit>);
    expect(chromeMock().runtime.sendMessage).not.toHaveBeenCalled();
  });

  it.each([null, "string", { type: "other", token: "x" }, { type: "carouselabs:extension-token", token: 5 }])(
    "ignores a malformed payload %o",
    async (data) => {
      await loadRelay();
      post(data);
      expect(chromeMock().runtime.sendMessage).not.toHaveBeenCalled();
    },
  );
});
