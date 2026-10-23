"use client"

// The browsers one extension is signed in on, with a remote Sign out — for
// a lost laptop, or a shared computer left signed in. The route lists both
// extensions' sign-ins; the newer extensions' are labelled (DEVICE_PREFIXES).
import { useEffect, useState } from "react"
import { Loader2, Monitor } from "lucide-react"
import { deviceName, tokenPlatform, PLATFORM_LABELS, type EngagePlatform } from "@/lib/engage/features"
import { dateTime, errorMessage, extApi, type ExtDevice } from "./api"

export function DevicesList({ platform = "linkedin" }: { platform?: EngagePlatform } = {}) {
  const [devices, setDevices] = useState<ExtDevice[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    extApi<{ devices: ExtDevice[] }>("/api/ext/devices")
      .then((res) => setDevices(res.devices.filter((d) => tokenPlatform(d.device) === platform)))
      .catch((err) => setError(errorMessage(err)))
  }, [platform])

  async function signOut(id: string) {
    setRemoving(id)
    setError(null)
    try {
      await extApi(`/api/ext/devices/${id}`, { method: "DELETE" })
      setDevices((list) => list?.filter((d) => d.id !== id) ?? null)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setRemoving(null)
    }
  }

  if (!devices && !error) {
    return <p className="text-caption text-muted-foreground">Loading…</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-caption text-danger">{error}</p>}
      {devices?.length === 0 && (
        <p className="text-caption text-muted-foreground">
          Not signed in on any browser yet. Open the extension&apos;s panel on {PLATFORM_LABELS[platform]}{" "}
          and click Sign in.
        </p>
      )}
      {devices?.map((d) => (
        <div
          key={d.id}
          className="flex items-center justify-between gap-3 rounded-control border border-border bg-surface px-4 py-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Monitor size={16} className="flex-shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate text-label font-medium text-foreground">{deviceName(d.device) || "Chrome"}</p>
              <p className="text-caption text-muted-foreground">
                Last used {dateTime(d.lastUsedAt)} · signed in {dateTime(d.createdAt)}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={removing === d.id}
            onClick={() => signOut(d.id)}
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-control-sm border border-border bg-surface-raised px-3 py-1.5 text-caption font-semibold text-foreground hover:border-danger/40 hover:text-danger disabled:opacity-50"
          >
            {removing === d.id && <Loader2 size={12} className="animate-spin" />}
            Sign out
          </button>
        </div>
      ))}
    </div>
  )
}
