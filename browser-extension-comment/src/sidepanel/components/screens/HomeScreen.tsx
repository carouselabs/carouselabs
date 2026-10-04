import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ExternalLink, Minus, MousePointerClick, Plus, RotateCcw, Sparkles, Timer, X } from "lucide-react";
import { InsertWarningModal } from "../InsertWarningModal";
import { ensureContentScript, noContentScriptMessage, sendToTab } from "@/lib/tabs";
import { markHistoryAction } from "@/lib/history";
import { loadCachedCommentProfiles, saveCachedCommentProfiles } from "@/lib/profileCache";
import { loadShowInsert } from "@/lib/syncedSettings";
import { ConnectionNotePanel } from "../ConnectionNotePanel";
import { RecommendedBadge } from "../RecommendedBadge";
import { FreeGenerationsNote, UnlockCard } from "../UnlockCard";
import {
  isPaywalled,
  noteFreeRemaining,
  notePaywallError,
  setExtensionAccess,
  useExtensionAccess,
} from "@/lib/extensionAccess";
import { generationPerf } from "@/lib/generationPerf";
import {
  apiFetch,
  apiStream,
  ApiError,
  fetchExtConfig,
  LINKEDIN_FEED_URL,
  DAILY_NUDGE_THRESHOLD,
  type CommentProfile,
  type GenerateResponse,
  type MeResponse,
  type RewriteResponse,
} from "@/lib/api";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingField } from "@/components/ui/loading-field";
import { Textarea } from "@/components/ui/textarea";
import { Initials } from "../Initials";
import { ResultCard } from "../ResultCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LinkedInProfileInfo } from "@/lib/connectionNote";

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


// Must match GENERATE_SHORTCUT_MESSAGE_TYPE in src/background.ts. Relayed from
// the service worker, which is where the keyboard command actually fires.
const GENERATE_SHORTCUT_MESSAGE_TYPE = "carouselabs:shortcut-generate";

// Shapes sent by src/content-script.ts — keep in sync with its SelectedPost,
// ReplySelection and ReplyThreadEntry.
interface ReplyThreadEntry {
  author: string;
  text: string;
  depth: number;
  isTarget: boolean;
  isSelf: boolean;
  isPostAuthor: boolean;
}

interface ReplySelection {
  targetAuthor: string;
  targetText: string;
  thread: ReplyThreadEntry[];
  isOwnPost: boolean | null;
}

interface SelectedPost {
  // Optional: a selection stored by an older build has no mode, and was always
  // a comment.
  mode?: "comment" | "reply" | "connect";
  authorName: string;
  authorHeadline: string;
  text: string;
  type: "text" | "image" | "article" | "poll" | "repost";
  url: string;
  capturedAt: number;
  reply?: ReplySelection;
  // Connection Note mode: the person whose Connect button was clicked.
  connect?: { target: LinkedInProfileInfo };
}

type InsertMode = "comment" | "reply" | "connect";

