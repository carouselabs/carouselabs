// @vitest-environment node
// Reading a comment out of a model response that is still arriving, and
// deciding how much of it may be shown (lib/ai/commentText.ts). The rule the
// streamed text must obey: never show anything the finished comment won't
// contain — no half word, no banned phrase — and end exactly at the sanitized
// final comment.
import { describe, expect, it } from "vitest";
import {
  extractPartialComment,
  sanitizeComment,
  visibleCommentText,
} from "../../../lib/ai/commentText";

// Every prefix of `raw`, as a stream delivers it one character at a time
// (the worst case for split escapes and half words).
const prefixes = (raw: string) => Array.from({ length: raw.length + 1 }, (_, i) => raw.slice(0, i));

function shownWhileStreaming(raw: string): string[] {
  return prefixes(raw).flatMap((sofar) => {
    const partial = extractPartialComment(sofar);
    return partial ? [visibleCommentText(partial.text, partial.complete)] : [];
  });
}

describe("extractPartialComment", () => {
  it("is null until the comment key has arrived", () => {
    expect(extractPartialComment("")).toBeNull();
    expect(extractPartialComment('{"comm')).toBeNull();
    expect(extractPartialComment('{"comment": ')).toBeNull();
    expect(extractPartialComment('{"comment": "')).toEqual({ text: "", complete: false });
  });

  it("decodes escapes and marks the closing quote", () => {
    expect(extractPartialComment('{"comment": "a \\"quoted\\" line\\nnext \\u00e9"}')).toEqual({
      text: 'a "quoted" line\nnext é',
      complete: true,
    });
  });

  it("never shows half of an escape sequence split across chunks", () => {
    const raw = '{"comment": "caf\\u00e9 \\"yes\\""}';
    for (const sofar of prefixes(raw)) {
      const text = extractPartialComment(sofar)?.text ?? "";
      expect(text).not.toMatch(/\\/);
      expect(text).not.toMatch(/u00/);
    }
  });

  it("holds back the first half of a surrogate pair", () => {
    expect(extractPartialComment('{"comment": "hi \\ud83d')?.text).toBe("hi ");
    expect(extractPartialComment('{"comment": "hi \\ud83d\\ude00"}')?.text).toBe("hi 😀");
  });

  it("finds the key inside a code fence", () => {
    expect(extractPartialComment('```json\n{"comment": "fenced"}')?.text).toBe("fenced");
  });
});

describe("visibleCommentText", () => {
  it("shows whole words only while streaming", () => {
    expect(visibleCommentText("The bi", false)).toBe("The");
    expect(visibleCommentText("The bit ", false)).toBe("The bit");
    expect(visibleCommentText("Onboarding", false)).toBe("");
    expect(visibleCommentText("The bit", true)).toBe("The bit");
  });

  it("holds back a tail that could still become a banned phrase", () => {
    expect(visibleCommentText("Great ", false)).toBe("");
    expect(visibleCommentText("This is great ", false)).toBe("This is");
    expect(visibleCommentText("This is great work ", false)).toBe("This is great work");
    expect(visibleCommentText("Thanks for ", false)).toBe("");
  });

  it("cleans exactly as the final comment is cleaned", () => {
    expect(visibleCommentText("Fast — really #growth ", false)).toBe("Fast - really");
    expect(visibleCommentText("Great post! The 5 steps matter", true)).toBe(sanitizeComment("Great post! The 5 steps matter").comment);
  });

  const responses = [
    '{"comment": "Great post! The move from 14 steps to 5 is the real story here — order beats count. #growth"}',
    '{"comment": "Couldn\'t agree more. Asking \\"what\'s getting in your way?\\" changes the whole meeting."}',
    '```json\n{"comment": "600 applications and 70% of them look the same, that tracks with what I see.\\n\\nSpecifics win."}\n```',
    '{"comment": "Thanks for sharing - the Loom point is underrated 😀"}',
  ];

  it.each(responses)("never shows a banned phrase or a half word, and ends at the final comment: %s", (raw) => {
    const shown = shownWhileStreaming(raw);
    const final = sanitizeComment(extractPartialComment(raw)!.text).comment;

    for (const text of shown) {
      for (const phrase of ["great post", "couldn't agree more", "thanks for sharing"]) {
        expect(text.toLowerCase()).not.toContain(phrase);
      }
      expect(text).not.toContain("#");
      // Whatever is on screen is already in its final form: the finished
      // comment contains it word for word.
      expect(final.startsWith(text) || final.includes(text)).toBe(true);
    }
    expect(shown.at(-1)).toBe(final);
  });
});
