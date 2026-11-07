"use client"

// Loading and changing My CTA from the browser (app/api/cta/*), shared by
// Settings → My CTA and the CTA step of the create flow.
import { useCallback, useEffect, useState } from "react"
import type { CtaCardData, CtaCardInput } from "@/lib/creatorCta"

export type MyCtaData = {
  ready: boolean
  photoUrl: string | null
  cards: CtaCardData[]
  photoSources: { linkedin: boolean; startPage: boolean }
  profile: { name: string; headline: string }
}

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Something went wrong")
  return data as T
}

const loadMyCta = async () => json<MyCtaData>(await fetch("/api/cta", { cache: "no-store" }))

export function useMyCta() {
  const [data, setData] = useState<MyCtaData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setData(await loadMyCta())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your CTA")
    }
  }, [])

  // Loaded once when the screen opens.
  useEffect(() => {
    let cancelled = false
    loadMyCta()
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Couldn't load your CTA"))
    return () => {
      cancelled = true
    }
  }, [])

  /** Saves a new CTA or changes one; returns it. */
  async function saveCard(input: CtaCardInput, id?: string): Promise<CtaCardData> {
    const { card } = await json<{ card: CtaCardData }>(
      await fetch(id ? `/api/cta/${encodeURIComponent(id)}` : "/api/cta", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    )
    await reload()
    return card
  }

  async function deleteCard(id: string) {
    await json(await fetch(`/api/cta/${encodeURIComponent(id)}`, { method: "DELETE" }))
    await reload()
  }

  async function uploadPhoto(file: File) {
    const form = new FormData()
    form.append("file", file, file.name)
    const { photoUrl } = await json<{ photoUrl: string }>(await fetch("/api/cta/photo", { method: "POST", body: form }))
    setData((d) => (d ? { ...d, photoUrl } : d))
  }

  async function importPhoto(source: "linkedin" | "startPage") {
    const { photoUrl } = await json<{ photoUrl: string }>(
      await fetch("/api/cta/photo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source }) }),
    )
    setData((d) => (d ? { ...d, photoUrl } : d))
  }

  async function removePhoto() {
    await json(await fetch("/api/cta/photo", { method: "DELETE" }))
    setData((d) => (d ? { ...d, photoUrl: null } : d))
  }

  async function suggest(about: string, name: string): Promise<string[]> {
    const { lines } = await json<{ lines: string[] }>(
      await fetch("/api/cta/suggest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ about, name }) }),
    )
    return lines
  }

  return { data, error, reload, saveCard, deleteCard, uploadPhoto, importPhoto, removePhoto, suggest }
}

export type MyCtaApi = ReturnType<typeof useMyCta>