// Plain text posts are the norm, so only the other kinds get a label.
const POST_TYPE_LABEL: Record<SelectedPost["type"], string | null> = {
  text: null,
  image: "Image",
  article: "Article",
  poll: "Poll",
  repost: "Repost",
};

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
  // Opens the builder for that kind of profile on the Profiles screen. Owned
  // by App, since switching screens is App's job and HomeScreen cannot
  // navigate itself.
  onCreateProfile: (kind: "comment" | "connection") => void;
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
  // Whether the result card is showing. Separate from `comment` so that
  // clearing the box by hand keeps the card (and the box being typed in) on
  // screen; only a new post or a failed generation takes it away.
  const [hasResult, setHasResult] = useState(false);
  // True while a just-arrived comment is being typed into the box word by
  // word (see revealComment below) rather than dropped in all at once. Rolled
  // into `busy` further down so Copy/Insert/Rewrite and hand-editing are all
  // blocked until the full text has actually landed in `comment`.
  const [revealing, setRevealing] = useState(false);
  const revealCancelRef = useRef<(() => void) | null>(null);
  // Generate streams the comment in as the model writes it. Text arrives a
  // word or two at a time, so the box is repainted at most once per frame,
  // always with the newest text.
  const pendingTextRef = useRef<string | null>(null);
  const textFrameRef = useRef<number | null>(null);
  const perfRef = useRef<ReturnType<typeof generationPerf> | null>(null);
  // The output can land below the fold once profile pickers/instructions have
  // pushed the page tall — scrolled into view automatically so a fresh
  // result is never hidden behind a scroll the user has to find themselves.
  const outputRef = useRef<HTMLElement>(null);
  // Row created by the last successful generate, so Copy can mark it COPIED.
  // Cleared on a new post: copying then would tag the wrong row.
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [rewriting, setRewriting] = useState<"shorter" | "longer" | null>(null);
  const [copied, setCopied] = useState(false);
  const access = useExtensionAccess();

  // Insert gating: the server kill switch, the per-install preference, and the
  // per-account "warning already acknowledged" flag are three separate things.
  const [insertEnabled, setInsertEnabled] = useState(false);
  const [showInsertPref, setShowInsertPref] = useState(true);
  const [insertWarningHidden, setInsertWarningHidden] = useState(false);
  const [showInsertWarning, setShowInsertWarning] = useState(false);
  const [inserting, setInserting] = useState(false);
  // What the Insert warning is about to insert, so the same modal serves the
  // comment flow and Connection Note mode.
  // historyId is only set for a connection note, whose row the note panel
  // owns; comments and replies use this screen's own historyId.
  const [pendingInsert, setPendingInsert] = useState<{
    text: string;
    mode: InsertMode;
    historyId?: string | null;
  } | null>(null);
  // Insert failures in Connection Note mode, shown inside that panel.
  const [connectInsertError, setConnectInsertError] = useState<string | null>(null);

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
      setHasResult(false);
      setHistoryId(null);
      setCopied(false);
      setGenerateError(null);
      setConnectInsertError(null);
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

  // Set once the user picks a profile, so the server's list arriving after the
  // cached one was shown doesn't switch their pick back to the default.
  const userPickedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const preselect = (list: CommentProfile[], defaultId: string | null) =>
      (
        list.find((p) => p.id === defaultId) ??
        list.find((p) => p.isSystem && p.isDefault) ??
        list[0]
      )?.id ?? "";

    // The list the server sent last time, shown at once so the panel, and
    // Generate, doesn't wait on the network on every open. The server's answer
    // below replaces it; functional updates keep this from overwriting that
    // answer if it somehow came first.
    void loadCachedCommentProfiles().then((cached) => {
      if (cancelled || !cached || cached.profiles.length === 0) return;
      setProfiles((current) => (current.length > 0 ? current : cached.profiles));
      setSelectedId((current) => current || preselect(cached.profiles, cached.defaultProfileId));
      setState((current) => (current === "loading" ? "ready" : current));
    });

    async function load() {
      try {
        const [{ profiles: fetchedProfiles }, me] = await Promise.all([
          apiFetch<{ profiles: CommentProfile[] }>("/api/ext/profiles"),
          apiFetch<MeResponse>("/api/ext/me"),
        ]);
        if (cancelled) return;

        setProfiles(fetchedProfiles);
        const preselected = preselect(fetchedProfiles, me.defaultCommentProfileId);
        setSelectedId((current) =>
          userPickedRef.current && fetchedProfiles.some((p) => p.id === current) ? current : preselected,
        );
        setExtensionAccess(me.extension);
        setCommentsToday(me.commentsToday);
        setInsertWarningHidden(me.insertWarningHidden);
        setState("ready");
        void saveCachedCommentProfiles({ profiles: fetchedProfiles, defaultProfileId: me.defaultCommentProfileId });
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(err instanceof ApiError ? err.message : "Failed to load profiles");
        // A cached list already showing stays usable; a generation that
        // really can't reach the server says so itself.
        setState((current) => (current === "ready" ? current : "error"));
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
      onCreateProfile("comment");
      return;
    }
    userPickedRef.current = true;
    setSelectedId(value);
  }

  // Button-state table. "Logged out" is not checked here: App.tsx renders
  // SignInScreen instead of this component when there is no token, so an
  // unauthenticated user never reaches these controls.
  const busy = generating || rewriting !== null || revealing;
  const hasComment = comment.trim().length > 0;
  // True only once the free generations are known to be used up without a
  // subscription. Never while /api/ext/me is still in flight, nor while the
  // server reports the paywall off for testing (lib/commentCredits.ts).
  const paywalled = isPaywalled(access);
  // A captured post with no body text cannot be commented on, and the route
  // rejects it with a 400. Blocking it here turns a failed round trip into an
  // explained disabled button.
  //
  // In reply mode the comment being answered is what must have text; the post
  // itself may be image-only.
  const reply = selectedPost?.mode === "reply" ? (selectedPost.reply ?? null) : null;
  const postHasNoText =
    !!selectedPost && (reply ? !reply.targetText.trim() : !selectedPost.text.trim());
  const generateDisabled =
    !selectedPost || !selectedId || paywalled || postHasNoText || busy;
  // Copy / Shorter / Longer all need a comment to act on. Shorter / Longer
  // are model calls too, so the paywall stops them; Copy and Insert never.
  const actionsDisabled = !hasComment || busy;
  const rewriteDisabled = actionsDisabled || paywalled;

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

    // Whether the Insert button shows is an account setting (the website can
    // change it too): see src/lib/syncedSettings.ts.
    loadShowInsert().then((show) => {
      if (!cancelled) setShowInsertPref(show);
    });

    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (!cancelled) setOnLinkedIn(!!tab?.url?.includes("linkedin.com"));
      // A LinkedIn tab left over from before an update has no working content
      // script, so a Comment click in it would never reach this panel. Put one
      // in now, before the user clicks.
      void ensureContentScript(tab);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Cancel any in-flight reveal or queued streamed text when the screen
  // itself unmounts, so neither calls setState after the component is gone.
  useEffect(() => {
    return () => {
      revealCancelRef.current?.();
      cancelQueuedText();
    };
  }, []);

  // When streamed text first reaches the DOM — "first visible text" in the
  // [perf] line (src/lib/generationPerf.ts).
  useLayoutEffect(() => {
    if (generating && comment) perfRef.current?.mark("shown");
  }, [generating, comment]);

  function queueStreamedText(text: string) {
    pendingTextRef.current = text;
    if (textFrameRef.current !== null) return;
    textFrameRef.current = requestAnimationFrame(() => {
      textFrameRef.current = null;
      const next = pendingTextRef.current;
      pendingTextRef.current = null;
      if (next !== null) setComment(next);
    });
  }

  function cancelQueuedText() {
    if (textFrameRef.current !== null) cancelAnimationFrame(textFrameRef.current);
    textFrameRef.current = null;
    pendingTextRef.current = null;
  }

  // Shorter/Longer only (Generate streams real text as it's written): types
  // `text` into the comment box a couple of words at a time instead of
  // dropping the whole thing in at once. The rewrite is already complete when
  // this runs, so it adds no real wait. ~12ms per 2-word chunk clears even a
  // long comment in well under a second. Cancellable so a newer result always
  // wins over a stale one still typing.
  function revealComment(text: string) {
    revealCancelRef.current?.();

    if (!text) {
      setComment("");
      setRevealing(false);
      return;
    }

    const words = text.match(/\S+\s*/g) ?? [text];
    let index = 0;
    let cancelled = false;
    revealCancelRef.current = () => {
      cancelled = true;
    };

    setComment("");
    setRevealing(true);

    function tick() {
      if (cancelled) return;
      index = Math.min(index + 2, words.length);
      setComment(words.slice(0, index).join(""));
      if (index >= words.length) {
        setRevealing(false);
        revealCancelRef.current = null;
        return;
      }
      window.setTimeout(tick, 12);
    }
    tick();
  }

  // Regenerate is the same call as Generate: same post, same profile, same
  // cost. The only difference is that it replaces existing output.
  async function handleGenerate() {
    if (!selectedPost || !selectedId) return;

    const perf = generationPerf();
    perfRef.current = perf;
    revealCancelRef.current?.();
    cancelQueuedText();
    setGenerating(true);
    setGenerateError(null);
    setComment("");
    setHistoryId(null);
    setCopied(false);

    // Streamed text is a draft: the box stays read-only and Copy/Insert stay
    // off (`busy`) until the final event, whose comment has passed every
    // guardrail and replaces the draft. The result card shows from the click
    // on (`generating`), with a skeleton until the first words arrive.
    let scrolled = false;
    const handlers = {
      onRequest: () => perf.mark("request"),
      onStart: () => perf.mark("start"),
      onText: (text: string) => {
        if (text) perf.mark("firstText");
        queueStreamedText(text);
        if (text && !scrolled) {
          scrolled = true;
          outputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      },
      // A discarded draft: back to the thinking dots until the next one.
      onRetry: () => queueStreamedText(""),
    };

    try {
      const res = await apiStream<GenerateResponse>("/api/ext/generate", {
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
          // Present only in reply mode; its presence is what switches the
          // route to the reply prompt.
          reply: reply ? { thread: reply.thread, isOwnPost: reply.isOwnPost } : undefined,
        }),
      }, handlers);

      cancelQueuedText();
      setComment(res.comment);
      setHasResult(true);
      perf.mark("final");
      setHistoryId(res.historyId);
      noteFreeRemaining(res.freeRemaining);
      if (!scrolled) outputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      perf.report(res.timing);
    } catch (err) {
      cancelQueuedText();
      setComment("");
      setHasResult(false);
      // The paywall's 402 swaps in the unlock card, which says it better.
      if (!notePaywallError(err)) setGenerateError(userFacingError(err));
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

      revealComment(res.comment);
      noteFreeRemaining(res.freeRemaining);
    } catch (err) {
      if (!notePaywallError(err)) setGenerateError(userFacingError(err));
    } finally {
      setRewriting(null);
    }
  }

  // Records what the user did with the generated comment. Best effort, same
  // as Copy: the action already happened, so a failed write must not surface.
  function markHistory(action: "COPIED" | "INSERTED") {
    markHistoryAction(historyId, action, comment);
  }

  // Entry point for the Insert button. The warning is shown unless this user
  // has already acknowledged it; it is never skipped silently on first use.
  function handleInsertClick() {
    if (!comment.trim()) return;
    requestInsert(comment, reply ? "reply" : "comment");
  }

  function requestInsert(text: string, mode: InsertMode, noteHistoryId?: string | null) {
    if (insertWarningHidden) {
      void performInsert(text, mode, noteHistoryId);
      return;
    }
    setPendingInsert({ text, mode, historyId: noteHistoryId });
    setShowInsertWarning(true);
  }

  async function performInsert(text: string, mode: InsertMode, noteHistoryId?: string | null) {
    const setError = mode === "connect" ? setConnectInsertError : setGenerateError;
    setInserting(true);
    setError(null);

    let tab: chrome.tabs.Tab | undefined;
    try {
      // tabs.query returns the tab id without needing the "tabs" permission;
      // only sensitive fields like url are withheld. Messaging the tab itself
      // is covered by the linkedin.com host permission.
      [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id === undefined) throw new Error("no active tab");

      const res = await sendToTab<{ ok: boolean; error?: string } | undefined>(tab, {
        type: INSERT_MESSAGE_TYPE,
        text,
        // Reply mode targets the captured comment's reply box, never the
        // post's main comment box; connect targets the invitation's note box.
        mode,
        // A note is only inserted on the profile it was written for.
        expect: mode === "connect" ? { profileUrl: selectedPost?.connect?.target.url ?? "" } : undefined,
      });

      if (!res?.ok) {
        setError(res?.error ?? "Couldn't insert into LinkedIn. Try Copy instead.");
        return;
      }

      if (mode === "connect") markHistoryAction(noteHistoryId, "INSERTED", text);
      else markHistory("INSERTED");
    } catch {
      // The active tab has no content script: not LinkedIn, or a LinkedIn
      // tab opened before the extension was updated.
      setError(
        noContentScriptMessage(
          tab,
          mode === "connect"
            ? "Open the LinkedIn profile in the active tab, then try again."
            : "Open the LinkedIn post in the active tab, then try again.",
        ),
      );
    } finally {
      setInserting(false);
    }
  }

  async function handleConfirmInsert(dontShowAgain: boolean) {
    setShowInsertWarning(false);
    const pending = pendingInsert;
    setPendingInsert(null);
    if (!pending) return;

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

    await performInsert(pending.text, pending.mode, pending.historyId);
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

  const insertWarningModal = showInsertWarning && (
    <InsertWarningModal
      onCopyInstead={() => {
        setShowInsertWarning(false);
        const pending = pendingInsert;
        setPendingInsert(null);
        // A connection note isn't in the comment box, so copy its own text.
        if (pending?.mode === "connect") void navigator.clipboard.writeText(pending.text).catch(() => {});
        else void handleCopy();
      }}
      onInsertAnyway={handleConfirmInsert}
      onDismiss={() => {
        setShowInsertWarning(false);
        setPendingInsert(null);
      }}
    />
  );

  // Connection Note mode replaces the whole comment flow: comment profiles,
  // post preview and Shorter/Longer don't apply to an invitation note.
  const connectTarget = selectedPost?.mode === "connect" ? (selectedPost.connect?.target ?? null) : null;
  if (connectTarget && selectedPost) {
    return (
      <div className="flex flex-col gap-4 p-4">
        {insertWarningModal}
        <ConnectionNotePanel
          key={selectedPost.capturedAt}
          target={connectTarget}
          paywalled={paywalled}
          showInsert={insertEnabled && showInsertPref}
          inserting={inserting}
          insertError={connectInsertError}
          onInsert={(text, noteHistoryId) => requestInsert(text, "connect", noteHistoryId)}
          onCreateProfile={() => onCreateProfile("connection")}
        />
      </div>
    );
  }

  const noun = reply ? "reply" : "comment";
  // The result card replaces the Generate button from the click on, so the
  // wait, the streaming text and the finished comment all happen in one place.
  const showResult = generating || hasResult;
  const showInsert = insertEnabled && showInsertPref;
  const postTypeLabel = selectedPost ? POST_TYPE_LABEL[selectedPost.type] : null;

  const errorBox = generateError && <Alert>{generateError}</Alert>;

  const resultCard = (
    <ResultCard
      sectionRef={outputRef}
      noun={noun}
      value={comment}
      onChange={(value) => {
        setComment(value);
        setCopied(false);
      }}
      generating={generating}
      busy={busy}
      meta={rewriting === "shorter" ? "Shortening…" : rewriting === "longer" ? "Lengthening…" : undefined}
      copied={copied}
      copyDisabled={actionsDisabled}
      onCopy={handleCopy}
      // Hidden entirely when the server kill switch is off, regardless of the
      // per-install preference.
      insert={showInsert ? { disabled: actionsDisabled, inserting, onClick: handleInsertClick } : null}
      tools={
        <>
          <Button
            size="sm"
            variant="ghost"
            className="px-2.5"
            disabled={rewriteDisabled}
            loading={rewriting === "shorter"}
            onClick={() => handleRewrite("shorter")}
          >
            {rewriting !== "shorter" && <Minus aria-hidden />}
            Shorter
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="px-2.5"
            disabled={rewriteDisabled}
            loading={rewriting === "longer"}
            onClick={() => handleRewrite("longer")}
          >
            {rewriting !== "longer" && <Plus aria-hidden />}
            Longer
          </Button>
        </>
      }
      onRegenerate={handleGenerate}
      regenerateDisabled={generateDisabled}
    />
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      {insertWarningModal}

      <div className="space-y-1.5">
        <label id="home-profile-label" className="text-xs font-medium text-muted-foreground">
          Comment profile
        </label>

        {state === "loading" && <LoadingField>Loading profiles…</LoadingField>}

        {state === "error" && <Alert>{errorMessage}</Alert>}

        {state === "ready" && (
          <Select value={selectedId} onValueChange={handleValueChange}>
            <SelectTrigger aria-labelledby="home-profile-label">
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
              <SelectItem value={CREATE_CUSTOM_VALUE} className="font-medium text-primary-text">
                + Create custom profile
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Pacing nudge. Advisory only: it never blocks generating, because the
          judgement of what looks like automation is the user's to make. */}
      {commentsToday >= DAILY_NUDGE_THRESHOLD && !nudgeDismissed && (
        <div role="note" className="flex animate-fade-in items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft p-3">
          <Timer aria-hidden className="mt-px h-4 w-4 shrink-0 text-warning" />
          <p className="flex-1 text-xs leading-relaxed text-foreground/80">
            Slow down: lots of comments in a short time can look like automation.
          </p>
          <button
            type="button"
            onClick={() => setNudgeDismissed(true)}
            aria-label="Dismiss"
            className="-m-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors duration-fast hover:bg-foreground/5 hover:text-foreground"
          >
            <X aria-hidden className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {selectedPost ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{reply ? "Replying to" : "Selected post"}</p>

          {reply ? (
            // Reply mode leads with the comment being answered, since that is
            // what the reply responds to; the post is only context underneath.
            // Keyed by capture so a new pick fades in rather than swapping silently.
            <div key={selectedPost.capturedAt} className="animate-fade-in space-y-2 rounded-lg border border-primary/25 bg-card p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-semibold">
                  {reply.targetAuthor ? `${reply.targetAuthor}'s comment` : "A comment"}
                </span>
                <Badge variant="accent">Reply</Badge>
              </div>
              <p className="line-clamp-3 border-l-2 border-primary/30 pl-2.5 text-sm leading-relaxed text-foreground/85">
                {reply.targetText}
              </p>
              <p className="text-xs text-muted-foreground">
                {reply.isOwnPost
                  ? "On your post"
                  : `On ${selectedPost.authorName ? `${selectedPost.authorName}'s` : "a"} post`}
                {reply.thread.length > 1 && ` · ${reply.thread.length} comments in thread`}
              </p>
            </div>
          ) : (
            <div key={selectedPost.capturedAt} className="animate-fade-in space-y-2 rounded-lg border bg-card p-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <Initials name={selectedPost.authorName} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{selectedPost.authorName || "Unknown author"}</span>
                    {postTypeLabel && <Badge>{postTypeLabel}</Badge>}
                  </div>
                  {selectedPost.authorHeadline && (
                    <p className="truncate text-xs text-muted-foreground" title={selectedPost.authorHeadline}>
                      {selectedPost.authorHeadline}
                    </p>
                  )}
                </div>
              </div>
              {selectedPost.text && (
                <p className="line-clamp-3 text-sm leading-relaxed text-foreground/85">{selectedPost.text}</p>
              )}
            </div>
          )}
        </div>
      ) : (
        // Nothing to write about yet: one place that says what to do next,
        // and, off LinkedIn, the button to get there.
        <div className="flex animate-fade-in flex-col items-center gap-3 rounded-lg border border-dashed border-input px-4 py-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <MousePointerClick aria-hidden className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">
              {onLinkedIn === false ? "Open LinkedIn to start" : "Pick a post on LinkedIn"}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Click <span className="font-medium text-foreground">Comment</span> under any post, or{" "}
              <span className="font-medium text-foreground">Reply</span> under a comment. It shows up here.
            </p>
          </div>
          {onLinkedIn === false && (
            <Button size="sm" onClick={() => chrome.tabs.create({ url: LINKEDIN_FEED_URL })}>
              Open LinkedIn
              <ExternalLink aria-hidden />
            </Button>
          )}
        </div>
      )}

      {selectedPost && (
        <div className="space-y-1.5">
          <label htmlFor="home-extra-instruction" className="text-xs font-medium text-muted-foreground">
            Extra instruction <span className="font-normal">(optional)</span>
          </label>
          <Textarea
            id="home-extra-instruction"
            autoGrow
            value={extraInstruction}
            onChange={(e) => setExtraInstruction(e.target.value)}
            readOnly={generating}
            rows={1}
            placeholder="e.g. mention my own experience with this"
            className="max-h-40 min-h-[2.625rem]"
          />
        </div>
      )}

      {showResult ? (
        <>
          {resultCard}
          {errorBox}
          {/* The last free generation still lands here to be copied; the
              card below is what the next one needs. */}
          {paywalled && <UnlockCard />}
        </>
      ) : paywalled ? (
        // Used-up free generations replace Generate entirely (see UnlockCard).
        <UnlockCard />
      ) : (
        <div className="space-y-2">
          {errorBox}
          <Button className="w-full" disabled={generateDisabled} onClick={handleGenerate}>
            {generateError ? <RotateCcw aria-hidden /> : <Sparkles aria-hidden />}
            {generateError ? "Try again" : "Generate"}
          </Button>
          {postHasNoText && (
            <p className="text-xs text-muted-foreground">
              {reply
                ? "Couldn't read that comment. Click Reply on it again."
                : "Couldn't read this post. Try opening it in its own page."}
            </p>
          )}
        </div>
      )}

      {!paywalled && <FreeGenerationsNote />}
    </div>
  );
}
