// What the Messages screen does differently on each site: the LinkedIn
// extension reads LinkedIn conversations; CarouseLabs Engage for X reads X
// chats (src/x/content/xChat.ts). Same screen, same reasons (MessageProfile),
// same steps; these are the only differences.
import { PLATFORM } from "@/lib/platform";
import { READ_CONVERSATION_MESSAGE_TYPE, type CapturedConversation } from "@/lib/messageThread";
import { X_INSERT_CHAT_MESSAGE_TYPE, X_READ_CHAT_MESSAGE_TYPE } from "@/x/lib/xPost";
import type { XConversation } from "@/x/content/xChat";

export interface MessagesSite {
  // Panel → page: read the open conversation.
  readMessage: { type: string };
  // The page's answer, as the screen works with it.
  toConversation(raw: unknown): CapturedConversation | null;
  // Panel → page: put this text in that conversation's box.
  insertMessage(text: string, conversation: CapturedConversation): Record<string, unknown>;
  // The server route, and the contact as it takes it.
  endpoint: string;
  contactBody(conversation: CapturedConversation): Record<string, unknown>;
  reportFeature: "messages" | "x_messages";
  words: {
    description: string;
    openFirst: string;
    openInTab: string;
    openToInsert: string;
    insertFailed: string;
  };
}

const LINKEDIN: MessagesSite = {
  readMessage: { type: READ_CONVERSATION_MESSAGE_TYPE },
  toConversation: (raw) => (raw as CapturedConversation | undefined) ?? null,
  insertMessage: (text, conversation) => ({
    // Must match INSERT_MESSAGE_TYPE in src/content-script.ts exactly.
    type: "carouselabs:insert-comment",
    text,
    mode: "message",
    // The content script refuses unless this conversation is still the one
    // open, so text written for one person can't land in another's box.
    expect: { threadPath: conversation.threadPath, contactName: conversation.contact.name },
  }),
  endpoint: "/api/ext/message",
  contactBody: (conversation) => ({ name: conversation.contact.name, headline: conversation.contact.headline }),
  reportFeature: "messages",
  words: {
    description: "Write the next message in a LinkedIn conversation.",
    openFirst: "Open a conversation on LinkedIn",
    openInTab: "Open a LinkedIn conversation in the active tab first.",
    openToInsert: "Open the LinkedIn conversation in the active tab, then try again.",
    insertFailed: "Couldn't insert into LinkedIn. Try Copy instead.",
  },
};

// An X handle, stored as "/x/<handle>" in the same per-person table as
// LinkedIn's "/in/<slug>" keys (saved reasons, tone).
const handleOf = (conversation: CapturedConversation) => conversation.contact.headline.replace(/^@/, "");

const X: MessagesSite = {
  readMessage: { type: X_READ_CHAT_MESSAGE_TYPE },
  toConversation: (raw) => {
    const x = raw as XConversation | undefined;
    if (!x) return null;
    return {
      contact: {
        name: x.contact.name,
        headline: x.contact.handle ? `@${x.contact.handle}` : "",
        profileUrl: x.contact.handle ? `/x/${x.contact.handle.toLowerCase()}` : "",
      },
      threadPath: x.threadPath,
      thread: x.thread,
      capturedAt: Date.now(),
    };
  },
  insertMessage: (text, conversation) => ({
    type: X_INSERT_CHAT_MESSAGE_TYPE,
    text,
    expect: { threadPath: conversation.threadPath, handle: handleOf(conversation) || undefined },
  }),
  endpoint: "/api/ext/x/message",
  contactBody: (conversation) => ({ name: conversation.contact.name, handle: handleOf(conversation) }),
  reportFeature: "x_messages",
  words: {
    description: "Write the next message in an X chat.",
    openFirst: "Open a chat on X",
    openInTab: "Open a chat on X in the active tab first.",
    openToInsert: "Open the chat on X in the active tab, then try again.",
    insertFailed: "Couldn't insert into X. Try Copy instead.",
  },
};

export const MESSAGES_SITE: MessagesSite = PLATFORM === "x" ? X : LINKEDIN;
