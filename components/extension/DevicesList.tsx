"use client"

// The browsers the extension is signed in on, with a remote Sign out — for
// a lost laptop, or a shared computer left signed in.
import { useEffect, useState } from "react"
import { Loader2, Monitor } from "lucide-react"
import { dateTime, errorMessage, extApi, type ExtDevice } from "./api"

export function DevicesList() {
  const [devices, setDevices] = useState<ExtDevice[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    extApi<{ devices: ExtDevice[] }>("/api/ext/devices")
      .then((res) => setDevices(res.devices))
      .catch((err) => setError(errorMessage(err)))
  }, [])

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
    return <p className="text-[12.5px] text-[#9CA3AF]">Loading…</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-[12.5px] text-[#DC2626]">{error}</p>}
      {devices?.length === 0 && (
        <p className="text-[12.5px] text-[#6B7280]">
          Not signed in on any browser yet. Open the extension&apos;s side panel on LinkedIn and click Sign in.
        </p>
      )}
      {devices?.map((d) => (
        <div
          key={d.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-[#E9E7E1] bg-[#FBFAF6] px-4 py-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Monitor size={16} className="flex-shrink-0 text-[#9CA3AF]" />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-[#0A0A0A]">{d.device || "Chrome"}</p>
              <p className="text-[11.5px] text-[#9CA3AF]">
                Last used {dateTime(d.lastUsedAt)} · signed in {dateTime(d.createdAt)}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={removing === d.id}
            onClick={() => signOut(d.id)}
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-[#E5E3DE] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#374151] hover:border-[#DC2626]/40 hover:text-[#DC2626] disabled:opacity-50"
          >
            {removing === d.id && <Loader2 size={12} className="animate-spin" />}
            Sign out
          </button>
        </div>
      ))}
    </div>
  )
}
