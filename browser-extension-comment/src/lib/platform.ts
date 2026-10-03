// Which extension this build is. The same code builds two extensions:
// "CarouseLabs Engage" for LinkedIn (vite.config.ts) and "CarouseLabs Engage
// for X" (vite.x.config.ts, which sets VITE_ENGAGE_PLATFORM=x). Shared parts
// (sign-in, account, plan, history, the panel's design) read these instead of
// hard-coding LinkedIn. Tests run as the LinkedIn build unless they set it.
export type EngagePlatform = "linkedin" | "x";

export const PLATFORM: EngagePlatform = import.meta.env.VITE_ENGAGE_PLATFORM === "x" ? "x" : "linkedin";

export const PRODUCT_NAME = PLATFORM === "x" ? "CarouseLabs Engage for X" : "CarouseLabs Engage";

// The site the extension works on, as the start of its tabs' addresses.
export const SITE_ORIGIN = PLATFORM === "x" ? "https://x.com/" : "https://www.linkedin.com/";
export const SITE_NAME = PLATFORM === "x" ? "X" : "LinkedIn";

// Sign-in: the website's hand-off page sends the new token under this name,
// and only this extension's relay listens for it, so with both extensions
// installed neither picks up the other's token. The LinkedIn name is the one
// every installed copy already uses, so it can't change.
export const TOKEN_MESSAGE_TYPE =
  PLATFORM === "x" ? "carouselabs:x-extension-token" : "carouselabs:extension-token";

// The hand-off page, told which extension is asking.
export const CONNECT_PATH = PLATFORM === "x" ? "/extension-connect?for=x" : "/extension-connect";
