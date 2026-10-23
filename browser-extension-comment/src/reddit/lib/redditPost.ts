// What the Reddit content script (src/reddit/content-script.ts) hands the
// Reddit panel when Reply is clicked, and the message names between them.
// Plain data only: it goes through chrome.storage and runtime messages. The
// server takes the same shape (lib/redditComment.ts).

export interface RedditCapturedItem {
  // The Reddit username, without "u/" ("" when deleted).
  author: string;
  text: string;
  // Its own https://www.reddit.com/r/... address, or "".
  url: string;
}

export interface RedditCapturedPost extends RedditCapturedItem {
  title: string;
  flair: string;
  // "text", "link", "image", "video", "gallery", "poll", "crosspost".
  kind: string;
}

export interface RedditCapturedTarget {
  // When it was captured; also tells a new click from the same one twice.
  capturedAt: number;
  // "r/startups".
  subreddit: string;
  // The subreddit's rules, as its sidebar lists them.
  rules: { title: string; text: string }[];
  post: RedditCapturedPost;
  // The post's id ("t3_…"), so Insert finds the box for this post.
  postId: string;
  // The comment being replied to, or null for a comment on the post itself.
  replyTo: RedditCapturedItem | null;
  // Its id ("t1_…"): Insert uses only the reply box for this comment.
  replyToId: string | null;
  // The comments above replyTo in its thread, top-level first.
  chain: RedditCapturedItem[];
  // The post's top comments, when commenting on the post itself.
  others: RedditCapturedItem[];
  // Whether the signed-in account wrote the post (null when unknown).
  isOwnPost: boolean | null;
}

// The last captured target, kept in chrome.storage.local so the panel finds
// it even if it was closed when Reply was clicked.
export const REDDIT_LAST_TARGET_STORAGE_KEY = "lastRedditTarget";

// Panel → page: put this text in the box for the captured post or comment.
export const REDDIT_INSERT_MESSAGE_TYPE = "carouselabs:reddit-insert";
