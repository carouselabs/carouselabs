import { describe, expect, it } from "vitest";
import { extractConversation, insertIntoComposeBox, readConversation } from "@/content/messageThread";
import { byFixture, loadFixture, loadFixtureInMessagingFrame } from "./helpers";

const BHARTI_PATH = "/messaging/thread/2-bharti/";
const EXPECT_BHARTI = { threadPath: BHARTI_PATH, contactName: "Bharti Agrawal" };

async function readBharti() {
  loadFixture("messaging-thread.html", BHARTI_PATH);
  return (await extractConversation()).result;
}

describe("reading a 1:1 conversation", () => {
  it("reads the contact's name and headline from the open thread", async () => {
    const { contact } = await readBharti();
    expect(contact.name).toBe("Bharti Agrawal");
    expect(contact.headline).toBe("Associate Manager- Human Resources | HR Business Partner");
  });

  it("reads only the open thread's messages — not a hidden stale thread or a chat pop-up", async () => {
    const { thread } = await readBharti();
    const texts = thread.map((m) => m.text);
    expect(texts).toHaveLength(4);
    expect(texts.join(" ")).not.toMatch(/Emma/);
    expect(texts.join(" ")).not.toMatch(/Thursday/);
  });

  it("keeps an edited message's full text, not just its (Edited) marker", async () => {
    const { thread } = await readBharti();
    expect(thread[0].text).toMatch(/^Hi Bharti, I’m exploring Product Manager opportunities\./);
    expect(thread[0].text).toMatch(/Would love to connect and share my profile\./);
  });

  it("skips attachment-only messages instead of inventing text for them", async () => {
    const { thread } = await readBharti();
    expect(thread.map((m) => m.text).join(" ")).not.toMatch(/docx/);
  });

  it("attributes each message to the right person, including a second message in the same group", async () => {
    const { thread } = await readBharti();
    expect(thread.map((m) => m.sender)).toEqual(["me", "them", "me", "me"]);
  });

  it("still attributes correctly when the thread header has no profile link", async () => {
    loadFixture("messaging-thread.html", BHARTI_PATH);
    byFixture("header-link").remove();
    const { result } = await extractConversation();
    expect(result.thread.map((m) => m.sender)).toEqual(["me", "them", "me", "me"]);
  });

  it("never inverts who said what when the header link points at the user's own profile", async () => {
    loadFixture("messaging-thread.html", BHARTI_PATH);
    byFixture<HTMLAnchorElement>("header-link").href = "https://www.linkedin.com/in/ACoAAAnant000/";
    const { result } = await extractConversation();
    expect(result.thread.map((m) => m.sender)).toEqual(["me", "them", "me", "me"]);
  });

  it("returns the thread path it read, so a later Insert can be bound to it", async () => {
    loadFixture("messaging-thread.html", BHARTI_PATH);
    const { result } = await extractConversation();
    expect((result as { threadPath?: string }).threadPath).toBe(BHARTI_PATH);
  });
});

describe("reading a group conversation", () => {
  it("does not attribute another participant's messages to the user", async () => {
    loadFixture("messaging-group.html", "/messaging/thread/2-group/");
    const { result } = await extractConversation();
    // Looked up by prefix and asserted present first: a missing entry must
    // fail the test, not satisfy a `not.toBe("me")` by being undefined.
    const senderOf = (prefix: string) => {
      const entry = result.thread.find((m) => m.text.startsWith(prefix));
      expect(entry, `no message starting "${prefix}"`).toBeDefined();
      return entry!.sender;
    };
    expect(result.thread).toHaveLength(3);
    expect(senderOf("Great to meet")).not.toBe("me");
    expect(senderOf("Welcome both")).not.toBe("me");
    expect(senderOf("Thanks Priya")).toBe("me");
  });
});

