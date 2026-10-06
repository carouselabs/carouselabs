// src/content/waitFor.ts — waits, briefly, for something to appear on the
// page: a comment or reply box LinkedIn (or X) is still opening when Insert
// arrives, or a post card it is redrawing. Re-checks on every change to the
// page instead of polling, and gives up after `timeoutMs`; the page watcher
// and the timer are always cleaned up.
export function waitFor<T>(find: () => T | null, timeoutMs: number, root: Node = document.documentElement): Promise<T | null> {
  const now = find();
  if (now !== null || timeoutMs <= 0) return Promise.resolve(now);

  return new Promise((resolve) => {
    let done = false;
    const finish = (value: T | null) => {
      if (done) return;
      done = true;
      observer.disconnect();
      clearTimeout(timer);
      resolve(value);
    };
    const observer = new MutationObserver(() => {
      const found = find();
      if (found !== null) finish(found);
    });
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      // What makes a box appear or become typable.
      attributeFilter: ["contenteditable", "hidden", "style", "class", "disabled", "readonly"],
    });
    const timer = setTimeout(() => finish(find()), timeoutMs);
  });
}
