"use client"

// Settings > Extension — generate/revoke the API key browser-extension-ideas/
// uses to authenticate (it has no Clerk session cookie to send). See
// lib/extensionAuth.ts and prisma/schema.prisma's ExtensionApiKey comment.
import { useEffect, useState } from "react"
import { Copy, Check, Loader2, KeyRound, Trash2 } from "lucide-react"
import { SettingsTabs } from "@/components/settings/SettingsTabs"

interface KeyStatus {
  hasKey: boolean
  label?: string
  lastUsedAt?: string | null
  createdAt?: string
}

export default function ExtensionSettingsPage() {
  const [status, setStatus] = useState<KeyStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/settings/extension-key")
      const data = await res.json()
      if (res.ok) setStatus(data as KeyStatus)
    } catch {
      setError("Failed to load extension key status")
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    setCopied(false)
    try {
      const res = await fetch("/api/settings/extension-key", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to generate key")
      setNewKey((data as { key: string }).key)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setGenerating(false)
    }
  }

  async function handleRevoke() {
    setRevoking(true)
    setError(null)
    try {
      const res = await fetch("/api/settings/extension-key", { method: "DELETE" })
      if (!res.ok) throw new Error()
      setNewKey(null)
      await load()
    } catch {
      setError("Failed to revoke key")
    } finally {
      setRevoking(false)
    }
  }

  async function handleCopy() {
    if (!newKey) return
    try {
      await navigator.clipboard.writeText(newKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard access denied — the key is still visible to copy manually
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      <SettingsTabs />

      <div className="flex flex-col gap-3">
        <h2 className="text-[14px] font-semibold text-[#0A0A0A]">Ideas Board browser extension</h2>
        <p className="text-[13px] text-[#6B7280] leading-[1.5]">
          Right-click any image, link, or selected text on the web to save it to your{" "}
          <a href="/content-hub/ideas" className="text-[#7C3AED] underline">
            Ideas Board
          </a>
          . The extension needs a key from here to connect to your account.
        </p>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[13px] text-[rgba(239,68,68,0.9)]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="h-20 rounded-2xl bg-[#F6F4EE] border border-[#F1EFE9] animate-pulse" />
        ) : (
          <div className="rounded-2xl border border-[#E5E3DE] bg-white p-5 flex flex-col gap-4">
            {newKey ? (
              <div className="flex flex-col gap-2">
                <p className="text-[13px] font-medium text-[#0A0A0A]">
                  Copy this key now — it won&apos;t be shown again.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-[#F4F2EC] border border-[#E5E3DE] text-[12px] text-[#374151] truncate">
                    {newKey}
                  </code>
                  <button
                    onClick={() => void handleCopy()}
                    className="flex-shrink-0 p-2 rounded-lg border border-[#E5E3DE] bg-white hover:bg-[#F4F2EC] text-[#6B7280] transition-colors"
                    title="Copy"
                  >
                    {copied ? <Check size={14} className="text-[#10B981]" /> : <Copy size={14} />}
                  </button>
                </div>
                <p className="text-[11px] text-[#9CA3AF]">
                  Paste this into the extension&apos;s options page to connect it to your account.
                </p>
              </div>
            ) : status?.hasKey ? (
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-[rgba(16,185,129,0.1)] flex items-center justify-center flex-shrink-0">
                  <KeyRound size={16} className="text-[#10B981]" strokeWidth={2} />
                </span>
                <div className="flex flex-col">
                  <p className="text-[13px] font-medium text-[#0A0A0A]">A key is active</p>
                  <p className="text-[11px] text-[#9CA3AF]">
                    {status.lastUsedAt
                      ? `Last used ${new Date(status.lastUsedAt).toLocaleDateString()}`
                      : "Not used yet"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-[#F4F2EC] flex items-center justify-center flex-shrink-0">
                  <KeyRound size={16} className="text-[#9CA3AF]" strokeWidth={2} />
                </span>
                <p className="text-[13px] text-[#6B7280]">No key generated yet.</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => void handleGenerate()}
                disabled={generating}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[12.5px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 transition-colors"
              >
                {generating && <Loader2 size={13} className="animate-spin" />}
                {status?.hasKey ? "Regenerate Key" : "Generate Key"}
              </button>
              {status?.hasKey && (
                <button
                  onClick={() => void handleRevoke()}
                  disabled={revoking}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E5E3DE] bg-white hover:bg-[rgba(239,68,68,0.06)] hover:border-[rgba(239,68,68,0.3)] text-[12px] font-medium text-[#6B7280] hover:text-[rgba(239,68,68,0.9)] transition-colors disabled:opacity-50"
                >
                  {revoking ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  Revoke
                </button>
              )}
            </div>
            {status?.hasKey && !newKey && (
              <p className="text-[11px] text-[#9CA3AF]">
                Regenerating replaces the current key — the extension will need the new one to keep working.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
