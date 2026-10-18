// The look every CarouseLabs email shares: where links and images point,
// colours and fonts. Plain constants with no React, so lib/broadcastRender.ts
// (which also runs in the admin's browser for the broadcast preview) can use
// them as well as the React templates.

// Email links must always point at the live site — never a dev URL. A localhost
// value (e.g. from .env.local) would ship broken links to real inboxes, so we
// ignore it and fall back to the production domain.
const ENV_APP_URL = process.env.NEXT_PUBLIC_APP_URL
export const APP_URL =
  ENV_APP_URL && !ENV_APP_URL.includes("localhost")
    ? ENV_APP_URL
    : "https://carouselabs.com"

// Intern-facing emails link here instead of APP_URL — employee.carouselabs.com
// is the subdomain interns use to reach their portal (see proxy.ts).
export const EMPLOYEE_URL = "https://employee.carouselabs.com"

// Admin-facing notification emails (e.g. a new Support message) link here —
// the admin subdomain, so the linked page opens directly in the admin panel.
export const ADMIN_URL = "https://admin.carouselabs.com"

// Logo, painted band, heroes and icons (public/images/email/), always loaded
// from the live site.
export const EMAIL_IMAGES = `${APP_URL}/images/email`

// The website's warm palette (app/globals.css light tokens).
export const EMAIL_COLORS = {
  page: "#F0ECE5",
  card: "#FFFDF9",
  panel: "#F4EFE7",
  line: "#DED8CD",
  ink: "#211F1C",
  body: "#57524B",
  muted: "#8A847A",
  violet: "#6D28D9",
  violetSoft: "#EEE8FA",
} as const

// Headings are Fraunces where the mail app loads web fonts (Apple Mail, iOS);
// Gmail and Outlook show Georgia, which is close in shape and width.
export const SERIF = "Fraunces, Georgia, 'Times New Roman', serif"
export const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
export const SERIF_FONT_URL =
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400&display=swap"
