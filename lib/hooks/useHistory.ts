// lib/hooks/useHistory.ts
"use client"

import { useCallback } from "react"
import type { RawCategory } from "@/lib/ai/parsers/ideas"

export type HistoryStatus =
  | "BREAKDOWN"
  | "CAPTION"
  | "CAPTION_DONE"
  | "IMAGE"
  | "IMAGE_DONE"
  | "CAROUSEL"
  | "CAROUSEL_DONE"

export interface HistoryEntry {
  id: string
  ideaId: string
  status: HistoryStatus
  isPinned: boolean
  lastVisitedAt: string
  idea: {
    hook: string
    category: RawCategory
  }
  captionPreview: string | null
  hasDraft: boolean
}

// Maps a history status to the route the user should resume at — the core
// "take me exactly where I left off" logic. Intent and _DONE share a route.
export function continueHref(status: HistoryStatus, ideaId: string): string {
  switch (status) {
    case "CAPTION":
    case "CAPTION_DONE":
      return `/generate/caption?ideaId=${ideaId}`
    case "IMAGE":
    case "IMAGE_DONE":
      return `/generate/image?ideaId=${ideaId}`
    case "CAROUSEL":
    case "CAROUSEL_DONE":
      return `/generate/carousel?ideaId=${ideaId}`
    case "BREAKDOWN":
    default:
      return `/idea/${ideaId}`
  }
}

// Fire-and-forget: record (or advance) where the user is on a given idea.
// Safe to call from anywhere — failures are swallowed so tracking never
// blocks or breaks the actual generation flow.
export async function trackHistory(
  ideaId: string,
  status: HistoryStatus,
): Promise<void> {
  try {
    await fetch(`/api/history/${ideaId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
  } catch {
    // tracking is best-effort — never surface to the user
  }
}

export async function pinHistory(ideaId: string, isPinned: boolean): Promise<void> {
  await fetch(`/api/history/${ideaId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isPinned }),
  })
}

export async function deleteHistory(ideaId: string): Promise<void> {
  await fetch(`/api/history/${ideaId}`, { method: "DELETE" })
}

// Creates a fresh idea (copying hook/category + latest breakdown) and returns
// the new ideaId so the caller can start a brand-new session.
export async function duplicateIdea(ideaId: string): Promise<string> {
  const res = await fetch(`/api/ideas/${ideaId}/duplicate`, { method: "POST" })
  const data = await res.json()
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to duplicate")
  return (data as { ideaId: string }).ideaId
}

// Small convenience hook bundling the client actions for components.
export function useHistory() {
  return {
    trackHistory: useCallback(trackHistory, []),
    pinHistory: useCallback(pinHistory, []),
    deleteHistory: useCallback(deleteHistory, []),
    duplicateIdea: useCallback(duplicateIdea, []),
    continueHref,
  }
}
