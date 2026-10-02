import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MessagesSquare, RefreshCw, RotateCcw, ScanText, Sparkles } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LoadingField } from "@/components/ui/loading-field";
import { Segmented } from "@/components/ui/segmented";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Initials } from "../Initials";
import { ResultCard } from "../ResultCard";
import { ScreenHeader } from "../ScreenHeader";
import { FreeGenerationsNote, UnlockCard } from "../UnlockCard";
import {
  isPaywalled,
  noteFreeRemaining,
  notePaywallError,
  setExtensionAccess,
  useExtensionAccess,
} from "@/lib/extensionAccess";
import { isLinkedInTab, noContentScriptMessage, sameConversation, sendToTab } from "@/lib/tabs";
import { insertFailureCode, readFailureCode, reportClientError, tabFailureCode } from "@/lib/errorReport";
import { markHistoryAction } from "@/lib/history";
// Kept on the account, so the website's Extension section edits the same values.
import { loadShowInsert, loadSyncedMessageContext, saveSyncedMessageContext } from "@/lib/syncedSettings";
import {
  apiFetch,
  ApiError,
  fetchExtConfig,
  isCancelled,
  type MeResponse,
  type MessageGenerateResponse,
  type MessageProfile,
} from "@/lib/api";
import {
  READ_CONVERSATION_MESSAGE_TYPE,
  MAX_MESSAGE_PURPOSE_CHARS,
  MESSAGE_TONES,
  type CapturedConversation,
  type MessageContextChoice,
  type MessageContextSetting,
} from "@/lib/messageThread";

// Conversation Assistant: read a LinkedIn conversation on demand (see
// src/lib/messageThread.ts's header for why there is no auto-capture), pick
// or reuse a purpose for that contact, and generate the next message — an
// opener if the thread is empty, a reply aware of the whole thread otherwise.
// Structurally this mirrors ConnectionNotePanel, but it is its own top-level
// screen rather than a mode of HomeScreen, so it owns its own Insert flow
// (config, preference) instead of receiving one as props.

// Must match INSERT_MESSAGE_TYPE in src/content-script.ts exactly.
const INSERT_MESSAGE_TYPE = "carouselabs:insert-comment";

// Sentinel options in the dropdowns: the first hands off to the builder
// (like the Home screen's), the second stands for "no tone override" (""),
// which a dropdown option can't use as its value.
const CREATE_CUSTOM_VALUE = "__create_custom__";
const PROFILE_TONE_VALUE = "__profile_tone__";

function userFacingError(err: unknown): string {
  if (err instanceof ApiError && err.status >= 400 && err.status < 500) return err.message;
  return "Something went wrong, try again";
}

interface Props {
  // Opens the message-profile builder; owned by App, like the other panels.
  onCreateProfile: () => void;
  // Read the open conversation as soon as the screen is ready: the person got
  // here from the conversation hint's "Write a reply with AI".
  readOnOpen?: boolean;
  // The conversation open in the LinkedIn tab (thread path), if any, so a
  // switch to someone else's is noticed.
  openConversation?: string | null;
}

