// What the X content script (src/x/content-script.ts) hands the X panel when
// Reply is clicked on a post, and the message names between them. Plain data
// only: it goes through chrome.storage and runtime messages.

export interface XCapturedPostItem {
  author: string;
  // Without the "@".
  handle: string;
  text: string;
  // The post's own https://x.com/<handle>/status/<id> address, or "".
  url: string;
  // What else it carries: "image", "video", "gif", "poll", "link".
  media: string[];
}

export interface XCapturedPost {
  // When it was captured; also tells a new click from the same one twice.
  capturedAt: number;
  // The post being replied to.
  post: XCapturedPostItem;
  // Posts above it in the conversation, oldest first.
  thread: XCapturedPostItem[];
  // A post it quotes, if any.
  quoted: XCapturedPostItem | null;
  // Whether the signed-in X account wrote the post (null when unknown).
  isOwnPost: boolean | null;
}

// The last captured post, kept in chrome.storage.local so the panel finds it
// even if it was closed when Reply was clicked.
export const X_LAST_POST_STORAGE_KEY = "lastXReplyTarget";

// Panel → page: put this text in the open reply box.
export const X_INSERT_MESSAGE_TYPE = "carouselabs:x-insert";

// Panel → page: read the open chat (only when the person clicks Read).
export const X_READ_CHAT_MESSAGE_TYPE = "carouselabs:x-read-chat";
// Panel → page: put this text in the open chat's message box.
export const X_INSERT_CHAT_MESSAGE_TYPE = "carouselabs:x-insert-chat";
