import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ExternalLink, Image as ImageIcon, Minus, MousePointerClick, Plus, Quote, RotateCcw, Sparkles } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingField } from "@/components/ui/loading-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RecommendedBadge } from "@/sidepanel/components/RecommendedBadge";
import { ResultCard } from "@/sidepanel/components/ResultCard";
import { RewriteButton } from "@/sidepanel/components/RewriteButton";
import { Initials } from "@/sidepanel/components/Initials";
import { FreeGenerationsNote, UnlockCard } from "@/sidepanel/components/UnlockCard";
import { GoToSiteCard, goToSite } from "@/sidepanel/components/GoToSiteCard";
import { useOnSite } from "@/sidepanel/useOnSite";
import { apiFetch, apiStream, ApiError, fetchExtConfig, isCancelled, userFacingError, type MeResponse, type RewriteResponse } from "@/lib/api";
import {
  isPaywalled,
  noteFreeRemaining,
  notePaywallError,
  setExtensionAccess,
  useExtensionAccess,
} from "@/lib/extensionAccess";
import { markHistoryAction } from "@/lib/history";
import { useInsert } from "@/sidepanel/useInsert";
import { X_INSERT_MESSAGE_TYPE, X_LAST_POST_STORAGE_KEY, type XCapturedPost } from "@/x/lib/xPost";
import { xLength, X_MAX_LENGTH } from "@/x/lib/xText";

const X_HOME_URL = "https://x.com/home";
const CREATE_CUSTOM_VALUE = "__create_custom__";

export interface XProfile {
  id: string;
  name: string;
  tone: string;
  length: string;
  isDefault: boolean;
  isSystem: boolean;
  isRecommended: boolean;
}

interface XReplyFinal {
  comment: string;
  freeRemaining: number | null;
  historyId: string;
  length: number;
  maxLength: number;
}

const MEDIA_LABEL: Record<string, string> = {
  image: "Image",
  video: "Video",
  gif: "GIF",
  poll: "Poll",
  link: "Link",
};


interface Props {
  // Opens the X profile builder (the Profiles screen).
  onCreateProfile?: () => void;
}

