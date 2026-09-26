import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { InsertWarningModal } from "../InsertWarningModal";
import { noContentScriptMessage } from "@/lib/tabs";
import {
  apiFetch,
  ApiError,
  fetchExtConfig,
  type MeResponse,
  type MessageGenerateResponse,
  type MessageProfile,
} from "@/lib/api";
import {
  loadMessageContext,
  saveMessageContext,
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
// (config, preference, warning modal) instead of receiving one as props.

// Must match INSERT_MESSAGE_TYPE in src/content-script.ts exactly.
const INSERT_MESSAGE_TYPE = "carouselabs:insert-comment";

// Per-install UI preference, same key HomeScreen uses — one install-wide
// choice, not one per screen.
const SHOW_INSERT_STORAGE_KEY = "showInsertButton";

function userFacingError(err: unknown): string {
  if (err instanceof ApiError && err.status >= 400 && err.status < 500) return err.message;
  return "Something went wrong, try again";
}

interface Props {
  // Opens the message-profile builder; owned by App, like the other panels.
  onCreateProfile: () => void;
}

export function MessagesScreen({ onCreateProfile }: Props) {
  const [profiles, setProfiles] = useState<MessageProfile[]>([]);
  const [me, setMe] = useState<MeResponse | null>(null);
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
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [credits, setCredits] = useState<number | null>(null);
  const [creditsEnforced, setCreditsEnforced] = useState(true);
  const [copied, setCopied] = useState(false);
  // The output can land below the fold once a purpose/tone/thread preview
  // has pushed the page tall — scrolled into view automatically so a fresh
  // result is never hidden behind a scroll the user has to find themselves.
  const outputRef = useRef<HTMLDivElement>(null);

  const [insertEnabled, setInsertEnabled] = useState(false);
  const [showInsertPref, setShowInsertPref] = useState(true);
  const [insertWarningHidden, setInsertWarningHidden] = useState(false);
  const [showInsertWarning, setShowInsertWarning] = useState(false);
  const [inserting, setInserting] = useState(false);
  const [insertError, setInsertError] = useState<string | null>(null);
  const [pendingInsertText, setPendingInsertText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch<{ profiles: MessageProfile[] }>("/api/ext/message-profiles"),
      apiFetch<MeResponse>("/api/ext/me"),
    ])
      .then(([{ profiles: fetched }, meRes]) => {
        if (cancelled) return;
        setProfiles(fetched);
        setMe(meRes);
        setCredits(meRes.creditsAvailable);
        setCreditsEnforced(meRes.creditsEnforced !== false);
        setInsertWarningHidden(meRes.insertWarningHidden);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Failed to load");
      });

    fetchExtConfig()
      .then((config) => {
        if (!cancelled) setInsertEnabled(config.insertEnabled);
      })
      .catch(() => {});

    chrome.storage.local.get(SHOW_INSERT_STORAGE_KEY).then((stored) => {
      if (cancelled) return;
      const value = stored[SHOW_INSERT_STORAGE_KEY];
      setShowInsertPref(value !== false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Picks a sensible default for a contact whose purpose has never been set:
  // their saved default profile if they have one, otherwise the system
  // default, otherwise the first profile — same fallback chain HomeScreen
  // uses for comment profiles.
  function defaultProfileId(): string {
    const systemDefault = profiles.find((p) => p.isSystem && p.isDefault);
    return (
      profiles.find((p) => p.id === me?.defaultMessageProfileId)?.id ??
      systemDefault?.id ??
      profiles[0]?.id ??
      ""
    );
  }

  async function applyContextForContact(url: string) {
    const stored = await loadMessageContext(url);
    if (stored) {
      setChoice(stored.choice);
      setProfileId(stored.profileId || defaultProfileId());
      setPurpose(stored.purpose);
      // loadMessageContext already applies the choice-aware default (empty
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
      const res = (await chrome.tabs.sendMessage(tab.id, { type: READ_CONVERSATION_MESSAGE_TYPE })) as
        | { ok: boolean; conversation?: CapturedConversation; error?: string }
        | undefined;

      if (!res?.ok || !res.conversation) {
        setReadError(res?.error ?? "Couldn't read this conversation.");
        return;
      }

      setConversation(res.conversation);
      setMessage("");
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
    } catch {
      setReadError(noContentScriptMessage(tab, "Open a LinkedIn conversation in the active tab first."));
    } finally {
      setReading(false);
    }
  }

  async function persistContext(next: MessageContextSetting) {
    if (!conversation?.contact.profileUrl) return;
    await saveMessageContext(conversation.contact.profileUrl, next);
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

  useEffect(() => {
    if (message) outputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [message]);

  async function handleGenerate() {
    if (!conversation || !canGenerate) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await apiFetch<MessageGenerateResponse>("/api/ext/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: { name: conversation.contact.name, headline: conversation.contact.headline },
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
      setMessage(res.message);
      setCredits(res.creditsRemaining);
      setCopied(false);
    } catch (err) {
      setGenerateError(userFacingError(err));
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!message.trim()) return;
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      setGenerateError("Couldn't copy to clipboard");
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleInsertClick() {
    if (!message.trim()) return;
    if (insertWarningHidden) {
      void performInsert(message);
      return;
    }
    setPendingInsertText(message);
    setShowInsertWarning(true);
  }

  async function performInsert(text: string) {
    setInserting(true);
    setInsertError(null);
    let tab: chrome.tabs.Tab | undefined;
    try {
      [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id === undefined) throw new Error("no active tab");
      if (!conversation) throw new Error("nothing read");
      const res = (await chrome.tabs.sendMessage(tab.id, {
        type: INSERT_MESSAGE_TYPE,
        text,
        mode: "message",
        // The content script refuses unless this conversation is still the
        // one open, so text written for one person can't land in another's box.
        expect: { threadPath: conversation.threadPath, contactName: conversation.contact.name },
      })) as { ok: boolean; error?: string } | undefined;

      if (!res?.ok) {
        setInsertError(res?.error ?? "Couldn't insert into LinkedIn. Try Copy instead.");
      }
    } catch {
      setInsertError(noContentScriptMessage(tab, "Open the LinkedIn conversation in the active tab, then try again."));
    } finally {
      setInserting(false);
    }
  }

  async function handleConfirmInsert(dontShowAgain: boolean) {
    setShowInsertWarning(false);
    const pending = pendingInsertText;
    setPendingInsertText(null);
    if (!pending) return;

    if (dontShowAgain) {
      setInsertWarningHidden(true);
      apiFetch("/api/ext/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insertWarningHidden: true }),
      }).catch(() => {});
    }

    await performInsert(pending);
  }

  const recommendedProfiles = profiles.filter((p) => p.isRecommended);
  const systemProfiles = profiles.filter((p) => p.isSystem && !p.isRecommended);
  const customProfiles = profiles.filter((p) => !p.isSystem);
  const outOfCredits = creditsEnforced && credits !== null && credits <= 0;
  const showInsert = insertEnabled && showInsertPref;

  const insertWarningModal = showInsertWarning && (
    <InsertWarningModal
      onCopyInstead={() => {
        setShowInsertWarning(false);
        setPendingInsertText(null);
        void handleCopy();
      }}
      onInsertAnyway={handleConfirmInsert}
      onDismiss={() => {
        setShowInsertWarning(false);
        setPendingInsertText(null);
      }}
    />
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      {insertWarningModal}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Conversation Assistant</h2>
        {me && (
          <span className="text-xs text-muted-foreground">
            {credits ?? "—"} credit{credits === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {loadError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
          {loadError}
        </div>
      )}

      <div className="space-y-1.5">
        <Button disabled={reading} onClick={readConversation}>
          {reading ? "Reading…" : conversation ? "Re-read this conversation" : "Read this conversation"}
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Open the conversation on LinkedIn first, then click this every time you come back to reply.
        </p>
        {readError && <p className="text-xs text-destructive">{readError}</p>}
      </div>

      {conversation && (
        <>
          <div className="space-y-1 rounded-md border border-input p-3 text-sm">
            <p className="font-medium">{conversation.contact.name || "Unknown contact"}</p>
            {conversation.contact.headline && (
              <p className="text-xs text-muted-foreground">{conversation.contact.headline}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {conversation.thread.length === 0
                ? "No messages yet — the next message will be an opener."
                : `${conversation.thread.length} message${conversation.thread.length === 1 ? "" : "s"} read`}
            </p>
          </div>

          {conversation.thread.length > 0 && (
            <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-md border border-dashed border-input p-2">
              {conversation.thread.map((entry, i) => (
                <p key={i} className="text-xs">
                  <span className="font-medium text-muted-foreground">
                    {entry.sender === "me" ? "You: " : entry.sender === "them" ? "Them: " : "? "}
                  </span>
                  {entry.text}
                </p>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              What&apos;s the reason for this conversation?
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={choice === "profile" ? "default" : "outline"} onClick={() => handleChoiceChange("profile")}>
                Saved reason
              </Button>
              <Button size="sm" variant={choice === "custom" ? "default" : "outline"} onClick={() => handleChoiceChange("custom")}>
                Write my own
              </Button>
              <Button size="sm" variant={choice === "flow" ? "default" : "outline"} onClick={() => handleChoiceChange("flow")}>
                Just continue
              </Button>
            </div>
            {choice === "flow" && (
              <p className="text-[11px] text-muted-foreground">
                No reason needed — reads the conversation so far and continues it naturally.
              </p>
            )}

            {choice === "profile" && (
              <div className="space-y-1.5">
                <select
                  className="w-full rounded-md border border-input bg-background p-2 text-sm"
                  value={profileId}
                  onChange={(e) => handleProfileChange(e.target.value)}
                >
                  {recommendedProfiles.length > 0 && (
                    <optgroup label="Recommended by CarouseLabs">
                      {recommendedProfiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {systemProfiles.length > 0 && (
                    <optgroup label="Built-in">
                      {systemProfiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {customProfiles.length > 0 && (
                    <optgroup label="Your profiles">
                      {customProfiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <Button size="sm" variant="outline" onClick={onCreateProfile}>
                  + Create custom profile
                </Button>
              </div>
            )}

            {choice === "custom" && (
              <div className="space-y-1.5">
                <textarea
                  className="w-full resize-none rounded-md border border-input bg-background p-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  rows={3}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value.slice(0, MAX_MESSAGE_PURPOSE_CHARS))}
                  onBlur={handlePurposeBlur}
                  placeholder="e.g. A potential client — understand their situation before proposing anything"
                />
                <span className="text-[11px] text-muted-foreground">
                  {purpose.length}/{MAX_MESSAGE_PURPOSE_CHARS}
                </span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Tone{choice === "profile" ? " (optional override)" : ""}
              </label>
              <select
                className="w-full rounded-md border border-input bg-background p-2 text-sm"
                value={tone}
                onChange={(e) => handleToneChange(e.target.value)}
              >
                {choice === "profile" && <option value="">Use the profile&apos;s own tone</option>}
                {tone && !(MESSAGE_TONES as readonly string[]).includes(tone) && (
                  <option value={tone}>{tone}</option>
                )}
                {MESSAGE_TONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Anything specific for this message?</label>
            <textarea
              className="w-full resize-none rounded-md border border-input bg-background p-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              rows={2}
              value={extraInstruction}
              onChange={(e) => setExtraInstruction(e.target.value.slice(0, 500))}
              placeholder="Optional — e.g. mention I saw their post about hiring"
            />
          </div>

          {outOfCredits && (
            <p className="text-xs text-destructive">You&apos;re out of credits.</p>
          )}

          <Button disabled={!canGenerate || generating || outOfCredits} onClick={handleGenerate}>
            {generating ? "Generating…" : isOpener ? "Generate opener" : "Generate reply"}
          </Button>

          {generateError && <p className="text-xs text-destructive">{generateError}</p>}

          {message && (
            <div ref={outputRef} className="space-y-2">
              <textarea
                className="w-full resize-none rounded-md border border-input bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? "Copied" : "Copy"}
                </Button>
                {showInsert && (
                  <Button size="sm" variant="outline" disabled={inserting} onClick={handleInsertClick}>
                    {inserting ? "Inserting…" : "Insert"}
                  </Button>
                )}
              </div>
              {insertError && <p className="text-xs text-destructive">{insertError}</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
