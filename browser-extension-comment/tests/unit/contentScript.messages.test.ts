import { describe, expect, it } from "vitest";
import { byFixture, importContentScript, loadFixture, sendToContentScript, SERVER_CONFIG } from "./helpers";

const READ = "carouselabs:read-conversation";
const INSERT = "carouselabs:insert-comment";

describe("Read this conversation", () => {
  it("reads the open thread on a /messaging/thread/ page", async () => {
    loadFixture("messaging-thread.html", "/messaging/thread/2-bharti/");
    await importContentScript({ config: SERVER_CONFIG });
    const res = (await sendToContentScript({ type: READ })) as { ok: boolean; conversation?: { contact: { name: string } } };
    expect(res.ok).toBe(true);
    expect(res.conversation?.contact.name).toBe("Bharti Agrawal");
  });

  it("refuses on a non-messaging page instead of reading a chat pop-up", async () => {
    loadFixture("feed.html", "/feed/");
    await importContentScript({ config: SERVER_CONFIG });
    const res = (await sendToContentScript({ type: READ })) as { ok: boolean };
    expect(res.ok).toBe(false);
  });

  it("refuses when no conversation is open, rather than treating 'Messaging' as the contact", async () => {
    loadFixture("messaging-inbox-empty.html", "/messaging/");
    await importContentScript({ config: SERVER_CONFIG });
    const res = (await sendToContentScript({ type: READ })) as { ok: boolean; conversation?: { contact: { name: string } } };
    expect(res.ok).toBe(false);
    expect(res.conversation?.contact.name).not.toBe("Messaging");
  });
});

describe("Insert into a conversation", () => {
  it("inserts only when told which thread and contact the text was written for", async () => {
    loadFixture("messaging-thread.html", "/messaging/thread/2-bharti/");
    await importContentScript({ config: SERVER_CONFIG });
    const unbound = (await sendToContentScript({ type: INSERT, text: "Hi Bharti", mode: "message" })) as { ok: boolean };
    expect(unbound.ok).toBe(false);
    const bound = (await sendToContentScript({
      type: INSERT,
      text: "Hi Bharti",
      mode: "message",
      expect: { threadPath: "/messaging/thread/2-bharti/", contactName: "Bharti Agrawal" },
    })) as { ok: boolean };
    expect(bound.ok).toBe(true);
    expect(byFixture("main-compose").textContent).toContain("Hi Bharti");
  });

  it("honours the server kill switch", async () => {
    loadFixture("messaging-thread.html", "/messaging/thread/2-bharti/");
    await importContentScript({ config: { ...SERVER_CONFIG, insertEnabled: false } });
    const res = (await sendToContentScript({
      type: INSERT,
      text: "Hi Bharti",
      mode: "message",
      expect: { threadPath: "/messaging/thread/2-bharti/", contactName: "Bharti Agrawal" },
    })) as { ok: boolean };
    expect(res.ok).toBe(false);
  });
});
