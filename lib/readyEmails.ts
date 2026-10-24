// lib/readyEmails.ts — ready-made emails (Admin → Broadcasts → Ready-made
// emails): fixed emails whose words and look are set here, not written with
// the AI writer. One is sent as a campaign like any other (pick the people,
// tick, send; seen and clicked tracked; a lead's copy gets its Unsubscribe
// link), from its own name at the campaign's address. The campaign keeps a
// copy of the email as it was made (a ReadyDesign in EmailCampaign.design),
// so changing one here never changes what a campaign already sends.
// No server-only imports: the admin's page shows them with this too.
import { z } from "zod"
import { EMAIL_IMAGES } from "@/emails/theme"

/** Where the button's reply link goes: filled in when sent, with the address replies go to. */
export const REPLY_LINK = "__REPLY_LINK__"

type Letter = ({ type: "p"; html: string } | { type: "code"; text: string })[]

export type ReadyEmail = {
  id: string
  // Shown in the admin: "Dharma Ramasamy · Email 1".
  name: string
  subject: string
  // The line inboxes show after the subject.
  preview: string
  // Who it's from: this name, at the campaign's address.
  fromName: string
  letter: Letter
}

// ── Dharma Ramasamy's outreach emails ───────────────────────────────────

const DHARMA = {
  name: "Dharma Ramasamy",
  title: "Identity Security &amp; SSO Specialist",
  detail: "26 Years of Experience &middot; Microsoft Entra ID",
  linkedin: "https://www.linkedin.com/in/dharma-ramasamy/",
  website: "https://dharmaramasamy.com",
  images: `${EMAIL_IMAGES}/dharma`,
  // The companies on DharmaRamasamy.com, each at the width that suits its shape.
  logos: [
    { file: "centene.png", name: "Centene Corporation", width: 80, height: 20 },
    { file: "mastercard.png", name: "Mastercard", width: 50, height: 31 },
    { file: "edward-jones.png", name: "Edward Jones", width: 84, height: 13 },
    { file: "anheuser-busch.png", name: "Anheuser-Busch", width: 76, height: 36 },
    { file: "att.png", name: "AT&amp;T", width: 74, height: 31 },
  ],
}

export const READY_EMAILS: ReadyEmail[] = [
  {
    id: "dharma-1",
    name: "Dharma Ramasamy · Email 1",
    subject: "App registrations in your Entra tenant",
    preview: "Do you know how many app registrations in your Entra tenant still have secrets valid for over a year?",
    fromName: DHARMA.name,
    letter: [
      { type: "p", html: "Hello {{firstName}}," },
      { type: "p", html: "Do you know how many app registrations in your Entra tenant still have secrets valid for over a year — including apps nobody owns anymore?" },
      { type: "p", html: "You can check with this PowerShell command using <code>Application.Read.All</code>:" },
      { type: "code", text: "Get-MgApplication -All | Where { $_.PasswordCredentials.EndDateTime -gt (Get-Date).AddYears(1) } | Measure-Object" },
      { type: "p", html: "The concern is that forgotten apps and long-lived secrets can remain active without anyone reviewing their access. That can leave security gaps hiding in plain sight." },
      { type: "p", html: "I assess these environments by reviewing application inventory, ownership, permissions, credential age, and what needs fixing first." },
      { type: "p", html: "Would a quick 20-minute conversation be useful?" },
    ],
  },
  {
    id: "dharma-2",
    name: "Dharma Ramasamy · Email 2",
    subject: "Quick question about your Entra tenant",
    preview: "If you asked your team today how many app registrations exist and who owns each one, how long would it take?",
    fromName: DHARMA.name,
    letter: [
      { type: "p", html: "Hello {{firstName}}," },
      { type: "p", html: "Quick question about your Entra tenant." },
      { type: "p", html: "If you asked your team today how many app registrations exist and who owns each one, how long would it take them to come back with an answer?" },
      { type: "p", html: "In most environments that question takes weeks, because nobody has looked since the apps were created. Meanwhile the secrets keep working and the permissions never change." },
      { type: "p", html: "I run fixed-scope assessments on exactly that — inventory, ownership, permission scope, credential age, and a prioritised fix list." },
      { type: "p", html: "Worth 20 minutes?" },
    ],
  },
]

export const readyEmailById = (id: string): ReadyEmail | null => READY_EMAILS.find((e) => e.id === id) ?? null

// ── The look (the template approved 2026-10-24) ─────────────────────────

const C = {
  frame: "#F3F4F6",
  yellow: "#FACC15",
  ink: "#1C1917",
  text: "#2E2E33",
  sub: "#3F3F46",
  code: "#F0F1F3",
  line: "#ECEDEF",
  label: "#8B9099",
  tile: "#EEEFF1",
}
const SANS = "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif"
const MONO = "Consolas, 'SFMono-Regular', Menlo, Monaco, 'Courier New', monospace"

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
const paragraph = (html: string, extra = "") => `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:${C.text};${extra}">${html}</p>`

function letterHtml(letter: Letter): string {
  return letter
    .map((part) =>
      part.type === "code"
        ? `<div style="margin:0 0 16px;padding:12px 14px;background-color:${C.code};border-radius:8px;font-size:13px;line-height:1.55;color:${C.sub};word-break:break-word">${esc(part.text)}</div>`
        : paragraph(part.html.replace(/<code>/g, `<code style="font-family:${MONO};font-size:12.5px;background-color:${C.code};border-radius:4px;padding:1px 5px;color:${C.text}">`)),
    )
    .join("\n")
}

