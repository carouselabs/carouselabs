import { describe, expect, it } from "vitest";
import { findConnectButton } from "@/content/connectNote";
import { byFixture, click, importContentScript, loadFixture, readFixture, sendToContentScript, SERVER_CONFIG, storedPost } from "./helpers";

const INSERT = "carouselabs:insert-comment";
const JANE_URL = "https://www.linkedin.com/in/jane-doe/";

async function janeProfile() {
  loadFixture("profile.html", "/in/jane-doe/");
  await importContentScript({ config: SERVER_CONFIG });
}

// LinkedIn's "Add a note" dialog. Free accounts get a 200-character note box,
// Premium 300 (the limit is enforced by the textarea's maxlength).
function openNoteDialog(maxLength: number) {
  const dialog = document.createElement("div");
  dialog.setAttribute("role", "dialog");
  dialog.innerHTML = `<textarea name="message" id="custom-message" maxlength="${maxLength}"></textarea><button>Send</button>`;
  document.body.append(dialog);
  return dialog.querySelector("textarea")!;
}

function noteFor(target: string) {
  return { type: INSERT, mode: "connect", text: "Hi Jane — loved your post on shipping small. Would be great to connect.", expect: { profileUrl: target } };
}

describe("capturing a Connect click", () => {
  it("captures the profile owner from the top-card Connect", async () => {
    await janeProfile();
    await click(byFixture("topcard-connect"));
    const post = await storedPost();
    expect(post?.mode).toBe("connect");
    expect(post?.connect.target).toMatchObject({
      name: "Jane Doe",
      headline: "Founder at Acme — helping product teams ship faster",
      url: JANE_URL,
    });
    expect(post?.connect.target.about).toMatch(/^I help product teams ship small/);
    expect(post?.connect.target.currentRole).toBe("Founder at Acme");
  });

  it("captures from the More-menu Connect (componentkey + vanityName)", async () => {
    await janeProfile();
    await click(byFixture("more-menu-connect"));
    expect((await storedPost())?.connect.target.name).toBe("Jane Doe");
  });

  it("ignores a sidebar Connect for someone else", async () => {
    await janeProfile();
    await click(byFixture("sidebar-connect"));
    expect(await storedPost()).toBeUndefined();
  });

  it.each(["connected", "pending", "follow-only", "inmail"])("does not treat the %s state as a Connect", (state) => {
    const doc = new DOMParser().parseFromString(readFixture("profile-states.html"), "text/html");
    const button = doc.querySelector(`[data-state="${state}"] button`)!;
    expect(findConnectButton(button)).toBeNull();
  });
});

describe("Insert into the 'Add a note' box", () => {
  it("fills the note box for the person the note was written for", async () => {
    await janeProfile();
    await click(byFixture("topcard-connect"));
    const box = openNoteDialog(300);
    const res = (await sendToContentScript(noteFor(JANE_URL))) as { ok: boolean };
    expect(res.ok).toBe(true);
    expect(box.value).toMatch(/^Hi Jane/);
  });

  it("refuses after a Connect for someone else was clicked since (their dialog is the one open)", async () => {
    await janeProfile();
    await click(byFixture("topcard-connect"));
    await click(byFixture("sidebar-connect"));
    const box = openNoteDialog(300);
    const res = (await sendToContentScript(noteFor(JANE_URL))) as { ok: boolean };
    expect(res.ok).toBe(false);
    expect(box.value).toBe("");
  });

  it("refuses on a different person's profile", async () => {
    await janeProfile();
    await click(byFixture("topcard-connect"));
    history.replaceState(null, "", "/in/john-roe/");
    const box = openNoteDialog(300);
    const res = (await sendToContentScript(noteFor(JANE_URL))) as { ok: boolean };
    expect(res.ok).toBe(false);
    expect(box.value).toBe("");
  });

  it("refuses a note longer than the box allows (free accounts: 200) instead of letting it be cut off", async () => {
    await janeProfile();
    await click(byFixture("topcard-connect"));
    const box = openNoteDialog(200);
    const long = { ...noteFor(JANE_URL), text: `Hi Jane, ${"really enjoyed your writing on product. ".repeat(6)}`.trim() };
    expect(long.text.length).toBeGreaterThan(200);
    const res = (await sendToContentScript(long)) as { ok: boolean; error?: string };
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/200/);
    expect(box.value).toBe("");
  });

  it("allows the same note on a Premium box (300)", async () => {
    await janeProfile();
    await click(byFixture("topcard-connect"));
    const box = openNoteDialog(300);
    const text = `Hi Jane, ${"really enjoyed your writing on product. ".repeat(6)}`.trim();
    const res = (await sendToContentScript({ ...noteFor(JANE_URL), text })) as { ok: boolean };
    expect(res.ok).toBe(true);
    expect(box.value).toBe(text);
  });
});
