import { ExternalLink, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE_NAME, SITE_ORIGIN } from "@/lib/platform";

// Switches to the site: the most recently used tab on it in this window, or a
// new one at `homeUrl` when there is none.
export async function goToSite(homeUrl: string): Promise<void> {
  const tabs = await chrome.tabs.query({ url: `${SITE_ORIGIN}*`, currentWindow: true });
  const latest = tabs.sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0];
  if (latest?.id !== undefined) await chrome.tabs.update(latest.id, { active: true });
  else await chrome.tabs.create({ url: homeUrl });
}

// Shown on Home while the active tab is on another site: writing (and
// Insert) happen on the site itself, so the panel points back to it instead
// of offering to write. What was already written stays for Copy.
export function GoToSiteCard({ body, homeUrl }: { body: string; homeUrl: string }) {
  return (
    <div
      role="status"
      className="flex animate-fade-in flex-col items-center gap-3 rounded-lg border border-dashed border-input px-4 py-5 text-center"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <MousePointerClick aria-hidden className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">You&apos;re not on {SITE_NAME}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
      </div>
      <Button size="sm" onClick={() => void goToSite(homeUrl)}>
        Go to {SITE_NAME}
        <ExternalLink aria-hidden />
      </Button>
    </div>
  );
}
