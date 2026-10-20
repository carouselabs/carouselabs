// lib/emailDesignRender.ts
// Turns an AI-written email (lib/emailDesign.ts) into the HTML that's sent:
// rendered once through emails/DesignedEmail.tsx, then each person's
// {{variables}} filled in (HTML-escaped, so a name can't break the email).
// Sending goes through Resend's batch endpoint like every broadcast.
import { render } from "@react-email/render"
import type { Resend } from "resend"
import { DesignedEmail } from "@/emails/DesignedEmail"
import { EMAIL_COLORS } from "@/emails/theme"
import { applyVariables, type VariableValues } from "@/lib/broadcastRender"
import { resolveVariablesMany } from "@/lib/broadcastVariables"
import { sendInBatches, type BatchSendResult } from "@/lib/emailBatchSend"
import type { EmailDesign } from "@/lib/emailDesign"

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;")
}

// Shown in the admin's preview where a picture isn't painted yet.
function svgDataUri(svg: string) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`
}

function heroPlaceholder(lead: string, accent: string) {
  const c = EMAIL_COLORS
  return svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
<rect width="1200" height="720" fill="${c.panel}"/>
<circle cx="1010" cy="380" r="170" fill="${c.violetSoft}"/>
<text x="88" y="330" font-family="Georgia, serif" font-size="80" fill="${c.ink}">${escapeHtml(lead)}</text>
<text x="88" y="420" font-family="Georgia, serif" font-style="italic" font-size="80" fill="#5B21B6">${escapeHtml(accent)}</text>
<text x="88" y="640" font-family="Arial, sans-serif" font-size="30" fill="${c.muted}">Picture not painted yet</text>
</svg>`)
}

const STICKER_PLACEHOLDER = svgDataUri(
  `<svg xmlns="http://www.w3.org/2000/svg" width="108" height="108" viewBox="0 0 108 108"><circle cx="54" cy="54" r="46" fill="${EMAIL_COLORS.violetSoft}" stroke="${EMAIL_COLORS.violet}" stroke-width="3" stroke-dasharray="8 8"/></svg>`,
)

/** The email's HTML with {{variables}} still in it. `preview` shows placeholders for unpainted art. */
export async function renderDesignedEmail(design: EmailDesign, { preview = false } = {}): Promise<string> {
  return render(
    DesignedEmail({
      design,
      placeholders: preview ? { hero: heroPlaceholder(design.hero.lead, design.hero.accent), sticker: STICKER_PLACEHOLDER } : undefined,
    }),
  )
}

/**
 * One person's copy: their {{variables}} filled into the subject (as text)
 * and the HTML (escaped). Someone with no account (a typed-in address) is
 * greeted as "there"; any other field is left as written.
 */
export function personalizeDesignedEmail(
  html: string,
  subject: string,
  values: Partial<VariableValues> | undefined,
): { subject: string; html: string } {
  const all: Partial<VariableValues> = values ?? { firstName: "there" }
  const escaped = Object.fromEntries(Object.entries(all).map(([k, v]) => [k, escapeHtml(String(v))])) as Partial<VariableValues>
  return { subject: applyVariables(subject, all), html: applyVariables(html, escaped) }
}

/** Sends the designed email to each person, personalized, in batches of 100. */
export async function sendDesignedEmails(
  resend: Resend,
  from: string,
  recipients: { userId: string | null; email: string }[],
  design: EmailDesign,
  idempotencyPrefix: string,
): Promise<BatchSendResult> {
  const html = await renderDesignedEmail(design)
  return sendInBatches(
    resend,
    from,
    recipients,
    async (batch) => {
      const variables = await resolveVariablesMany(batch.flatMap((r) => (r.userId ? [r.userId] : [])))
      return batch.map((r) => {
        const copy = personalizeDesignedEmail(html, design.subject, r.userId ? variables.get(r.userId) : undefined)
        return { to: r.email, subject: copy.subject, html: copy.html }
      })
    },
    { idempotencyPrefix },
  )
}
