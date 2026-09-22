import { useEffect, useRef, useState } from "react";
import { InsertWarningModal } from "../InsertWarningModal";
import { RecommendedBadge } from "../RecommendedBadge";
import {
  apiFetch,
  ApiError,
  fetchExtConfig,
  BILLING_URL,
  LINKEDIN_FEED_URL,
  DAILY_NUDGE_THRESHOLD,
  type CommentProfile,
  type GenerateResponse,
  type MeResponse,
  type RewriteResponse,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Sentinel option in the profile dropdown. Selecting it does not change the
// selection — it hands off to the Profile Builder on the Profiles screen,
// through the same App-level deep link onboarding uses.
const CREATE_CUSTOM_VALUE = "__create_custom__";

// Must match MESSAGE_TYPE in src/content-script.ts exactly — no shared
// package between the content script and sidepanel bundles' message
// contract beyond this literal (same reasoning as MESSAGE_TYPE in
// src/background.ts / src/content/authRelay.ts).
const POST_SELECTED_MESSAGE_TYPE = "carouselabs:post-selected";

// Must likewise match LAST_POST_STORAGE_KEY in src/content-script.ts.
const LAST_POST_STORAGE_KEY = "lastSelectedPost";

// Must match INSERT_MESSAGE_TYPE in src/content-script.ts exactly.
const INSERT_MESSAGE_TYPE = "carouselabs:insert-comment";

// Per-install UI preference, so it lives in chrome.storage rather than on the
// User row. Unlike insertWarningHidden — which records that a risk was
// acknowledged and therefore belongs to the account — this is only about
// whether one browser shows a button.
const SHOW_INSERT_STORAGE_KEY = "showInsertButton";

// Must match GENERATE_SHORTCUT_MESSAGE_TYPE in src/background.ts. Relayed from
// the service worker, which is where the keyboard command actually fires.
const GENERATE_SHORTCUT_MESSAGE_TYPE = "carouselabs:shortcut-generate";

// Shape sent by src/content-script.ts — keep in sync with its SelectedPost.
interface SelectedPost {
  authorName: string;
  authorHeadline: string;
  text: string;
  type: "text" | "image" | "article" | "poll" | "repost";
  url: string;
  capturedAt: number;
}

type LoadState = "loading" | "ready" | "error";

// 4xx messages are written for the user and say something actionable ("out of
// credits", "no post text was captured"). Replacing them with generic copy was
// hiding the only clue the panel had. 5xx stays generic: those messages
// describe server internals and are not the user's problem to read.
function userFacingError(err: unknown): string {
  if (err instanceof ApiError && err.status >= 400 && err.status < 500) return err.message;
  return "Something went wrong, try again";
}

interface Props {
  // Opens the Profile Builder on the Profiles screen. Owned by App, since
  // switching screens is App's job and HomeScreen cannot navigate itself.
  onCreateProfile: () => void;
}

export function HomeScreen({ onCreateProfile }: Props) {
  const [profiles, setProfiles] = useState<CommentProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Populated by src/content-script.ts via chrome.runtime.sendMessage when
  // the user clicks Comment on a LinkedIn post. The output is reset here too,
  // so a NEW post arriving mid-session clears stale comment text rather than
  // leaving it attached to the wrong post.
  const [selectedPost, setSelectedPost] = useState<SelectedPost | null>(null);
  const [extraInstruction, setExtraInstruction] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // The output box is editable, so this holds whatever is currently in it,
  // including the user's own edits. Every action below (Copy, Shorter, Longer)
  // operates on this value rather than on the last thing the model returned.
  const [comment, setComment] = useState("");
  // Row created by the last successful generate, so Copy can mark it COPIED.
  // Cleared on a new post: copying then would tag the wrong row.
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [rewriting, setRewriting] = useState<"shorter" | "longer" | null>(null);
  const [copied, setCopied] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  // Insert gating: the server kill switch, the per-install preference, and the
  // per-account "warning already acknowledged" flag are three separate things.
  const [insertEnabled, setInsertEnabled] = useState(false);
  const [showInsertPref, setShowInsertPref] = useState(true);
  const [insertWarningHidden, setInsertWarningHidden] = useState(false);
  const [showInsertWarning, setShowInsertWarning] = useState(false);
  const [inserting, setInserting] = useState(false);

  // null while unknown. Chrome reveals tab.url only for hosts the extension
  // has permission for, so a readable linkedin.com URL is itself the signal —
  // no "tabs" permission needed.
  const [onLinkedIn, setOnLinkedIn] = useState<boolean | null>(null);
  const [commentsToday, setCommentsToday] = useState(0);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  // Lets the mount-once message listener reach the current handleGenerate
  // without listing it as an effect dependency, which would tear down and
  // re-add the post listeners on every render.
  const generateRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Deduped on capturedAt because the same post arrives twice by design:
    // once as a live message, once as a storage change. Without this the
    // second arrival would clear generatedComment a second time.
    let lastAppliedAt: number | null = null;

    function applyPost(post: SelectedPost) {
      if (cancelled) return;
      if (lastAppliedAt === post.capturedAt) return;
      lastAppliedAt = post.capturedAt;

      // Replace the preview entirely and clear the output — but the Comment
      // Profile selection above is untouched.
      setSelectedPost(post);
      setComment("");
      setHistoryId(null);
      setCopied(false);
      setGenerateError(null);
    }

    // Instant path — only lands if the panel is open AND this screen is
    // mounted at the moment of the click.
    function handleMessage(message: unknown) {
      if (!message || typeof message !== "object") return;
      const { type, post } = message as { type?: string; post?: SelectedPost };

      // The keyboard shortcut arrives on the same channel. Routed through a
      // ref so this listener does not need re-registering whenever the
      // generate handler's dependencies change.
      if (type === GENERATE_SHORTCUT_MESSAGE_TYPE) {
        generateRef.current?.();
        return;
      }

      if (type !== POST_SELECTED_MESSAGE_TYPE || !post) return;
      applyPost(post);
    }

    // Reliable path — fires in every extension context, and the value is
    // still there if the panel was closed when the click happened.
    function handleStorageChange(
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string,
    ) {
      if (areaName !== "local" || !(LAST_POST_STORAGE_KEY in changes)) return;
      const post = changes[LAST_POST_STORAGE_KEY].newValue as SelectedPost | undefined;
      if (post) applyPost(post);
    }

    chrome.runtime.onMessage.addListener(handleMessage);
    chrome.storage.onChanged.addListener(handleStorageChange);

    // Covers the panel being opened (or this screen navigated back to)
    // after the Comment click already happened.
    chrome.storage.local.get(LAST_POST_STORAGE_KEY).then((stored) => {
      const post = stored[LAST_POST_STORAGE_KEY] as SelectedPost | undefined;
      if (post) applyPost(post);
    });

    return () => {
      cancelled = true;
      chrome.runtime.onMessage.removeListener(handleMessage);
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [{ profiles: fetchedProfiles }, me] = await Promise.all([
          apiFetch<{ profiles: CommentProfile[] }>("/api/ext/profiles"),
          apiFetch<MeResponse>("/api/ext/me"),
        ]);
        if (cancelled) return;

        setProfiles(fetchedProfiles);

        const systemDefault = fetchedProfiles.find((p) => p.isSystem && p.isDefault);
        const preselected =
          fetchedProfiles.find((p) => p.id === me.defaultCommentProfileId) ??
          systemDefault ??
          fetchedProfiles[0];

        setSelectedId(preselected?.id ?? "");
        setCredits(me.creditsAvailable);
        setCommentsToday(me.commentsToday);
        setInsertWarningHidden(me.insertWarningHidden);
        setState("ready");
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(err instanceof ApiError ? err.message : "Failed to load profiles");
        setState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Three groups in the order the route already returns them: recommended
  // presets, the original system profiles, then the user's own.
  const recommendedProfiles = profiles.filter((p) => p.isRecommended);
  const systemProfiles = profiles.filter((p) => p.isSystem && !p.isRecommended);
  const customProfiles = profiles.filter((p) => !p.isSystem);

  function handleValueChange(value: string) {
    // Not a real selection: leave selectedId alone so the previously chosen
    // profile stays active if the user backs out of the builder.
    if (value === CREATE_CUSTOM_VALUE) {
      onCreateProfile();
      return;
    }
    setSelectedId(value);
  }

  // Button-state table. "Logged out" is not checked here: App.tsx renders
  // SignInScreen instead of this component when there is no token, so an
  // unauthenticated user never reaches these controls.
  const busy = generating || rewriting !== null;
  const hasComment = comment.trim().length > 0;
  // credits is null only while /api/ext/me is still in flight; treating that
  // as "out" would disable Generate during every panel open.
  const outOfCredits = credits !== null && credits <= 0;
  // A captured post with no body text cannot be commented on, and the route
  // rejects it with a 400. Blocking it here turns a failed round trip into an
  // explained disabled button.
  const postHasNoText = !!selectedPost && !selectedPost.text.trim();
  const generateDisabled =
    !selectedPost || !selectedId || outOfCredits || postHasNoText || busy;
  // Copy / Shorter / Longer all need a comment to act on.
  const actionsDisabled = !hasComment || busy;

  // The server kill switch and the per-install preference are read separately
  // from the account data above, since the config route is public and the
  // preference never leaves this browser.
  useEffect(() => {
    let cancelled = false;

    fetchExtConfig()
      .then((config) => {
        if (!cancelled) setInsertEnabled(config.insertEnabled);
      })
      // A config fetch failure leaves Insert hidden. Failing closed is right
      // for a feature whose own warning says it carries account risk.
      .catch(() => {});

    chrome.storage.local.get(SHOW_INSERT_STORAGE_KEY).then((stored) => {
      const value = stored[SHOW_INSERT_STORAGE_KEY];
      if (!cancelled && typeof value === "boolean") setShowInsertPref(value);
    });

    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (!cancelled) setOnLinkedIn(!!tab?.url?.includes("linkedin.com"));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Regenerate is the same call as Generate: same post, same profile, same
  // cost. The only difference is that it replaces existing output.
  async function handleGenerate() {
    if (!selectedPost || !selectedId) return;

    setGenerating(true);
    setGenerateError(null);
    setComment("");
    setHistoryId(null);
    setCopied(false);

    try {
      const res = await apiFetch<GenerateResponse>("/api/ext/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: selectedId,
          post: {
            author: selectedPost.authorName,
            headline: selectedPost.authorHeadline,
            text: selectedPost.text,
            type: selectedPost.type,
            url: selectedPost.url,
          },
          extraInstruction: extraInstruction.trim() || undefined,
        }),
      });

      setComment(res.comment);
      setHistoryId(res.historyId);
      setCredits(res.creditsRemaining);
    } catch (err) {
      setGenerateError(userFacingError(err));
    } finally {
      setGenerating(false);
    }
  }

  // Kept current every render so the keyboard shortcut always invokes the
  // latest closure rather than one captured at mount.
  generateRef.current = () => {
    if (!generateDisabled) void handleGenerate();
  };

  async function handleRewrite(direction: "shorter" | "longer") {
    if (!comment.trim()) return;

    setRewriting(direction);
    setGenerateError(null);
    setCopied(false);

    try {
      // Sends the CURRENT box contents, so a hand-edit is what gets resized.
      // historyId rides along so the route can keep the stored history text in
      // step with the rewritten version the user will actually copy.
      const res = await apiFetch<RewriteResponse>("/api/ext/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentComment: comment, direction, historyId }),
      });

      setComment(res.comment);
    } catch (err) {
      setGenerateError(userFacingError(err));
    } finally {
      setRewriting(null);
    }
  }

  // Records what the user did with the generated comment. Best effort, same
  // as Copy: the action already happened, so a failed write must not surface.
  function markHistory(action: "COPIED" | "INSERTED") {
    if (!historyId) return;
    apiFetch(`/api/ext/history/${historyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, comment }),
    }).catch(() => {});
  }

  // Entry point for the Insert button. The warning is shown unless this user
  // has already acknowledged it; it is never skipped silently on first use.
  function handleInsertClick() {
    if (!comment.trim()) return;
    if (insertWarningHidden) {
      void performInsert();
      return;
    }
    setShowInsertWarning(true);
  }

  async function performInsert() {
    setInserting(true);
    setGenerateError(null);

    try {
      // tabs.query returns the tab id without needing the "tabs" permission;
      // only sensitive fields like url are withheld. Messaging the tab itself
      // is covered by the linkedin.com host permission.
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id === undefined) throw new Error("no active tab");

      const res = (await chrome.tabs.sendMessage(tab.id, {
        type: INSERT_MESSAGE_TYPE,
        text: comment,
      })) as { ok: boolean; error?: string } | undefined;

      if (!res?.ok) {
        setGenerateError(res?.error ?? "Couldn't insert into LinkedIn. Try Copy instead.");
        return;
      }

      markHistory("INSERTED");
    } catch {
      // Most often the active tab has no content script, i.e. it is not a
      // LinkedIn page.
      setGenerateError("Open the LinkedIn post in the active tab, then try again.");
    } finally {
      setInserting(false);
    }
  }

  async function handleConfirmInsert(dontShowAgain: boolean) {
    setShowInsertWarning(false);

    if (dontShowAgain) {
      setInsertWarningHidden(true);
      // Persisted per account, not per install: the risk being acknowledged
      // is to their LinkedIn account. Best effort, so a failed write only
      // means they see the warning again.
      apiFetch("/api/ext/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insertWarningHidden: true }),
      }).catch(() => {});
    }

    await performInsert();
  }

  async function handleCopy() {
    if (!comment.trim()) return;

    try {
      await navigator.clipboard.writeText(comment);
    } catch {
      setGenerateError("Couldn't copy to clipboard");
      return;
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    // The comment text rides along because the box is editable: what the user
    // just put on their clipboard may be a hand-edit of what was generated,
    // and the row should record what they actually took.
    markHistory("COPIED");
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {showInsertWarning && (
        <InsertWarningModal
          onCopyInstead={() => {
            setShowInsertWarning(false);
            void handleCopy();
          }}
          onInsertAnyway={handleConfirmInsert}
          onDismiss={() => setShowInsertWarning(false)}
        />
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Comment Profile</label>

        {state === "loading" && (
          <div className="text-sm text-muted-foreground">Loading profiles…</div>
        )}

        {state === "error" && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
            {errorMessage}
          </div>
        )}

        {state === "ready" && (
          <Select value={selectedId} onValueChange={handleValueChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a profile" />
            </SelectTrigger>
            <SelectContent>
              {recommendedProfiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.name}
                  <RecommendedBadge />
                </SelectItem>
              ))}

              {recommendedProfiles.length > 0 && systemProfiles.length > 0 && <SelectSeparator />}

              {systemProfiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.name}
                  {profile.isDefault ? " (default)" : ""}
                </SelectItem>
              ))}

              {customProfiles.length > 0 && (
                <>
                  <SelectSeparator />
                  {customProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </>
              )}

              <SelectSeparator />
              <SelectItem value={CREATE_CUSTOM_VALUE} className="font-medium text-primary">
                + Create custom profile
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Pacing nudge. Advisory only: it never blocks generating, because the
          judgement of what looks like automation is the user's to make. */}
      {commentsToday >= DAILY_NUDGE_THRESHOLD && !nudgeDismissed && (
        <div className="flex items-start gap-2 rounded-md border border-input bg-muted/50 p-2">
          <p className="flex-1 text-xs text-muted-foreground">
            Slow down: lots of comments in a short time can look like automation.
          </p>
          <button
            onClick={() => setNudgeDismissed(true)}
            aria-label="Dismiss"
            className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>
      )}

      {/* Nothing below this is reachable on a non-LinkedIn tab, so it replaces
          the whole flow rather than sitting alongside it. */}
      {onLinkedIn === false && (
        <div className="space-y-2 rounded-md border border-dashed border-input p-3">
          <p className="text-xs text-muted-foreground">Open LinkedIn to start commenting.</p>
          <Button size="sm" onClick={() => chrome.tabs.create({ url: LINKEDIN_FEED_URL })}>
            Open LinkedIn
          </Button>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Selected post</label>

        {selectedPost ? (
          <div className="space-y-1 rounded-md border border-input bg-background p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{selectedPost.authorName || "Unknown author"}</span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                {selectedPost.type}
              </span>
            </div>
            {selectedPost.authorHeadline && (
              <div className="text-xs text-muted-foreground">{selectedPost.authorHeadline}</div>
            )}
            <p className="line-clamp-2 text-sm text-foreground/90">{selectedPost.text}</p>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-input p-3 text-xs text-muted-foreground">
            Click Comment on any LinkedIn post to start
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Extra instruction <span className="font-normal">(optional)</span>
        </label>
        <textarea
          value={extraInstruction}
          onChange={(e) => setExtraInstruction(e.target.value)}
          disabled={!selectedPost || generating}
          rows={2}
          placeholder="e.g. mention my own experience with this"
          className="w-full resize-none rounded-md border border-input bg-background p-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        />
      </div>

      {/* Out of credits replaces Generate entirely rather than disabling it:
          a disabled button with a note underneath gives the user nothing to
          act on, and topping up is the only thing that helps. */}
      {outOfCredits ? (
        <>
          <Button onClick={() => chrome.tabs.create({ url: BILLING_URL })}>Top up credits</Button>
          <p className="text-xs text-muted-foreground">
            You're out of credits. Top up to keep generating comments.
          </p>
        </>
      ) : (
        <Button disabled={generateDisabled} onClick={handleGenerate}>
          {generating ? "Generating…" : comment ? "Regenerate" : "Generate"}
        </Button>
      )}

      {postHasNoText && !outOfCredits && (
        <p className="text-xs text-muted-foreground">
          Couldn't read this post. Try opening it in its own page.
        </p>
      )}

      {generateError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
          {generateError}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Comment</label>
        <textarea
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            setCopied(false);
          }}
          disabled={!hasComment || busy}
          rows={6}
          placeholder="Your generated comment appears here, and can be edited before copying."
          className="w-full resize-y rounded-md border border-input bg-background p-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" disabled={actionsDisabled} onClick={handleCopy}>
          {copied ? "Copied" : "Copy"}
        </Button>
        {/* Hidden entirely when the server kill switch is off, regardless of
            the per-install preference. */}
        {insertEnabled && showInsertPref && (
          <Button size="sm" variant="outline" disabled={actionsDisabled} onClick={handleInsertClick}>
            {inserting ? "Inserting…" : "Insert"}
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={actionsDisabled}
          onClick={() => handleRewrite("shorter")}
        >
          {rewriting === "shorter" ? "Shortening…" : "Shorter"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={actionsDisabled}
          onClick={() => handleRewrite("longer")}
        >
          {rewriting === "longer" ? "Lengthening…" : "Longer"}
        </Button>
      </div>
    </div>
  );
}
