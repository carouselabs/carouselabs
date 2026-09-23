import { useEffect, useRef, useState } from "react";

// Must match LAST_POST_STORAGE_KEY in src/content-script.ts and HomeScreen.tsx.
const LAST_POST_STORAGE_KEY = "lastSelectedPost";

const VISIBLE_MS = 3000;
const FADE_MS = 300;

// Brief confirmation of what the content script just captured: "Comment mode"
// for a post's Comment button, "Reply mode" for Reply under a comment.
// Mounted by App, not HomeScreen, so it shows whichever screen is open.
//
// Listens to storage only. The content script writes every capture there with a
// fresh capturedAt, so each click fires exactly one change; the parallel live
// message would make it fire twice.
export function CaptureToast() {
  const [label, setLabel] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    function clearTimers() {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    }

    function handleStorageChange(
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string,
    ) {
      if (areaName !== "local" || !(LAST_POST_STORAGE_KEY in changes)) return;
      const post = changes[LAST_POST_STORAGE_KEY].newValue as { mode?: string } | undefined;
      if (!post) return;

      clearTimers();
      setLabel(post.mode === "reply" ? "Reply mode" : "Comment mode");
      setVisible(true);
      timers.current.push(
        window.setTimeout(() => setVisible(false), VISIBLE_MS),
        window.setTimeout(() => setLabel(null), VISIBLE_MS + FADE_MS),
      );
    }

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      clearTimers();
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  if (!label) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      // Full panel width less a gutter, white with the brand purple (the
      // primary token, #7C3AED) for text and border. The same look for
      // either mode; only the label differs.
      className={`pointer-events-none absolute inset-x-3 top-3 z-50 rounded-lg border-2 border-primary bg-white px-4 py-3 text-center text-sm font-semibold text-primary shadow-lg transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {label}
    </div>
  );
}
