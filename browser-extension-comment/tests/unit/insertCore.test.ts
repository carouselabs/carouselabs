// The parts every Insert shares: typing into a site's editor and checking it
// took the text (src/content/editor.ts), one Insert typing at most once
// (src/lib/insertOnce.ts), and waiting briefly for a box that is still
// opening (src/content/waitFor.ts). Real editors in real Chromium are covered
// by tests/e2e/insertReliability.spec.ts; here, the decisions.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { comparable, holdsText, typeInto, usableEditor } from "@/content/editor";
import { insertOnce, resetInsertAttempts } from "@/lib/insertOnce";
import { waitFor } from "@/content/waitFor";

function editor(html = "<p><br></p>"): HTMLElement {
  const box = document.createElement("div");
  box.setAttribute("contenteditable", "true");
  box.innerHTML = html;
  document.body.append(box);
  return box;
}

const realExecCommand = document.execCommand;

afterEach(() => {
  document.body.innerHTML = "";
  document.execCommand = realExecCommand;
  vi.useRealTimers();
});

describe("checking the text landed", () => {
  it("ignores how an editor lays text out: line breaks, non-breaking spaces, emoji drawn as pictures", () => {
    expect(comparable("Fair point.\n\nThe invite step")).toBe(comparable("Fair point.The invite step"));
    expect(comparable("Congrats 🎉 team")).toBe(comparable("Congrats  team"));
  });

  it("counts only text added to what was there, so a box that already held it doesn't pass", () => {
    const box = editor("<p>Great post</p>");
    expect(holdsText(box, "Great post", "Great post")).toBe(false);
    box.innerHTML = "<p>Great post</p><p>Great post</p>";
    expect(holdsText(box, "Great post", "Great post")).toBe(true);
  });

  it("only calls a box usable when it is on the page, editable and shown", () => {
    const box = editor();
    expect(usableEditor(box)).toBe(true);
    box.setAttribute("contenteditable", "false");
    expect(usableEditor(box)).toBe(false);
    box.setAttribute("contenteditable", "true");
    box.parentElement!.setAttribute("hidden", "");
    expect(usableEditor(box)).toBe(false);
    box.parentElement!.removeAttribute("hidden");
    const field = document.createElement("textarea");
    field.disabled = true;
    document.body.append(field);
    expect(usableEditor(field)).toBe(false);
    box.remove();
    expect(usableEditor(box)).toBe(false);
  });
});

describe("typing into an editor", () => {
  it("types after a draft, with a space between, and reports success once the box holds it", async () => {
    const box = editor("<p>Love this.</p>");
    const res = await typeInto(box, "Congrats on the hires", { failure: "no" });
    expect(res).toEqual({ ok: true });
    expect(box.textContent).toBe("Love this. Congrats on the hires");
  });

  it("never pastes on top of text the browser's own input already put in (X's two-line reply used to land twice)", async () => {
    const box = editor();
    // Like Chromium: each line becomes its own paragraph, no "\n" in the text.
    document.execCommand = vi.fn((command: string, _ui?: boolean, value = "") => {
      if (command !== "insertText") return false;
      box.innerHTML = value
        .split("\n")
        .map((line) => `<p>${line || "<br>"}</p>`)
        .join("");
      return true;
    }) as typeof document.execCommand;
    // And, like Draft.js, the editor would also take a paste.
    const pasted = vi.fn();
    box.addEventListener("paste", pasted);

    const res = await typeInto(box, "Fair point.\n\nThe invite step matters most.", { failure: "no" });
    expect(res).toEqual({ ok: true });
    expect(pasted).not.toHaveBeenCalled();
    expect(box.textContent).toBe("Fair point.The invite step matters most.");
  });

  it("falls back to a paste only when the browser's input changed nothing, and checks that landed too", async () => {
    const box = editor();
    document.execCommand = vi.fn(() => false) as typeof document.execCommand;
    box.addEventListener("paste", (event) => {
      event.preventDefault();
      box.textContent = (event as ClipboardEvent).clipboardData?.getData("text/plain") ?? "";
    });
    expect(await typeInto(box, "Pasted in", { failure: "no" })).toEqual({ ok: true });
    expect(box.textContent).toBe("Pasted in");
  });

  it("says it failed when nothing takes the text, rather than writing it into the page", async () => {
    const box = editor();
    document.execCommand = vi.fn(() => false) as typeof document.execCommand;
    expect(await typeInto(box, "Nowhere", { failure: "Use Copy." })).toEqual({ ok: false, error: "Use Copy." });
    expect(box.textContent).toBe("");
  });

  it("says it failed when the editor drops the text on its next redraw", async () => {
    const box = editor();
    box.addEventListener("input", () => setTimeout(() => (box.innerHTML = "<p><br></p>"), 0));
    expect(await typeInto(box, "Dropped", { failure: "Use Copy." })).toEqual({ ok: false, error: "Use Copy." });
  });

  it("checks the box the editor redrew in place of the one it typed into", async () => {
    const box = editor();
    let current: HTMLElement = box;
    box.addEventListener("input", () =>
      setTimeout(() => {
        current = editor(box.innerHTML);
        box.replaceWith(current);
      }, 0),
    );
    const res = await typeInto(box, "Kept after the redraw", { failure: "no", refind: () => current });
    expect(res).toEqual({ ok: true });
    expect(current.textContent).toContain("Kept after the redraw");
  });

  it("uses a text field's own value setter only when typing changed nothing (React's recognised way)", async () => {
    const field = document.createElement("textarea");
    field.value = "Hi";
    document.body.append(field);
    document.execCommand = vi.fn(() => false) as typeof document.execCommand;
    const changes = vi.fn();
    field.addEventListener("input", changes);
    expect(await typeInto(field, "there", { failure: "no" })).toEqual({ ok: true });
    expect(field.value).toBe("Hi there");
    expect(changes).toHaveBeenCalledTimes(1);
  });

  it("calls onWrite before touching the box", async () => {
    const box = editor();
    const seen: string[] = [];
    await typeInto(box, "Text", { failure: "no", onWrite: () => seen.push(box.textContent ?? "") });
    expect(seen).toEqual([""]);
  });
});

