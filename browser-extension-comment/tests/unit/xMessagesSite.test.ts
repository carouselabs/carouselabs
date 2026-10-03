// The Messages screen in the X build (src/sidepanel/messagesSite.ts): an X
// chat becomes the screen's conversation with a per-person key the server's
// saved-reasons table accepts, and Insert is aimed at that chat and person.
import { afterAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  (import.meta.env as Record<string, string>).VITE_ENGAGE_PLATFORM = "x";
});

import { MESSAGES_SITE } from "@/sidepanel/messagesSite";
import { X_INSERT_CHAT_MESSAGE_TYPE, X_READ_CHAT_MESSAGE_TYPE } from "@/x/lib/xPost";
import { isContactUrl } from "../../../lib/extensionPreferences";

afterAll(() => {
  delete (import.meta.env as Record<string, string | undefined>).VITE_ENGAGE_PLATFORM;
});

const CHAT = {
  contact: { name: "Sam Lee", handle: "Sam_Lee", profileUrl: "https://x.com/Sam_Lee" },
  threadPath: "/i/chat/1234-5678",
  thread: [{ sender: "them" as const, text: "What are you working on?" }],
};

describe("Messages on X", () => {
  it("reads X chats and writes through the X route", () => {
    expect(MESSAGES_SITE.readMessage).toEqual({ type: X_READ_CHAT_MESSAGE_TYPE });
    expect(MESSAGES_SITE.endpoint).toBe("/api/ext/x/message");
    expect(MESSAGES_SITE.reportFeature).toBe("x_messages");
  });

  it("keys the person so their saved reason is stored on the server", () => {
    const conversation = MESSAGES_SITE.toConversation(CHAT)!;
    expect(conversation.contact).toEqual({ name: "Sam Lee", headline: "@Sam_Lee", profileUrl: "/x/sam_lee" });
    expect(isContactUrl(conversation.contact.profileUrl)).toBe(true);
  });

  it("sends the handle, and aims Insert at that chat and person", () => {
    const conversation = MESSAGES_SITE.toConversation(CHAT)!;
    expect(MESSAGES_SITE.contactBody(conversation)).toEqual({ name: "Sam Lee", handle: "Sam_Lee" });
    expect(MESSAGES_SITE.insertMessage("Hi", conversation)).toEqual({
      type: X_INSERT_CHAT_MESSAGE_TYPE,
      text: "Hi",
      expect: { threadPath: "/i/chat/1234-5678", handle: "Sam_Lee" },
    });
  });
});
