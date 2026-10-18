// The painted art every email uses (public/images/email/). Plain data with no
// React, so lib/broadcastRender.ts and the asset build can read it too.
//
// Each email opens with a hero: a gouache still life (made with gpt-image-2)
// with its headline set into the image in Fraunces, the accent in italics.
// The same words are the image's alt text, so they show when images are off.
// Change a headline here and the hero image must be rebuilt to match.
export const EMAIL_HEROES = {
  welcome: { lead: "Welcome to", accent: "CarouseLabs." },
  ready: { lead: "Your studio is", accent: "ready." },
  "first-post": { lead: "Your first post.", accent: "The first of many." },
  upgraded: { lead: "More room", accent: "to create." },
  "credits-low": { lead: "Running low", accent: "on credits." },
  "credits-out": { lead: "Out of credits.", accent: "Never out of ideas." },
  "credits-added": { lead: "Your extra credits", accent: "are in." },
  reset: { lead: "New month.", accent: "Full credits." },
  renewal: { lead: "Your plan renews", accent: "in three days." },
  cancelled: { lead: "Your plan ends.", accent: "Your work stays." },
  "post-failed": { lead: "One post", accent: "didn't go out." },
  "post-live": { lead: "Your post", accent: "is live." },
  weekly: { lead: "Your week,", accent: "in review." },
  "engage-invite": { lead: "You made the cut.", accent: "Engage is on us." },
  "intern-welcome": { lead: "Welcome to", accent: "the team." },
  "intern-note": { lead: "A note from", accent: "the team." },
  "support-reply": { lead: "We've", accent: "replied." },
  attendance: { lead: "A note on", accent: "attendance." },
  daily: { lead: "Today,", accent: "wrapped up." },
  performance: { lead: "Your week", accent: "on the board." },
  digest: { lead: "Your interns,", accent: "this week." },
  "support-message": { lead: "New support", accent: "message." },
  contact: { lead: "Someone", accent: "reached out." },
  broadcast: { lead: "News from", accent: "CarouseLabs." },
} as const satisfies Record<string, { lead: string; accent: string }>

export type EmailHero = keyof typeof EMAIL_HEROES

export const heroAlt = (hero: EmailHero) => `${EMAIL_HEROES[hero].lead} ${EMAIL_HEROES[hero].accent}`

// Painted die-cut stickers that mark feature rows (sticker-<id>.png).
export type EmailSticker =
  | "idea"
  | "caption"
  | "image"
  | "carousel"
  | "publish"
  | "voice"
  | "comment"
  | "note"
  | "chat"
  | "shield"
