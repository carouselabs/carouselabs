// Reading an X chat and filling its message box, on test pages built from
// layouts of X's real Chat (tests/fixtures/x/x-dm-*.html): the person from
// the header, who said what from each message's side, the words without the
// time, and Insert only into the chat the message was written for.
import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { insertIntoChat, readChat } from "@/x/content/xChat";

const FIXTURES = path.resolve(__dirname, "../fixtures/x");

// jsdom doesn't attach declarative shadow roots (<template shadowrootmode>)
// as Chromium does when it parses a page, so attach them here.
function openPage(fixture: string, url: string) {
  (globalThis as unknown as { jsdom: { reconfigure(o: { url: string }): void } }).jsdom.reconfigure({ url });
  const parsed = new DOMParser().parseFromString(fs.readFileSync(path.join(FIXTURES, fixture), "utf8"), "text/html");
  document.body.innerHTML = parsed.body.innerHTML;
  for (let template = document.querySelector("template[shadowrootmode]"); template; template = document.querySelector("template[shadowrootmode]")) {
    const host = template.parentElement!;
    const root = host.attachShadow({ mode: template.getAttribute("shadowrootmode") as ShadowRootMode });
    root.appendChild((template as HTMLTemplateElement).content);
    template.remove();
  }
}

const chatBox = () =>
  document.querySelector('[data-testid="xchatEmbedRoute"]')!.shadowRoot!.querySelector<HTMLTextAreaElement>('textarea[data-testid="dm-composer-textarea"]')!;

beforeEach(() => {
  // jsdom has no editing: the browser's insertText into a textarea.
  document.execCommand = vi.fn((command: string, _ui?: boolean, value?: string) => {
    const box = document.activeElement as HTMLTextAreaElement | null;
    if (command !== "insertText" || !box || box.tagName !== "TEXTAREA") return false;
    box.setRangeText(value ?? "", box.selectionStart, box.selectionEnd, "end");
    return true;
  }) as typeof document.execCommand;
});

describe("reading a chat", () => {
  it("reads the person and who said what, in order", () => {
    openPage("x-dm-chat.html", "https://x.com/i/chat/1234-5678");
    const res = readChat();
    if (!res.ok) throw new Error(res.error);
    expect(res.conversation).toEqual({
      contact: { name: "Sam Lee", handle: "sam_lee", profileUrl: "https://x.com/sam_lee" },
      threadPath: "/i/chat/1234-5678",
      thread: [
        { sender: "me", text: "Would love to compare notes on pricing for seat-based plans." },
        { sender: "them", text: "Sure! We moved to usage-based last quarter. What are you working on?" },
      ],
    });
  });

  it("asks for a chat on the inbox, and off Messages", () => {
    openPage("x-dm-inbox.html", "https://x.com/i/chat");
    expect(readChat()).toEqual({ ok: false, error: "Open a chat on X (Messages), then try again." });
    openPage("x-home.html", "https://x.com/home");
    expect(readChat().ok).toBe(false);
  });
});

describe("Insert into a chat", () => {
  beforeEach(() => openPage("x-dm-chat.html", "https://x.com/i/chat/1234-5678"));

  it("fills the message box of the chat it was written for, after anything typed", async () => {
    chatBox().value = "Hey!";
    expect(await insertIntoChat("Happy to share what we tried.", { threadPath: "/i/chat/1234-5678", handle: "sam_lee" })).toEqual({ ok: true });
    expect(chatBox().value).toBe("Hey! Happy to share what we tried.");
  });

  it("refuses in another chat, or with another person in it", async () => {
    expect((await insertIntoChat("Hi", { threadPath: "/i/chat/9999-0000", handle: "sam_lee" })).error).toMatch(/another chat/);
    expect((await insertIntoChat("Hi", { threadPath: "/i/chat/1234-5678", handle: "someone_else" })).error).toMatch(/another chat/);
    expect(chatBox().value).toBe("");
  });

  it("refuses without a chat read first", async () => {
    expect((await insertIntoChat("Hi", undefined)).ok).toBe(false);
  });

  it("falls back to setting the box's value the way X's own code notices", async () => {
    document.execCommand = vi.fn(() => false) as typeof document.execCommand;
    const inputs: string[] = [];
    chatBox().addEventListener("input", () => inputs.push(chatBox().value));
    expect(await insertIntoChat("Happy to share.", { threadPath: "/i/chat/1234-5678", handle: "sam_lee" })).toEqual({ ok: true });
    expect(inputs).toEqual(["Happy to share."]);
  });
});
