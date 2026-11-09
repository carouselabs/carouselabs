"use client"

// Which lead account the Leads page is showing (lib/leadAccounts.ts):
// LeadsManager sets it, and every part of the page asks the API for that
// account's leads, lists and Brevo with these helpers. CarouseLabs' needs no
// parameter (as before); another account's adds account=… to the address or
// the body.
import { createContext, useContext } from "react"
import { DEFAULT_ACCOUNT, type LeadAccount } from "@/lib/leadAccounts"

export const LeadAccountContext = createContext<LeadAccount>(DEFAULT_ACCOUNT)

export const useLeadAccount = () => useContext(LeadAccountContext)

/** "/api/admin/leads?only=lists" → "/api/admin/leads?only=lists&account=anant" for another account. */
export function withAccount(url: string, account: LeadAccount): string {
  if (account === DEFAULT_ACCOUNT) return url
  return `${url}${url.includes("?") ? "&" : "?"}account=${account}`
}

/** A POST body with the account in it (nothing added for CarouseLabs'). */
export function bodyWithAccount<T extends object>(body: T, account: LeadAccount): T & { account?: LeadAccount } {
  return account === DEFAULT_ACCOUNT ? body : { ...body, account }
}
