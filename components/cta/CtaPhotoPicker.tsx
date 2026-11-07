"use client"

// The creator's photo for every CTA ("this is me"): upload one, or copy the
// one on their LinkedIn connection or Start Page.
import { useRef, useState } from "react"
import { Loader2, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { MyCtaApi } from "./useMyCta"

export function CtaPhotoPicker({ api, compact = false }: { api: MyCtaApi; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const data = api.data
  if (!data) return null

  async function run(work: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await work()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't change your photo")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-4">
        <span className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted ${compact ? "size-14" : "size-20"}`}>
          {data.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- the creator's own uploaded photo
            <img src={data.photoUrl} alt="Your CTA photo" className="size-full object-cover" />
          ) : (
            <UserRound className="size-7 text-muted-foreground" aria-hidden />
          )}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="size-5 animate-spin text-white motion-reduce:animate-none" aria-hidden />
            </span>
          )}
        </span>
        <div className="flex min-w-0 flex-col gap-2">
          {!compact && <span className="text-label font-medium text-foreground">{data.photoUrl ? "This is you on every CTA" : "Add a photo of you"}</span>}
          <div className="flex flex-wrap gap-2">
            <Button size="xs" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
              {data.photoUrl ? "Change photo" : "Upload photo"}
            </Button>
            {data.photoSources.linkedin && (
              <Button size="xs" variant="outline" disabled={busy} onClick={() => void run(() => api.importPhoto("linkedin"))}>
                Use my LinkedIn photo
              </Button>
            )}
            {data.photoSources.startPage && (
              <Button size="xs" variant="outline" disabled={busy} onClick={() => void run(() => api.importPhoto("startPage"))}>
                Use my Start Page photo
              </Button>
            )}
            {data.photoUrl && !compact && (
              <Button size="xs" variant="ghost" disabled={busy} onClick={() => void run(() => api.removePhoto())}>
                Remove
              </Button>
            )}
          </div>
        </div>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Upload a photo of you"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ""
            if (file) void run(() => api.uploadPhoto(file))
          }}
        />
      </div>
      {error && (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      )}
      {!compact && <p className="text-caption text-muted-foreground">A clear, front-facing photo works best. The AI keeps your face as it is in the photo.</p>}
    </div>
  )
}
