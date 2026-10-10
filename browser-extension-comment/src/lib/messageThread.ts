// src/lib/messageThread.ts — shared by the content script (src/content/
// messageThread.ts) and the side panel for the LinkedIn Conversation Assistant.
// Both bundles import this module, so the storage keys and message types here
// have one definition instead of hand-synced literals.
//
// Unlike Comment/Reply/Connect, nothing about a LinkedIn conversation has a
// one-time "click that means start this" — a conversation just sits there,
// open or not. So this feature is read on demand: the user opens a
// conversation and clicks "Read this conversation" in the panel (the same
// pattern src/lib/connectionNote.ts uses for "Read my profile"), rather than
// being captured by a delegated click listener.

// Side panel → tab: read the currently-open conversation.
export const READ_CONVERSATION_MESSAGE_TYPE = "carouselabs:read-conversation";

// Per-contact memory of which profile/purpose this conversation is FOR, so the
// user doesn't re-explain "this is a lead" every time they come back to reply.
// Keyed by the contact's profile URL (stable across a conversation reopening,
// unlike LinkedIn's internal conversation id, which this extension has no
// reliable way to read yet) rather than one global setting.
export const CONTACT_CONTEXT_STORAGE_PREFIX = "messageContext:";

export const MAX_MESSAGE_PURPOSE_CHARS = 400;

export interface MessageThreadEntry {
  // "me" when the message's sender matches the signed-in user (see
  // getSelfName in src/content/replyThread.ts, reused here); "them" otherwise.
  // "unknown" only when neither could be determined — kept distinct so a
  // misattributed message doesn't silently read as the wrong speaker.
  sender: "me" | "them" | "unknown";
  text: string;
}

export interface ConversationContact {
  name: string;
  headline: string;
  // The contact's own profile URL when readable, used as the memory key.
  // Empty when unreadable — that conversation's context then can't be
  // remembered across a reopen, only for the current capture.
  profileUrl: string;
}

export interface CapturedConversation {
  contact: ConversationContact;
  // Reading order, oldest first.
  thread: MessageThreadEntry[];
  capturedAt: number;
  // The /messaging/thread/<id>/ path this was read from. Insert sends it
  // back, and the content script refuses if a different thread is open by
  // then — text written for one person must never land in another's box.
  threadPath: string;
}

// What an Insert into a DM box must still match on the page.
export interface MessageInsertExpectation {
  threadPath: string;
  contactName: string;
}

// "flow" needs no saved profile and no typed reason: it tells the generator
// to just read the thread and continue it naturally — the zero-effort
// default for someone who doesn't want to categorize every conversation.
// Only makes real sense once there is a thread to read; with an empty
// thread it still generates, just a more generic opener than a stated
// reason would produce.
// "agent": one of the person's own AI agents (src/lib/agents.ts) writes.
export type MessageContextChoice = "profile" | "custom" | "flow" | "agent";

// Shared with MessageProfileForm's builder, so a saved profile and a one-off
// "write my own" purpose offer the same tone vocabulary rather than two
// separate, drifting lists. "Casual" alone was ambiguous — it could mean
// relaxed-but-plain or slangy — so those are split into their own options;
// each string is sent to the model as-is (see buildMessageSystemMessage's
// "- Tone: ${profile.tone}" line), so being descriptive here directly shapes
// the output rather than needing separate prompt-side handling per option.
export const MESSAGE_TONES = [
  "Natural",
  "Professional",
  "Casual, latest slang",
  "Simple, plain English",
  "Warm",
  "Direct",
] as const;

export interface MessageContextSetting {
  // Which saved MessageProfile (see src/lib/api.ts) applies to this contact,
  // a one-off typed reason, or "flow" (read the thread, continue naturally,
  // no stated reason at all).
  choice: MessageContextChoice;
  profileId: string;
  // choice "agent": which agent. Absent from settings saved before agents.
  agentId?: string;
  purpose: string;
  // A tone override. Meaningful for every choice, not just "custom": it can
  // also override a saved profile's own baked-in tone for one generation.
  // Empty string means "no override" — use the saved profile's tone as-is,
  // or MESSAGE_TONES[0] for "custom"/"flow" where there's no profile tone to
  // fall back to.
  tone: string;
}

function contactKey(profileUrl: string): string {
  return `${CONTACT_CONTEXT_STORAGE_PREFIX}${profileUrl}`;
}

// null means this contact has never had a purpose set, which is what
// triggers the first-time chooser for them specifically.
export async function loadMessageContext(profileUrl: string): Promise<MessageContextSetting | null> {
  if (!profileUrl) return null;
  const key = contactKey(profileUrl);
  const stored = (await chrome.storage.local.get(key))[key];
  if (!stored || typeof stored !== "object") return null;
  const { choice, profileId, agentId, purpose, tone } = stored as Partial<MessageContextSetting>;
  if (choice !== "profile" && choice !== "custom" && choice !== "flow" && choice !== "agent") return null;
  const storedTone = typeof tone === "string" ? tone : "";
  return {
    choice,
    profileId: typeof profileId === "string" ? profileId : "",
    // Only when an agent was set, so a setting without one reads as before.
    ...(typeof agentId === "string" && agentId ? { agentId } : {}),
    purpose: typeof purpose === "string" ? purpose : "",
    // Empty stays empty for "profile" and "agent" (means "use its own tone",
    // not "Natural"); custom/flow have no profile tone to defer to, so an
    // empty value there is filled in.
    tone: storedTone || (choice === "profile" || choice === "agent" ? "" : MESSAGE_TONES[0]),
  };
}

export function saveMessageContext(profileUrl: string, setting: MessageContextSetting): Promise<void> {
  if (!profileUrl) return Promise.resolve();
  return chrome.storage.local.set({
    [contactKey(profileUrl)]: {
      choice: setting.choice,
      profileId: setting.profileId,
      ...(setting.agentId ? { agentId: setting.agentId } : {}),
      purpose: setting.purpose.slice(0, MAX_MESSAGE_PURPOSE_CHARS),
      tone: setting.tone,
    },
  });
}
