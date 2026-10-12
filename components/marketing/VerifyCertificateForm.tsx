"use client"

import { useState } from "react"
import { CheckCircle2, XCircle, ExternalLink, Loader2, ShieldCheck } from "lucide-react"

interface VerifyResult {
  found: boolean
  internName?: string
  issuedFor?: string
  issuedDate?: string
  certificateUrl?: string
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

export function VerifyCertificateForm() {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<VerifyResult | null>(null)

  async function handleVerify() {
    const trimmed = code.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/verify-certificate?code=${encodeURIComponent(trimmed)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.")
      setResult(data as VerifyResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleVerify()
          }}
          placeholder="CL-2026-A7X9"
          className="flex-1 px-4 py-3 rounded-xl border border-[#E5E3DE] bg-white text-[15px] font-medium tracking-wide text-[#0A0A0A] placeholder:text-[#C4C0B6] placeholder:font-normal focus:outline-none focus:border-[rgba(124,58,237,0.5)] transition-colors"
        />
        <button
          onClick={() => void handleVerify()}
          disabled={loading || !code.trim()}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_30px_rgba(124,58,237,0.2)] transition-colors"
        >
          {loading ? <Loader2 size={15} className="animate-spin" strokeWidth={2.2} /> : <ShieldCheck size={15} strokeWidth={2.2} />}
          Verify
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[13px] text-[rgba(239,68,68,0.9)]">
          {error}
        </div>
      )}

      {result && result.found && (
        <div className="flex flex-col gap-4 p-6 rounded-2xl border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.05)]">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={22} className="text-emerald-600 flex-shrink-0" strokeWidth={2} />
            <p className="text-[15px] font-semibold text-emerald-700">
              This is a genuine CarouseLabs certificate
            </p>
          </div>
          <div className="flex flex-col gap-2.5 pt-1 border-t border-[rgba(16,185,129,0.2)]">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium text-[#6B7280] uppercase tracking-widest">Name</span>
              <span className="text-[15px] font-semibold text-[#0A0A0A]">{result.internName}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium text-[#6B7280] uppercase tracking-widest">
                Issued For
              </span>
              <span className="text-[14px] text-[#374151]">{result.issuedFor}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium text-[#6B7280] uppercase tracking-widest">
                Issued Date
              </span>
              <span className="text-[14px] text-[#374151]">
                {result.issuedDate ? fmtDate(result.issuedDate) : "—"}
              </span>
            </div>
          </div>
          {result.certificateUrl && (
            <a
              href={result.certificateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 mt-1 px-4 py-2.5 rounded-lg text-[13px] font-semibold text-white bg-[#0A0A0A] hover:bg-[#1A1A1A] transition-colors"
            >
              View Certificate
              <ExternalLink size={13} strokeWidth={2.2} />
            </a>
          )}
        </div>
      )}

      {result && !result.found && (
        <div className="flex items-start gap-2.5 p-5 rounded-2xl border border-[#E5E3DE] bg-[#FBFAF6]">
          <XCircle size={20} className="text-[#9CA3AF] flex-shrink-0 mt-0.5" strokeWidth={2} />
          <p className="text-[14px] text-[#4B5563] leading-[1.6]">
            No certificate found with this code. Please check and try again.
          </p>
        </div>
      )}
    </div>
  )
}
