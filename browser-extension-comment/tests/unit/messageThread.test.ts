import { describe, expect, it } from "vitest";
import { extractConversation, insertIntoComposeBox } from "@/content/messageThread";
import { byFixture, loadFixture } from "./helpers";

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