function linkPill(href: string, icon: string, label: string, first: boolean): string {
  return `<tr><td style="padding:${first ? "0" : "8px"} 0 0 0"><a href="${href}" style="display:inline-block;padding:5px 12px 5px 5px;border:1px solid ${C.line};border-radius:999px;font-size:13px;line-height:18px;font-weight:600;color:${C.ink};text-decoration:none;white-space:nowrap"><img src="${icon}" width="18" height="18" alt="" style="display:inline-block;vertical-align:middle;width:18px;height:18px;border:0;border-radius:4px;margin-right:7px"><span style="vertical-align:middle">${label}</span></a></td></tr>`
}

/** The whole email, with {{firstName}} and the reply link still to fill in. */
export function readyEmailHtml(email: ReadyEmail): string {
  const d = DHARMA
  const tiles = d.logos
    .map(
      (l, i) => `<td style="padding:0 ${i < d.logos.length - 1 ? "6px" : "0"} 0 0;vertical-align:middle"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${C.tile};border-radius:12px;background-color:#FFFFFF"><tr><td align="center" class="tile" style="height:72px;padding:6px;vertical-align:middle"><img src="${d.images}/${l.file}" width="${l.width}" height="${l.height}" alt="${l.name}" style="display:block;margin:0 auto;width:${l.width}px;max-width:100%;height:auto;border:0"></td></tr></table></td>`,
    )
    .join("")
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>${esc(email.subject)}</title>
<style>@media (max-width:480px){ .frame{padding:4px !important} .photo{padding-left:12px !important} .head{padding-right:12px !important} .letter{padding-left:14px !important;padding-right:14px !important} .tile{height:52px !important;padding:4px !important} }</style>
</head>
<body style="margin:0;padding:16px 0;background-color:#FFFFFF">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(email.preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;background-color:${C.frame};border-radius:18px;font-family:${SANS}">
<tr><td class="frame" style="padding:8px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.yellow};border-radius:14px"><tr>
<td width="78" class="photo" style="padding:12px 0 12px 16px;vertical-align:middle"><img src="${d.images}/photo.gif" width="56" height="56" alt="${d.name}" style="display:block;width:56px;height:56px;border:2px solid #FFFFFF;border-radius:999px"></td>
<td class="head" style="padding:12px 16px 12px 4px;vertical-align:middle">
<p style="margin:0;font-size:17px;line-height:1.3;font-weight:600;color:${C.ink}">${d.name}</p>
<p style="margin:3px 0 0;font-size:13px;line-height:1.35;color:${C.sub}">${d.title}</p>
<p style="margin:3px 0 0;font-size:11.5px;line-height:1.35;color:${C.sub}">${d.detail}</p>
</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;background-color:#FFFFFF;border-radius:14px"><tr><td class="letter" style="padding:20px 22px 22px">
${letterHtml(email.letter)}
${paragraph(d.name, `font-weight:700;color:${C.ink};margin-bottom:10px`)}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px">
${linkPill(d.linkedin, `${d.images}/linkedin.png`, "LinkedIn", true)}
${linkPill(d.website, `${d.images}/website.png`, "DharmaRamasamy.com", false)}
</table>
<div style="height:2px;line-height:2px;font-size:0;background-color:${C.line};margin:0 0 16px">&nbsp;</div>
<p style="margin:0 0 10px;font-size:11px;line-height:1.4;letter-spacing:.02em;text-transform:uppercase;color:${C.label}">Professional experience</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed"><tr>${tiles}</tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px"><tr><td align="center" style="background-color:${C.yellow};border-radius:10px"><a href="${REPLY_LINK}" style="display:block;padding:14px 16px;font-size:15px;line-height:1.2;font-weight:600;color:${C.ink};text-decoration:none">Worth a quick chat?</a></td></tr></table>
</td></tr></table>
</td></tr></table>
</body></html>`
}

/** The email in plain words: the campaign's text, for lists and search. */
export function readyEmailText(email: ReadyEmail): string {
  const words = email.letter.map((part) => (part.type === "code" ? part.text : part.html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&")))
  return [...words, email.fromName].join("\n\n")
}

// ── What a campaign keeps ───────────────────────────────────────────────

export const readyDesignSchema = z.object({
  kind: z.literal("ready"),
  id: z.string().min(1).max(64),
  subject: z.string().min(1).max(300),
  fromName: z.string().min(1).max(100),
  html: z.string().min(1).max(200_000),
})
export type ReadyDesign = z.infer<typeof readyDesignSchema>

/** The copy a campaign keeps of a ready-made email. */
export function readySnapshot(email: ReadyEmail): ReadyDesign {
  return { kind: "ready", id: email.id, subject: email.subject, fromName: email.fromName, html: readyEmailHtml(email) }
}

/** A campaign's (or template's) ready-made email, or null for any other kind. */
export function readyDesignOf(stored: unknown): ReadyDesign | null {
  const parsed = readyDesignSchema.safeParse(stored)
  return parsed.success ? parsed.data : null
}

/** The admin's preview: an example first name where each person's goes. */
export function personalizePreview(html: string, firstName: string): string {
  return html.split("{{firstName}}").join(esc(firstName))
}

/** The button opens a reply to this address, with the subject filled in. */
export function withReplyLink(html: string, address: string, subject: string): string {
  const link = `mailto:${address}?subject=${encodeURIComponent(`Re: ${subject}`)}`
  return html.split(REPLY_LINK).join(esc(link))
}
