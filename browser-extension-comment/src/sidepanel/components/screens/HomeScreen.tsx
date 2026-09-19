import { useEffect, useState } from "react";
import { InsertWarningModal } from "../InsertWarningModal";
import {
  apiFetch,
  ApiError,
  fetchExtConfig,
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

// Selecting this value is a no-op stub for now — real "create custom
// profile" flow is wired up in Part 8.
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

export function HomeScreen() {
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

  const systemProfiles = profiles.filter((p) => p.isSystem);
  const customProfiles = profiles.filter((p) => !p.isSystem);

  function handleValueChange(value: string) {
    if (value === CREATE_CUSTOM_VALUE) return;
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
  const generateDisabled = !selectedPost || !selectedId || outOfCredits || busy;
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
      // Out-of-credits is the one failure worth naming, since retrying won't
      // fix it. Everything else gets the generic copy from the UX spec.
      const outOfCredits = err instanceof ApiError && err.status === 402;
      setGenerateError(outOfCredits ? err.message : "Something went wrong, try again");
    } finally {
      setGenerating(false);
    }
  }

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
      const rateLimited = err instanceof ApiError && err.status === 429;
      setGenerateError(rateLimited ? err.message : "Something went wrong, try again");
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

      <Button disabled={generateDisabled} onClick={handleGenerate}>
        {generating ? "Generating…" : comment ? "Regenerate" : "Generate"}
      </Button>

      {outOfCredits && (
        <p className="text-xs text-muted-foreground">
          You're out of credits, so Generate is unavailable.
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
