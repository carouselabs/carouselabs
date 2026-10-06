// src/lib/insertOnce.ts — one Insert types its text at most once, in the
// LinkedIn and X content scripts.
//
// The panel gives every Insert click its own id. The same id can reach a page
// twice: the panel re-sends after a lost answer (src/lib/tabs.ts injects a
// fresh content script and tries again), or two copies of the content script
// are briefly running in one tab (an update). A repeat of an id gets the first
// attempt's answer instead of typing again; only a first attempt that failed
// before touching the box may be tried again. A new click is a new id, so the
// same text can still be inserted on purpose, anywhere.
//
// Kept on the content script's global object, which every copy of the script
// in the tab shares (the same object the copies' takeover at the end of
// src/content-script.ts uses).

export type InsertAnswer = { ok: boolean; error?: string } & Record<string, unknown>;

interface Attempt {
  at: number;
  // Set once the box was (or may have been) changed.
  wrote: boolean;
  answer: Promise<InsertAnswer>;
}

const REGISTRY_KEY = "__carouselabsInserts";
// Long enough to cover any resend; ids are never reused.
const KEEP_MS = 10 * 60_000;

function attempts(): Map<string, Attempt> {
  const scope = globalThis as unknown as Record<string, Map<string, Attempt> | undefined>;
  return (scope[REGISTRY_KEY] ??= new Map());
}

// Runs `insert` for this id unless it already ran. `insert` calls
// `wrote()` right before it first changes the box.
export async function insertOnce(
  id: unknown,
  insert: (wrote: () => void) => Promise<InsertAnswer>,
  now: () => number = Date.now,
): Promise<InsertAnswer> {
  // An older panel sends no id: nothing to match a repeat against.
  if (typeof id !== "string" || id === "") return insert(() => {});

  const all = attempts();
  for (const [key, attempt] of all) if (now() - attempt.at > KEEP_MS) all.delete(key);

  const earlier = all.get(id);
  if (earlier) {
    const answer = await earlier.answer.catch((): InsertAnswer | null => null);
    if (answer?.ok) return answer;
    // It changed the box and still failed (the editor didn't keep the text):
    // trying again could type it twice, so the same answer stands.
    if (earlier.wrote) return answer ?? { ok: false, error: "Insert didn't finish. Check the box on the page, or use Copy." };
  }

  const attempt: Attempt = { at: now(), wrote: false, answer: Promise.resolve({ ok: false }) };
  attempt.answer = insert(() => {
    attempt.wrote = true;
  });
  all.set(id, attempt);
  return attempt.answer;
}

// For tests: forget every attempt.
export function resetInsertAttempts(): void {
  attempts().clear();
}