describe("inserting into the message box", () => {
  it("fills the open thread's compose box and nothing else", async () => {
    loadFixture("messaging-thread.html", BHARTI_PATH);
    const result = insertIntoComposeBox("Hello Bharti", EXPECT_BHARTI);
    expect(result.ok).toBe(true);
    expect(byFixture("main-compose").textContent).toContain("Hello Bharti");
    expect(byFixture("overlay-compose").textContent).toBe("");
    expect(byFixture("stale-compose").textContent).toBe("");
  });

  it("refuses when a different conversation is now open than the one that was read", async () => {
    loadFixture("messaging-thread.html", BHARTI_PATH);
    history.replaceState(null, "", "/messaging/thread/2-emma/");
    const result = insertIntoComposeBox("Hello Bharti", EXPECT_BHARTI);
    expect(result.ok).toBe(false);
    expect(byFixture("main-compose").textContent).toBe("");
  });

  it("refuses when the open conversation's name no longer matches the one that was read", async () => {
    loadFixture("messaging-thread.html", BHARTI_PATH);
    document.querySelector("[data-fixture='open-thread'] .msg-entity-lockup__entity-title")!.textContent = "Emma Atkins 🖤";
    const result = insertIntoComposeBox("Hello Bharti", EXPECT_BHARTI);
    expect(result.ok).toBe(false);
  });

  it("never falls back to a chat pop-up's or a hidden thread's compose box", async () => {
    loadFixture("messaging-thread.html", BHARTI_PATH);
    byFixture("main-compose").remove();
    const result = insertIntoComposeBox("Hello Bharti", EXPECT_BHARTI);
    expect(result.ok).toBe(false);
    expect(byFixture("overlay-compose").textContent).toBe("");
    expect(byFixture("stale-compose").textContent).toBe("");
  });

  it("keeps a draft the user already typed, adding the new text after it", async () => {
    loadFixture("messaging-thread.html", BHARTI_PATH);
    byFixture("main-compose").innerHTML = "<p>Quick note first.</p>";
    insertIntoComposeBox("Hello Bharti", EXPECT_BHARTI);
    const text = byFixture("main-compose").textContent ?? "";
    expect(text).toContain("Quick note first.");
    expect(text.indexOf("Quick note first.")).toBeLessThan(text.indexOf("Hello Bharti"));
  });
});

// LinkedIn's newer design (seen live 2026-09-27): the page is a new shell with
// a hidden feed, and Messaging is the classic app inside a full-screen frame.
// Before this was handled, every read said "No conversation is open".
describe("LinkedIn's newer design, with Messaging in a frame", () => {
  it("reads the conversation from inside the frame, with the same guards as before", async () => {
    loadFixtureInMessagingFrame("messaging-thread.html", BHARTI_PATH);
    const res = await readConversation();
    expect(res.ok).toBe(true);
    expect(res.conversation?.contact.name).toBe("Bharti Agrawal");
    // Thread path still comes from the page's own address.
    expect(res.conversation?.threadPath).toBe(BHARTI_PATH);
    const thread = res.conversation!.thread;
    expect(thread.map((m) => m.sender)).toEqual(["me", "them", "me", "me"]);
    // The frame's hidden stale thread and chat pop-up stay out, as on the page.
    expect(JSON.stringify(thread)).not.toMatch(/Emma|Thursday/);
  });

  it("inserts into the frame's message box, never the hidden feed's comment box", () => {
    const frameDoc = loadFixtureInMessagingFrame("messaging-thread.html", BHARTI_PATH);
    const result = insertIntoComposeBox("Hello Bharti", EXPECT_BHARTI);
    expect(result.ok).toBe(true);
    expect(frameDoc.querySelector('[data-fixture="main-compose"]')?.textContent).toContain("Hello Bharti");
    expect(frameDoc.querySelector('[data-fixture="overlay-compose"]')?.textContent).toBe("");
    expect(byFixture("feed-comment-box").textContent).toBe("");
  });

  it("still refuses an Insert after switching to another conversation", () => {
    loadFixtureInMessagingFrame("messaging-thread.html", BHARTI_PATH);
    history.replaceState(null, "", "/messaging/thread/2-emma/");
    expect(insertIntoComposeBox("Hello Bharti", EXPECT_BHARTI).ok).toBe(false);
  });

  it("says the conversation is hidden, not missing, when LinkedIn shows only the chat list", async () => {
    const frameDoc = loadFixtureInMessagingFrame("messaging-thread.html", BHARTI_PATH);
    (frameDoc.querySelector('[data-fixture="open-thread"]') as HTMLElement).style.display = "none";
    const res = await readConversation();
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/chat list/);
  });

  it("leaves the classic design alone: a thread on the page itself is read from the page", async () => {
    const { contact } = await readBharti();
    expect(contact.name).toBe("Bharti Agrawal");
    expect(document.querySelector('iframe[data-testid="interop-iframe"]')).toBeNull();
  });
});