// The X extension's Home: Reply clicked on a post on X lands here, and the
// reply is written here — in one of the user's X profiles, streamed as it is
// written, counted the way X counts — then copied or inserted into X's reply
// box. Nothing is ever posted for the user.
export function XHomeScreen({ onCreateProfile }: Props) {
  const [profiles, setProfiles] = useState<XProfile[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [maxLength, setMaxLength] = useState(X_MAX_LENGTH);

  const [target, setTarget] = useState<XCapturedPost | null>(null);
  const [extraInstruction, setExtraInstruction] = useState("");
  const [reply, setReply] = useState("");
  const [hasResult, setHasResult] = useState(false);
  const [resultProfileId, setResultProfileId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [rewriting, setRewriting] = useState<"shorter" | "longer" | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [insertEnabled, setInsertEnabled] = useState(false);
  const [insertHidden, setInsertHidden] = useState(false);
  const insertion = useInsert();
  const inserting = insertion.inserting;
  // Whether the active tab is on X, live: writing and Insert happen on X, so
  // on any other site Home points back to X instead (what was written stays
  // for Copy).
  const onX = useOnSite();
  const offX = onX === false;
  const access = useExtensionAccess();

  // The generation in flight, so Stop, a new post or leaving can cancel it.
  const generationRef = useRef<AbortController | null>(null);
  const beforeGenerateRef = useRef<{ reply: string; historyId: string | null; profileId: string | null } | null>(null);
  const pendingTextRef = useRef<string | null>(null);
  const textFrameRef = useRef<number | null>(null);
  const outputRef = useRef<HTMLElement>(null);
  const userPickedRef = useRef(false);
  // The post on screen, so a Shorter / Longer that returns after a new post
  // arrived is dropped rather than shown under the wrong post.
  const targetAtRef = useRef<number | null>(null);

  // Profiles, the account's X settings and its plan, once.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch<{ profiles: XProfile[]; defaultProfileId: string | null }>("/api/ext/x/profiles"),
      apiFetch<{ maxReplyLength: number; insertButtonHidden: boolean }>("/api/ext/x/settings"),
      apiFetch<MeResponse>("/api/ext/me"),
    ])
      .then(([list, settings, me]) => {
        if (cancelled) return;
        setProfiles(list.profiles);
        const preselected =
          list.profiles.find((p) => p.id === list.defaultProfileId) ??
          list.profiles.find((p) => p.isSystem && p.isDefault) ??
          list.profiles[0];
        setSelectedId((current) => (userPickedRef.current && current ? current : (preselected?.id ?? "")));
        setMaxLength(settings.maxReplyLength);
        setInsertHidden(settings.insertButtonHidden);
        setExtensionAccess(me.extension);
        setLoadState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : "Failed to load your X profiles");
        setLoadState("error");
      });

    fetchExtConfig()
      .then((config) => !cancelled && setInsertEnabled(config.insertEnabled))
      .catch(() => {});

    // An X tab left over from before an update gets a working content script
    // from App's site check (SiteBlockedNotice's useSiteBlocked).

    return () => {
      cancelled = true;
    };
  }, []);

  // The post a Reply click captured: in storage (found even if the panel was
  // closed at the time) and announced by its change.
  useEffect(() => {
    let lastAppliedAt: number | null = null;
    function apply(post: XCapturedPost | undefined) {
      if (!post || post.capturedAt === lastAppliedAt) return;
      lastAppliedAt = post.capturedAt;
      targetAtRef.current = post.capturedAt;
      setTarget(post);
      setReply("");
      setHasResult(false);
      setHistoryId(null);
      setResultProfileId(null);
      setCopied(false);
      setRewriting(null);
      setGenerateError(null);
    }
    function onChange(changes: { [key: string]: chrome.storage.StorageChange }, area: string) {
      if (area === "local" && X_LAST_POST_STORAGE_KEY in changes) apply(changes[X_LAST_POST_STORAGE_KEY].newValue as XCapturedPost);
    }
    chrome.storage.onChanged.addListener(onChange);
    void chrome.storage.local.get(X_LAST_POST_STORAGE_KEY).then((stored) => apply(stored[X_LAST_POST_STORAGE_KEY] as XCapturedPost));
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, []);

  // A generation belongs to the post it was started for: a new post, or
  // leaving the screen, cancels it.
  const targetKey = target?.capturedAt;
  useEffect(() => {
    return () => {
      generationRef.current?.abort();
      generationRef.current = null;
    };
  }, [targetKey]);

  useEffect(() => () => cancelQueuedText(), []);

  function queueStreamedText(text: string) {
    pendingTextRef.current = text;
    if (textFrameRef.current !== null) return;
    textFrameRef.current = requestAnimationFrame(() => {
      textFrameRef.current = null;
      const next = pendingTextRef.current;
      pendingTextRef.current = null;
      if (next !== null) setReply(next);
    });
  }

  function cancelQueuedText() {
    if (textFrameRef.current !== null) cancelAnimationFrame(textFrameRef.current);
    textFrameRef.current = null;
    pendingTextRef.current = null;
  }

  const paywalled = isPaywalled(access);
  const busy = generating || rewriting !== null;
  const generateDisabled = !target || !selectedId || paywalled || busy || offX;
  const hasReply = reply.trim().length > 0;
  // Shorter / Longer are model calls, so the paywall stops them; Copy and
  // Insert never.
  const rewriteDisabled = !hasReply || busy || paywalled || offX;
  const length = xLength(reply);
  const overLimit = length > maxLength;

  async function handleGenerate() {
    if (!target || !selectedId) return;
    generationRef.current?.abort();
    const controller = new AbortController();
    generationRef.current = controller;
    const current = () => generationRef.current === controller;
    beforeGenerateRef.current = hasResult ? { reply, historyId, profileId: resultProfileId } : null;
    const usedProfileId = selectedId;
    cancelQueuedText();
    setGenerating(true);
    setGenerateError(null);
    setReply("");
    setHistoryId(null);
    setCopied(false);

    let scrolled = false;
    try {
      const res = await apiStream<XReplyFinal>(
        "/api/ext/x/reply",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            profileId: usedProfileId,
            post: target.post,
            thread: target.thread,
            quoted: target.quoted,
            isOwnPost: target.isOwnPost,
            extraInstruction: extraInstruction.trim() || undefined,
          }),
        },
        {
          onText: (text) => {
            if (!current()) return;
            queueStreamedText(text);
            if (text && !scrolled) {
              scrolled = true;
              outputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
          },
          onRetry: () => current() && queueStreamedText(""),
        },
      );
      if (!current()) return;
      cancelQueuedText();
      setReply(res.comment);
      setHasResult(true);
      setResultProfileId(usedProfileId);
      setHistoryId(res.historyId);
      setMaxLength(res.maxLength);
      noteFreeRemaining(res.freeRemaining);
    } catch (err) {
      if (isCancelled(err) || !current()) return;
      cancelQueuedText();
      setReply("");
      setHasResult(false);
      if (!notePaywallError(err)) setGenerateError(userFacingError(err));
    } finally {
      if (current() || generationRef.current === null) {
        generationRef.current = null;
        setGenerating(false);
      }
    }
  }

  // Shorter / Longer: resizes what is in the box now, hand edits included,
  // never past the account's X limit (lib/engage/rewriteRoute.ts). historyId
  // keeps the saved history text in step with the new version.
  async function handleRewrite(direction: "shorter" | "longer") {
    if (!hasReply) return;
    const forTarget = targetAtRef.current;
    setRewriting(direction);
    setGenerateError(null);
    setCopied(false);
    try {
      const res = await apiFetch<RewriteResponse>("/api/ext/x/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentComment: reply, direction, historyId }),
      });
      if (targetAtRef.current !== forTarget) return;
      setReply(res.comment);
      noteFreeRemaining(res.freeRemaining);
    } catch (err) {
      if (targetAtRef.current !== forTarget) return;
      if (!notePaywallError(err)) setGenerateError(userFacingError(err));
    } finally {
      if (targetAtRef.current === forTarget) setRewriting(null);
    }
  }

  // Stop: ends the wait and puts back what the card showed before.
  function handleStop() {
    generationRef.current?.abort();
    generationRef.current = null;
    cancelQueuedText();
    setGenerating(false);
    const before = beforeGenerateRef.current;
    setReply(before?.reply ?? "");
    setHistoryId(before?.historyId ?? null);
    setResultProfileId(before?.profileId ?? null);
    setHasResult(before !== null);
  }

  async function handleCopy() {
    if (!hasReply) return;
    try {
      await navigator.clipboard.writeText(reply);
    } catch {
      setGenerateError("Couldn't copy to clipboard");
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    markHistoryAction(historyId, "COPIED", reply);
  }

  async function handleInsert() {
    if (!hasReply || !target) return;
    const text = reply;
    const outcome = await insertion.insert({
      // The page refuses unless the reply box open is for this post.
      message: { type: X_INSERT_MESSAGE_TYPE, text, expect: { postUrl: target.post.url } },
      feature: "x_replies",
      failed: "Couldn't insert into X. Try Copy instead.",
      notOnSite: "Open the post on X in the active tab, then try again.",
    });
    // Ignored: an Insert is already running, or just landed.
    if (!outcome) return;
    setGenerateError(outcome.ok ? null : outcome.error);
    if (outcome.ok) markHistoryAction(historyId, "INSERTED", text);
  }

  function handleProfileChange(value: string) {
    if (value === CREATE_CUSTOM_VALUE) {
      onCreateProfile?.();
      return;
    }
    userPickedRef.current = true;
    setSelectedId(value);
  }

  useLayoutEffect(() => {
    if (generating) outputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [generating]);

  const recommended = profiles.filter((p) => p.isRecommended);
  const builtIn = profiles.filter((p) => p.isSystem && !p.isRecommended);
  const own = profiles.filter((p) => !p.isSystem);
  const rewriteProfile =
    hasResult && !generateDisabled && resultProfileId !== null && selectedId !== resultProfileId
      ? (profiles.find((p) => p.id === selectedId) ?? null)
      : null;
  const showInsert = insertEnabled && !insertHidden && !offX;
  const errorBox = generateError && <Alert>{generateError}</Alert>;

  return (
    <div className="flex flex-col gap-4 p-4">
      {target && offX && (
        <GoToSiteCard body="Replies are written for posts on X. Go back to X to write one." homeUrl={X_HOME_URL} />
      )}
      <div className="space-y-1.5">
        <label id="x-profile-label" className="text-xs font-medium text-muted-foreground">
          X profile
        </label>
        {loadState === "loading" && <LoadingField>Loading profiles…</LoadingField>}
        {loadState === "error" && <Alert>{loadError}</Alert>}
        {loadState === "ready" && (
          <Select value={selectedId} onValueChange={handleProfileChange}>
            <SelectTrigger aria-labelledby="x-profile-label">
              <SelectValue placeholder="Select a profile" />
            </SelectTrigger>
            <SelectContent>
              {recommended.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                  {p.isDefault ? " (default)" : ""}
                  <RecommendedBadge />
                </SelectItem>
              ))}
              {recommended.length > 0 && builtIn.length > 0 && <SelectSeparator />}
              {builtIn.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                  {p.isDefault ? " (default)" : ""}
                </SelectItem>
              ))}
              {own.length > 0 && <SelectSeparator />}
              {own.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
              {onCreateProfile && (
                <>
                  <SelectSeparator />
                  <SelectItem value={CREATE_CUSTOM_VALUE} className="font-medium text-primary-text">
                    + Create custom profile
                  </SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        )}
        {rewriteProfile && (
          <RewriteButton
            label={`Rewrite with ${rewriteProfile.name}`}
            current={`Current reply: ${profiles.find((p) => p.id === resultProfileId)?.name ?? "another profile"}`}
            onClick={() => void handleGenerate()}
          />
        )}
      </div>

      {target ? (
        // Faded off X: it waits there until X is the active tab again.
        <div className={`space-y-1.5 ${offX ? "opacity-60" : ""}`}>
          <p className="text-xs font-medium text-muted-foreground">Replying to</p>
          <div key={target.capturedAt} className="animate-fade-in space-y-2 rounded-lg border bg-card p-3 shadow-sm">
            {target.thread.length > 0 && (
              <p className="text-xs text-muted-foreground">
                In a conversation with {target.thread.length} post{target.thread.length === 1 ? "" : "s"} above it
              </p>
            )}
            <div className="flex items-center gap-2.5">
              <Initials name={target.post.author || target.post.handle} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{target.post.author || "Someone on X"}</p>
                {target.post.handle && <p className="truncate text-xs text-muted-foreground">@{target.post.handle}</p>}
              </div>
            </div>
            {target.post.text && <p className="line-clamp-4 whitespace-pre-line text-sm leading-relaxed">{target.post.text}</p>}
            {(target.post.media.length > 0 || target.quoted) && (
              <div className="flex flex-wrap gap-1.5">
                {target.post.media.map((m) => (
                  <Badge key={m} variant="neutral">
                    <ImageIcon aria-hidden className="h-3 w-3" />
                    {MEDIA_LABEL[m] ?? m}
                  </Badge>
                ))}
                {target.quoted && (
                  <Badge variant="neutral">
                    <Quote aria-hidden className="h-3 w-3" />
                    Quotes @{target.quoted.handle || "a post"}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex animate-fade-in flex-col items-center gap-3 rounded-lg border border-dashed border-input px-4 py-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <MousePointerClick aria-hidden className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">{onX === false ? "Open X to start" : "Pick a post on X"}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Click <span className="font-medium text-foreground">Reply</span> under any post. It shows up here.
            </p>
          </div>
          {onX === false && (
            <Button size="sm" onClick={() => void goToSite(X_HOME_URL)}>
              Open X
              <ExternalLink aria-hidden />
            </Button>
          )}
        </div>
      )}

      {target && (
        <div className="space-y-1.5">
          <label htmlFor="x-extra-instruction" className="text-xs font-medium text-muted-foreground">
            Extra instruction <span className="font-normal">(optional)</span>
          </label>
          <Textarea
            id="x-extra-instruction"
            autoGrow
            value={extraInstruction}
            onChange={(e) => setExtraInstruction(e.target.value)}
            readOnly={generating}
            rows={1}
            placeholder="e.g. disagree politely, mention my own experience"
            className="max-h-40 min-h-[2.625rem]"
          />
        </div>
      )}

      {generating || hasResult ? (
        <>
          <ResultCard
            sectionRef={outputRef}
            noun="reply"
            value={reply}
            onChange={(value) => {
              setReply(value);
              setCopied(false);
            }}
            generating={generating}
            onStop={handleStop}
            busy={busy}
            meta={
              rewriting === "shorter" ? (
                "Shortening…"
              ) : rewriting === "longer" ? (
                "Lengthening…"
              ) : generating ? undefined : (
                <span className={overLimit ? "font-medium text-destructive" : undefined}>
                  {length}/{maxLength}
                </span>
              )
            }
            notice={
              overLimit && !busy ? (
                <p className="text-xs text-destructive">Too long for X: shorten it before posting.</p>
              ) : undefined
            }
            copied={copied}
            copyDisabled={!hasReply || busy}
            onCopy={handleCopy}
            insert={
              showInsert
                ? { disabled: !hasReply || busy || overLimit, inserting, inserted: insertion.inserted, onClick: handleInsert }
                : null
            }
            tools={
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="px-2.5"
                  disabled={rewriteDisabled}
                  loading={rewriting === "shorter"}
                  onClick={() => void handleRewrite("shorter")}
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
                  onClick={() => void handleRewrite("longer")}
                >
                  {rewriting !== "longer" && <Plus aria-hidden />}
                  Longer
                </Button>
              </>
            }
            onRegenerate={handleGenerate}
            regenerateDisabled={generateDisabled}
          />
          {errorBox}
          {paywalled && <UnlockCard />}
        </>
      ) : paywalled ? (
        <UnlockCard />
      ) : offX ? null : (
        <div className="space-y-2">
          {errorBox}
          <Button className="w-full" disabled={generateDisabled} onClick={handleGenerate}>
            {generateError ? <RotateCcw aria-hidden /> : <Sparkles aria-hidden />}
            {generateError ? "Try again" : "Write reply"}
          </Button>
        </div>
      )}

      {!paywalled && <FreeGenerationsNote />}
    </div>
  );
}