describe("one Insert types once", () => {
  beforeEach(() => resetInsertAttempts());

  it("a repeat of the same id, at the same time or later, gets the first answer and never runs again", async () => {
    let release!: () => void;
    const insert = vi.fn(async (wrote: () => void) => {
      wrote();
      await new Promise<void>((resolve) => (release = resolve));
      return { ok: true };
    });
    const first = insertOnce("a", insert);
    const second = insertOnce("a", insert);
    release();
    expect(await first).toEqual({ ok: true });
    expect(await second).toEqual({ ok: true });
    expect(await insertOnce("a", insert)).toEqual({ ok: true });
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("a first attempt that failed before touching the box may be tried again", async () => {
    const insert = vi
      .fn<(wrote: () => void) => Promise<{ ok: boolean; error?: string }>>()
      .mockResolvedValueOnce({ ok: false, error: "Couldn't reach CarouseLabs" })
      .mockResolvedValueOnce({ ok: true });
    expect((await insertOnce("b", insert)).ok).toBe(false);
    expect(await insertOnce("b", insert)).toEqual({ ok: true });
    expect(insert).toHaveBeenCalledTimes(2);
  });

  it("one that touched the box and still failed is not tried again (it could type twice)", async () => {
    const insert = vi.fn(async (wrote: () => void) => {
      wrote();
      return { ok: false, error: "didn't keep it" };
    });
    expect((await insertOnce("c", insert)).error).toBe("didn't keep it");
    expect((await insertOnce("c", insert)).error).toBe("didn't keep it");
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("a new click (a new id) inserts again, and an older panel's Insert (no id) always runs", async () => {
    const insert = vi.fn(async () => ({ ok: true }));
    await insertOnce("d", insert);
    await insertOnce("e", insert);
    await insertOnce(undefined, insert);
    await insertOnce(undefined, insert);
    expect(insert).toHaveBeenCalledTimes(4);
  });

  it("forgets ids after ten minutes", async () => {
    let now = 0;
    const insert = vi.fn(async () => ({ ok: true }));
    await insertOnce("f", insert, () => now);
    now = 10 * 60_000 + 1;
    await insertOnce("g", insert, () => now);
    await insertOnce("f", insert, () => now);
    expect(insert).toHaveBeenCalledTimes(3);
  });
});

describe("waiting for a box", () => {
  it("answers at once when it is already there, without watching the page", async () => {
    const observe = vi.spyOn(MutationObserver.prototype, "observe");
    expect(await waitFor(() => document.body, 2_000)).toBe(document.body);
    expect(observe).not.toHaveBeenCalled();
    observe.mockRestore();
  });

  it("answers as soon as it appears, then stops watching", async () => {
    const disconnect = vi.spyOn(MutationObserver.prototype, "disconnect");
    const found = waitFor(() => document.querySelector("#late"), 2_000);
    setTimeout(() => {
      const el = document.createElement("div");
      el.id = "late";
      document.body.append(el);
    }, 20);
    expect((await found)?.id).toBe("late");
    expect(disconnect).toHaveBeenCalled();
    disconnect.mockRestore();
  });

  it("gives up after its time, with nothing", async () => {
    vi.useFakeTimers();
    const found = waitFor(() => document.querySelector("#never"), 2_000);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(await found).toBeNull();
  });
});
