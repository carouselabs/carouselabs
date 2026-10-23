// Which extension this build is. The same code builds each extension:
// "CarouseLabs Engage" for LinkedIn (vite.config.ts), "CarouseLabs Engage for
// X" (vite.x.config.ts, which sets VITE_ENGAGE_PLATFORM=x) and "CarouseLabs
// Engage for Reddit" (vite.reddit.config.ts, VITE_ENGAGE_PLATFORM=reddit). Shared parts
// (sign-in, account, plan, history, the panel's design) read these instead of
// hard-coding LinkedIn. Tests run as the LinkedIn build unless they set it.
//
// Everything that differs per extension is in SITES, one entry each, so
// adding an extension fails to compile until it has all of them.
export type EngagePlatform = "linkedin" | "x" | "reddit";

interface Site {
  productName: string;
  // The site the extension works on, as the start of its tabs' addresses.
  origin: string;
  name: string;
  // Sign-in: the website's hand-off page sends the new token under this name,
  // and only this extension's relay listens for it, so with several
  // extensions installed none picks up another's token. The LinkedIn name is
  // the one every installed copy already uses, so it can't change.
  tokenMessageType: string;
  // The hand-off page, told which extension is asking.
  connectPath: string;
  // This extension's own pages on the website: its overview here, its tabs
  // below it (/agents, /history, ...).
  websitePath: string;
  // The toolbar badge's colour: CarouseLabs purple, X's black, Reddit's orange.
  badgeColor: string;
  // What an error about the site as a whole is filed under.
  mainFeature: "comments" | "x_replies" | "reddit_comments";
}

const SITES: Record<EngagePlatform, Site> = {
  linkedin: {
    productName: "CarouseLabs Engage",
    origin: "https://www.linkedin.com/",
    name: "LinkedIn",
    tokenMessageType: "carouselabs:extension-token",
    connectPath: "/extension-connect",
    websitePath: "/extension",
    badgeColor: "#7C3AED",
    mainFeature: "comments",
  },
  x: {
    productName: "CarouseLabs Engage for X",
    origin: "https://x.com/",
    name: "X",
    tokenMessageType: "carouselabs:x-extension-token",
    connectPath: "/extension-connect?for=x",
    websitePath: "/extension/x",
    badgeColor: "#000000",
    mainFeature: "x_replies",
  },
  reddit: {
    productName: "CarouseLabs Engage for Reddit",
    origin: "https://www.reddit.com/",
    name: "Reddit",
    tokenMessageType: "carouselabs:reddit-extension-token",
    connectPath: "/extension-connect?for=reddit",
    websitePath: "/extension/reddit",
    badgeColor: "#C2410C",
    mainFeature: "reddit_comments",
  },
};

const built = import.meta.env.VITE_ENGAGE_PLATFORM;
export const PLATFORM: EngagePlatform =
  built && Object.prototype.hasOwnProperty.call(SITES, built) ? (built as EngagePlatform) : "linkedin";
const SITE = SITES[PLATFORM];

export const PRODUCT_NAME = SITE.productName;
export const SITE_ORIGIN = SITE.origin;
export const SITE_NAME = SITE.name;
export const TOKEN_MESSAGE_TYPE = SITE.tokenMessageType;
export const CONNECT_PATH = SITE.connectPath;
export const WEBSITE_PATH = SITE.websitePath;
export const BADGE_COLOR = SITE.badgeColor;
export const MAIN_FEATURE = SITE.mainFeature;

// Per-extension values kept next to the code that uses them, picked for this
// build: `forPlatform({ linkedin: …, x: … })`.
export function forPlatform<T>(values: Record<EngagePlatform, T>): T {
  return values[PLATFORM];
}