export function MessagesScreen({ onCreateProfile, readOnOpen = false, openConversation = null }: Props) {
  const [profiles, setProfiles] = useState<MessageProfile[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [conversation, setConversation] = useState<CapturedConversation | null>(null);
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);

  const [choice, setChoice] = useState<MessageContextChoice>("profile");
  const [profileId, setProfileId] = useState<string>("");
  const [purpose, setPurpose] = useState("");
  // Only used for choice: "custom" — a saved profile carries its own tone.
  const [tone, setTone] = useState<string>(MESSAGE_TONES[0]);
  const [extraInstruction, setExtraInstruction] = useState("");

  const [generating, setGenerating] = useState(false);
  // The generation in flight, so Stop, reading another conversation or
  // leaving the screen can cancel it. Null once it ends or is cancelled.
  const generationRef = useRef<AbortController | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  // Whether the result card shows: from the first successful message for
  // this conversation on, even if the box is then cleared by hand.
  const [hasResult, setHasResult] = useState(false);
  // The message's History row (see markHistoryAction).
  const [historyId, setHistoryId] = useState<string | null>(null);
  const access = useExtensionAccess();
  const [copied, setCopied] = useState(false);
  // The output can land below the fold once a purpose/tone/thread preview
  // has pushed the page tall — scrolled into view automatically so a fresh
  // result is never hidden behind a scroll the user has to find themselves.
  const outputRef = useRef<HTMLElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  const [insertEnabled, setInsertEnabled] = useState(false);
  const [showInsertPref, setShowInsertPref] = useState(true);
  const [inserting, setInserting] = useState(false);
  const [insertError, setInsertError] = useState<string | null>(null);

  // What defaultProfileId() picks from. Refs, because a read started on open
  // runs from the first render, before these arrive.
  const profilesRef = useRef<MessageProfile[]>([]);
  const meRef = useRef<MeResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch<{ profiles: MessageProfile[] }>("/api/ext/message-profiles"),
      apiFetch<MeResponse>("/api/ext/me"),
    ])
      .then(([{ profiles: fetched }, meRes]) => {
        if (cancelled) return;
        profilesRef.current = fetched;
        meRef.current = meRes;
        setProfiles(fetched);
        setExtensionAccess(meRes.extension);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Failed to load");
      })
      .finally(() => {
        if (cancelled) return;
        setProfilesLoaded(true);
        // After the profiles, so the conversation gets its default reason.
        if (readOnOpen) void readConversation();
      });

    fetchExtConfig()
      .then((config) => {
        if (!cancelled) setInsertEnabled(config.insertEnabled);
      })
      .catch(() => {});

    loadShowInsert().then((show) => {
      if (!cancelled) setShowInsertPref(show);
    });

    return () => {
      cancelled = true;
      generationRef.current?.abort();
    };
    // Mount only: readOnOpen is how the screen was opened, and
    // readConversation reads the profiles through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Picks a sensible default for a contact whose purpose has never been set:
  // their saved default profile if they have one, otherwise the system
  // default, otherwise the first profile — same fallback chain HomeScreen
  // uses for comment profiles.
  function defaultProfileId(): string {
    const loaded = profilesRef.current;
    const systemDefault = loaded.find((p) => p.isSystem && p.isDefault);
    return (
      loaded.find((p) => p.id === meRef.current?.defaultMessageProfileId)?.id ??
      systemDefault?.id ??
      loaded[0]?.id ??
      ""
    );
  }

  async function applyContextForContact(url: string) {
    const stored = await loadSyncedMessageContext(url);
    if (stored) {
      setChoice(stored.choice);
      setProfileId(stored.profileId || defaultProfileId());
      setPurpose(stored.purpose);
      // The loader already applies the choice-aware default (empty
      // for "profile" — meaning no override — vs MESSAGE_TONES[0] for
      // custom/flow), so it is used as-is rather than re-defaulted here.
      setTone(stored.tone);
    } else {
      setChoice("profile");
      setProfileId(defaultProfileId());
      setPurpose("");
      setTone(""); // "profile" is the default choice — no tone override yet
    }
  }

  async function readConversation() {
    setReading(true);
    setReadError(null);
    setGenerateError(null);
    let tab: chrome.tabs.Tab | undefined;
    try {
      [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id === undefined) throw new Error("no active tab");
      const res = await sendToTab<{ ok: boolean; conversation?: CapturedConversation; error?: string } | undefined>(
        tab,
        { type: READ_CONVERSATION_MESSAGE_TYPE },
      );

      if (!res?.ok || !res.conversation) {
        setReadError(res?.error ?? "Couldn't read this conversation.");
        const code = readFailureCode(res?.error);
        if (code) reportClientError("messages", code);
        return;
      }

      // A reply still being written was for the conversation read before.
      if (generationRef.current) {
        generationRef.current.abort();
        generationRef.current = null;
        setGenerating(false);
      }
      setConversation(res.conversation);
      setMessage("");
      setHasResult(false);
      setHistoryId(null);
      setCopied(false);
      setInsertError(null);

      if (res.conversation.contact.profileUrl) {
        await applyContextForContact(res.conversation.contact.profileUrl);
      } else {
        setChoice("profile");
        setProfileId(defaultProfileId());
        setPurpose("");
        setTone("");
      }
    } catch (err) {
      if (isLinkedInTab(tab)) reportClientError("messages", tabFailureCode(err));
      setReadError(noContentScriptMessage(tab, "Open a LinkedIn conversation in the active tab first."));
    } finally {
      setReading(false);
    }
  }

  async function persistContext(next: MessageContextSetting) {
    if (!conversation?.contact.profileUrl) return;
    await saveSyncedMessageContext(conversation.contact.profileUrl, next, conversation.contact.name);
  }

  function handleChoiceChange(next: MessageContextChoice) {
    setChoice(next);
    // "" (no override) only has a listed option under "profile"; leaving the
    // profile choice with no tone picked yet needs a real value so the
    // dropdown isn't left showing nothing under custom/flow.
    const nextTone = tone || (next !== "profile" ? MESSAGE_TONES[0] : tone);
    setTone(nextTone);
    void persistContext({ choice: next, profileId, purpose, tone: nextTone });
  }

  function handleProfileChange(id: string) {
    setProfileId(id);
    void persistContext({ choice: "profile", profileId: id, purpose, tone });
  }

  function handlePurposeBlur() {
    void persistContext({ choice: "custom", profileId, purpose, tone });
  }

  function handleToneChange(next: string) {
    setTone(next);
    void persistContext({ choice, profileId, purpose, tone: next });
  }

  const isOpener = (conversation?.thread.length ?? 0) === 0;
  const canGenerate =
    Boolean(conversation?.contact.name) &&
    (choice === "profile" ? Boolean(profileId) : choice === "custom" ? Boolean(purpose.trim()) : true);

  const hasMessage = message.trim().length > 0;
  const showResult = generating || hasResult;

  // The card appears on the click (with a skeleton, or the previous message
  // until the new one lands); bring it into view then, not on every edit.
  useEffect(() => {
    if (generating) outputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [generating]);

  // A read conversation opens at its latest messages.
  useLayoutEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [conversation]);

  async function handleGenerate() {
    if (!conversation || !canGenerate) return;
    generationRef.current?.abort();
    const controller = new AbortController();
    generationRef.current = controller;
    const current = () => generationRef.current === controller;
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await apiFetch<MessageGenerateResponse>("/api/ext/message", {
        signal: controller.signal,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: { name: conversation.contact.name, headline: conversation.contact.headline },
          // For History's "Open chat" link only; never sent to the model.
          threadPath: conversation.threadPath,
          thread: conversation.thread,
          profileId: choice === "profile" ? profileId : undefined,
          goal: choice === "custom" ? purpose.trim() : undefined,
          flow: choice === "flow" || undefined,
          // Sent regardless of choice: overrides a saved profile's own tone
          // too, when the user picked one explicitly.
          tone: tone || undefined,
          extraInstruction: extraInstruction.trim() || undefined,
        }),
      });
      if (!current()) return;
      setMessage(res.message);
      setHasResult(true);
      setHistoryId(res.historyId ?? null);
      noteFreeRemaining(res.freeRemaining);
      setCopied(false);
    } catch (err) {
      if (isCancelled(err) || !current()) return;
      // The paywall's 402 swaps in the unlock card, which says it better.
      if (!notePaywallError(err)) setGenerateError(userFacingError(err));
    } finally {
      // Cleared here unless a newer generation has already started.
      if (current() || generationRef.current === null) {
        generationRef.current = null;
        setGenerating(false);
      }
    }
  }

  // Stop: ends the wait; the message that was there stays.
  function handleStop() {
    generationRef.current?.abort();
    generationRef.current = null;
    setGenerating(false);
  }

  async function handleCopy() {
    if (!message.trim()) return;
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      setGenerateError("Couldn't copy to clipboard");
      return;
    }
    markHistoryAction(historyId, "COPIED", message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleInsertClick() {
    if (!message.trim()) return;
    void performInsert(message);
  }

  async function performInsert(text: string) {
    setInserting(true);
    setInsertError(null);
    let tab: chrome.tabs.Tab | undefined;
    try {
      [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id === undefined) throw new Error("no active tab");
      if (!conversation) throw new Error("nothing read");
      const res = await sendToTab<{ ok: boolean; error?: string } | undefined>(tab, {
        type: INSERT_MESSAGE_TYPE,
        text,
        mode: "message",
        // The content script refuses unless this conversation is still the
        // one open, so text written for one person can't land in another's box.
        expect: { threadPath: conversation.threadPath, contactName: conversation.contact.name },
      });

      if (!res?.ok) {
        setInsertError(res?.error ?? "Couldn't insert into LinkedIn. Try Copy instead.");
        reportClientError("messages", insertFailureCode(res?.error));
        return;
      }
      markHistoryAction(historyId, "INSERTED", text);
    } catch (err) {
      if (isLinkedInTab(tab)) reportClientError("messages", tabFailureCode(err));
      setInsertError(noContentScriptMessage(tab, "Open the LinkedIn conversation in the active tab, then try again."));
    } finally {
      setInserting(false);
    }
  }

  const recommendedProfiles = profiles.filter((p) => p.isRecommended);
  const systemProfiles = profiles.filter((p) => p.isSystem && !p.isRecommended);
  const customProfiles = profiles.filter((p) => !p.isSystem);
  const paywalled = isPaywalled(access);
  const showInsert = insertEnabled && showInsertPref;

  // Why Generate is off, in words, rather than a button that just won't press.
  const generateBlocker = !conversation?.contact.name
    ? "Couldn't tell who this conversation is with. Read it again."
    : choice === "profile" && !profileId
      ? "Pick a saved reason first."
      : choice === "custom" && !purpose.trim()
        ? "Write your reason first."
        : null;

  // The tab moved on to someone else's conversation after this one was read.
  const otherConversationOpen =
    conversation !== null && openConversation !== null && !sameConversation(conversation.threadPath, openConversation);

  return (
    <div className="flex flex-col gap-4 p-4">
      <ScreenHeader title="Messages" description="Write the next message in a LinkedIn conversation." />

      {loadError && <Alert>{loadError}</Alert>}

      {otherConversationOpen && (
        <div
          role="status"
          className="flex animate-fade-in items-center justify-between gap-3 rounded-lg border border-primary/50 bg-card px-3 py-2.5 shadow-sm"
        >
          <p className="text-xs font-medium">You opened a different conversation.</p>
          <Button size="sm" loading={reading} onClick={readConversation}>
            {!reading && <ScanText aria-hidden />}
            Read this one
          </Button>
        </div>
      )}

      {!conversation ? (
        <div className="flex animate-fade-in flex-col items-center gap-3 rounded-lg border border-dashed border-input px-4 py-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <MessagesSquare aria-hidden className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">Open a conversation on LinkedIn</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Then read it here. Read it again each time you come back to reply, so the next message knows what was
              said.
            </p>
          </div>
          <Button loading={reading || (readOnOpen && !profilesLoaded)} onClick={readConversation}>
            {!reading && !(readOnOpen && !profilesLoaded) && <ScanText aria-hidden />}
            {reading || (readOnOpen && !profilesLoaded) ? "Reading…" : "Read this conversation"}
          </Button>
          {readError && <Alert className="w-full text-left">{readError}</Alert>}
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Conversation with</p>
            <div className="animate-fade-in space-y-3 rounded-lg border bg-card p-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <Initials name={conversation.contact.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{conversation.contact.name || "Unknown contact"}</p>
                  {conversation.contact.headline && (
                    <p className="truncate text-xs text-muted-foreground" title={conversation.contact.headline}>
                      {conversation.contact.headline}
                    </p>
                  )}
                </div>
                <Tooltip label="Read it again" side="top-end">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Re-read this conversation"
                    loading={reading}
                    onClick={readConversation}
                  >
                    {!reading && <RefreshCw aria-hidden />}
                  </Button>
                </Tooltip>
              </div>

              {conversation.thread.length === 0 ? (
                <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  No messages yet, so this will be an opener.
                </p>
              ) : (
                <>
                  {/* Opens scrolled to the latest messages, the ones being answered.
                      Focusable, so the keyboard can scroll it too. */}
                  <div
                    ref={threadRef}
                    role="region"
                    tabIndex={0}
                    aria-label="Conversation so far"
                    className="max-h-48 space-y-1.5 overflow-y-auto rounded-md bg-muted/50 p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {conversation.thread.map((entry, i) => (
                      <div key={i} className={cn("flex", entry.sender === "me" ? "justify-end" : "justify-start")}>
                        <p
                          className={cn(
                            "max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-2.5 py-1.5 text-xs leading-relaxed",
                            entry.sender === "me"
                              ? "rounded-br-sm bg-accent text-accent-foreground"
                              : "rounded-bl-sm border bg-card text-foreground",
                          )}
                        >
                          <span className="sr-only">
                            {entry.sender === "me" ? "You: " : entry.sender === "them" ? "Them: " : "Unknown sender: "}
                          </span>
                          {entry.text}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {conversation.thread.length} message{conversation.thread.length === 1 ? "" : "s"} read
                  </p>
                </>
              )}
            </div>
            {readError && <Alert>{readError}</Alert>}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Reason for this conversation</p>
            <Segmented
              label="Reason for this conversation"
              options={[
                { value: "profile", label: "Saved reason" },
                { value: "custom", label: "Write my own" },
                { value: "flow", label: "Just continue" },
              ]}
              value={choice}
              onChange={handleChoiceChange}
            />

            {choice === "flow" && (
              <p className="text-xs text-muted-foreground">
                No reason needed: it reads the conversation so far and continues it naturally.
              </p>
            )}

            {choice === "profile" &&
              (!profilesLoaded ? (
                <LoadingField>Loading reasons…</LoadingField>
              ) : (
                <Select
                  value={profileId}
                  onValueChange={(value) => {
                    if (value === CREATE_CUSTOM_VALUE) {
                      onCreateProfile();
                      return;
                    }
                    handleProfileChange(value);
                  }}
                >
                  <SelectTrigger aria-label="Saved reason">
                    <SelectValue placeholder="Pick a saved reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {recommendedProfiles.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Recommended by CarouseLabs</SelectLabel>
                        {recommendedProfiles.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {systemProfiles.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Built-in</SelectLabel>
                        {systemProfiles.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {customProfiles.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Your profiles</SelectLabel>
                        {customProfiles.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    <SelectSeparator />
                    <SelectItem value={CREATE_CUSTOM_VALUE} className="font-medium text-primary-text">
                      + Create custom profile
                    </SelectItem>
                  </SelectContent>
                </Select>
              ))}

            {choice === "custom" && (
              <div className="animate-fade-in space-y-1">
                <Textarea
                  autoGrow
                  aria-label="Your reason for this conversation"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value.slice(0, MAX_MESSAGE_PURPOSE_CHARS))}
                  onBlur={handlePurposeBlur}
                  placeholder="e.g. A potential client: understand their situation before proposing anything"
                  className="max-h-40 min-h-[4.5rem]"
                />
                <p className="text-right text-xs tabular-nums text-muted-foreground">
                  {purpose.length}/{MAX_MESSAGE_PURPOSE_CHARS}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label id="message-tone-label" className="text-xs font-medium text-muted-foreground">
              Tone {choice === "profile" && <span className="font-normal">(optional)</span>}
            </label>
            <Select
              value={tone || PROFILE_TONE_VALUE}
              onValueChange={(value) => handleToneChange(value === PROFILE_TONE_VALUE ? "" : value)}
            >
              <SelectTrigger aria-labelledby="message-tone-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {choice === "profile" && <SelectItem value={PROFILE_TONE_VALUE}>Use the profile&apos;s own tone</SelectItem>}
                {tone && !(MESSAGE_TONES as readonly string[]).includes(tone) && <SelectItem value={tone}>{tone}</SelectItem>}
                {MESSAGE_TONES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="message-extra-instruction" className="text-xs font-medium text-muted-foreground">
              Extra instruction <span className="font-normal">(optional)</span>
            </label>
            <Textarea
              id="message-extra-instruction"
              autoGrow
              value={extraInstruction}
              onChange={(e) => setExtraInstruction(e.target.value.slice(0, 500))}
              readOnly={generating}
              rows={1}
              placeholder="e.g. mention I saw their post about hiring"
              className="max-h-40 min-h-[2.625rem]"
            />
          </div>

          {showResult ? (
            <>
              <ResultCard
                sectionRef={outputRef}
                noun="message"
                value={message}
                onChange={(value) => {
                  setMessage(value);
                  setCopied(false);
                }}
                generating={generating}
                onStop={handleStop}
                busy={generating || inserting}
                stale={generating && hasMessage}
                copied={copied}
                copyDisabled={!hasMessage || generating || inserting}
                onCopy={handleCopy}
                insert={
                  showInsert
                    ? { disabled: !hasMessage || generating || inserting, inserting, onClick: handleInsertClick }
                    : null
                }
                onRegenerate={handleGenerate}
                regenerateDisabled={!canGenerate || generating || inserting || paywalled}
              />
              {(generateError || insertError) && <Alert>{generateError || insertError}</Alert>}
              {paywalled && <UnlockCard />}
            </>
          ) : paywalled ? (
            <UnlockCard />
          ) : (
            <div className="space-y-2">
              {generateError && <Alert>{generateError}</Alert>}
              <Button className="w-full" disabled={!canGenerate || generating} onClick={handleGenerate}>
                {generateError ? <RotateCcw aria-hidden /> : <Sparkles aria-hidden />}
                {generateError ? "Try again" : isOpener ? "Generate opener" : "Generate reply"}
              </Button>
            </div>
          )}

          {generateBlocker && <p className="text-xs text-muted-foreground">{generateBlocker}</p>}

          {!paywalled && <FreeGenerationsNote />}
        </>
      )}
    </div>
  );
}
