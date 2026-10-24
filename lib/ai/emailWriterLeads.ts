// lib/ai/emailWriterLeads.ts — what the AI email writer (lib/ai/emailWriter.ts)
// is told about leads (lib/leads.ts): people who don't use CarouseLabs yet,
// whom the admin can send campaigns to, and the merge fields they have.
import { APP_URL } from "@/emails/theme"
import { AVAILABLE_VARIABLES } from "@/lib/broadcastRender"
import { LEAD_BASE_KEYS, mergeFieldsIn, type LeadColumn } from "@/lib/leadRules"
import type { EmailDesign } from "@/lib/emailDesign"

/** The prompt's LEADS section: nothing until the admin has saved some leads. */
export function leadsSection(leads: LeadColumn[] | null | undefined): string {
  if (!leads) return ""
  const columns = leads.length
    ? `, and their lists' columns: ${leads.map((c) => `{{${c.key}}} (${c.label})`).join(", ")}`
    : ""
  return `

LEADS
Besides CarouseLabs users, the admin can send campaigns to leads: people who have never used CarouseLabs and have no account. When the admin says the email is for leads, new people, or people who don't use CarouseLabs yet:
- Write to someone who doesn't know CarouseLabs: say in a sentence what it is and the one thing it does for them, then invite them to try it. Never mention an account, plan, credits or anything they've done in CarouseLabs.
- Their merge fields: {{firstName}} (it becomes "there" when a lead has no name), {{lastName}}, {{name}}, {{email}}${columns}. None of the account ones like {{plan}} or {{referralLink}}. Use a column only when the admin asks for it: a lead without that value gets a gap where it was.
- The button goes to ${APP_URL} (the home page) or ${APP_URL}/sign-up (create a free account).
For emails to CarouseLabs users, everything above holds as usual and lead columns don't exist.`
}

/** A merge field the draft uses that nobody has, said so the writer can fix it; or null. */
export function writerFieldProblem(design: EmailDesign, leads: LeadColumn[] | null | undefined): string | null {
  const known = new Set<string>([
    ...AVAILABLE_VARIABLES.map((v) => v.key),
    ...(leads ? [...LEAD_BASE_KEYS, ...leads.map((c) => c.key)] : []),
  ])
  const missing = mergeFieldsIn(JSON.stringify(design)).filter((k) => !known.has(k))
  if (missing.length === 0) return null
  return `The email uses ${missing.map((k) => `{{${k}}}`).join(", ")}, which no one has. Use only the merge fields listed. Answer again with the complete JSON only.`
}
