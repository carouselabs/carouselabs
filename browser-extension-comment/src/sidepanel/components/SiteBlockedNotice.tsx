import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { browserName, extensionsIconLooks } from "@/lib/browserName";
import { reportClientError } from "@/lib/errorReport";
import { PLATFORM, SITE_NAME } from "@/lib/platform";
import { contentScriptStatus, SITE_HOST } from "@/lib/tabs";
import { activeTab, onActiveTabChange } from "../activeTab";

// Whether the browser blocks extensions on the site in the tab the panel
// works with (src/lib/tabs.ts, ContentScriptStatus). Checking also puts the
// content script into a site tab that lacks one (opened before an update),
// so a Comment click there reaches the panel. Checked when the panel opens,
// when the active tab changes or reloads, when the panel comes back into
// view, and on "Check again".
// Used once, by App, so switching screens doesn't start it over.
export function useSiteBlocked(): { blocked: boolean; checking: boolean; check: () => void } {
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const running = useRef(false);

  // The answer, one check at a time: true when the site blocks extensions,
  // null when it couldn't be told (a check already running, the panel closing).
  const isBlocked = useCallback(async (): Promise<boolean | null> => {
    if (running.current) return null;
    running.current = true;
    try {
      const status = await contentScriptStatus(await activeTab());
      if (status === "blocked") reportClientError(PLATFORM === "x" ? "x_replies" : "comments", "site_blocked");
      return status === "blocked";
    } catch {
      return null;
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      const result = await isBlocked();
      if (!cancelled && result !== null) setBlocked(result);
    }
    void refresh();
    const stop = onActiveTabChange(() => void refresh());
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [isBlocked]);

  // "Check again": the same, with the button's spinner.
  const check = useCallback(async () => {
    setChecking(true);
    const result = await isBlocked();
    if (result !== null) setBlocked(result);
    setChecking(false);
  }, [isBlocked]);

  return { blocked, checking, check: () => void check() };
}

// Shown at the top of the panel while the browser blocks extensions on the
// site: nothing the extension does can reach the page then (Comment clicks
// go nowhere), and only the person can undo it, in the browser's own menu.
export function SiteBlockedNotice({ checking, onCheck }: { checking: boolean; onCheck: () => void }) {
  const browser = browserName();
  return (
    <section
      aria-labelledby="site-blocked-title"
      className="animate-fade-in-up rounded-lg border border-destructive/40 bg-card p-3 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive-soft text-destructive">
          <ShieldOff aria-hidden className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h2 id="site-blocked-title" className="text-sm font-semibold">
            {browser} is blocking extensions on {SITE_NAME}
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            It&apos;s a browser setting, so clicks on {SITE_NAME} can&apos;t reach CarouseLabs. To allow it:
          </p>
          <ol className="list-decimal space-y-0.5 pl-4 text-xs leading-relaxed text-muted-foreground">
            <li>
              On {SITE_NAME}, click the <span className="font-medium text-foreground">Extensions</span> icon (
              {extensionsIconLooks(browser)}) next to the address bar.
            </li>
            <li>
              Turn on <span className="font-medium text-foreground">Allow extensions on {SITE_HOST}</span>.
            </li>
            <li>Reload the {SITE_NAME} page.</li>
          </ol>
        </div>
      </div>
      <div className="mt-3">
        <Button size="sm" variant="outline" loading={checking} onClick={onCheck}>
          {!checking && <RotateCcw aria-hidden />}
          Check again
        </Button>
      </div>
    </section>
  );
}
