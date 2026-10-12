"use client"

import { useState } from "react"
import { CheckCircle2, XCircle, ExternalLink, ShieldCheck } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { controlClasses } from "@/components/ui/input"

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
        {/* Screen-reader name only; the visible copy is unchanged. */}
        <label htmlFor="certificate-code" className="sr-only">
          Verification code
        </label>
        <input
          id="certificate-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleVerify()
          }}
          placeholder="CL-2026-A7X9"
          autoComplete="off"
          spellCheck={false}
          className={cn(controlClasses, "h-12 flex-1 px-4 font-medium tracking-wide placeholder:font-normal")}
        />
        <Button size="lg" onClick={() => void handleVerify()} disabled={!code.trim()} pending={loading} pendingLabel="Verifying">
          <ShieldCheck aria-hidden />
          Verify
        </Button>
      </div>

      <div aria-live="polite" className="contents">
        {error && (
          <div role="alert" className="rounded-control border border-[color-mix(in_oklab,var(--danger),transparent_70%)] bg-danger-soft px-4 py-3 text-label text-danger">
            {error}
          </div>
        )}

        {result && result.found && (
          <div className="flex flex-col gap-4 rounded-card border border-[color-mix(in_oklab,var(--success),transparent_70%)] bg-success-soft p-6">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="size-5 shrink-0 text-success" strokeWidth={2} aria-hidden />
              <p className="text-body font-semibold text-success">This is a genuine CarouseLabs certificate</p>
            </div>
            <dl className="flex flex-col gap-3 border-t border-[color-mix(in_oklab,var(--success),transparent_75%)] pt-4">
              <div className="flex flex-col gap-0.5">
                <dt className="text-caption text-muted-foreground">Name</dt>
                <dd className="text-body font-semibold">{result.internName}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-caption text-muted-foreground">Issued For</dt>
                <dd className="text-label">{result.issuedFor}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-caption text-muted-foreground">Issued Date</dt>
                <dd className="text-label tabular-nums">{result.issuedDate ? fmtDate(result.issuedDate) : "—"}</dd>
              </div>
            </dl>
            {result.certificateUrl && (
              <a href={result.certificateUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ className: "self-start" })}>
                View Certificate
                <ExternalLink aria-hidden />
              </a>
            )}
          </div>
        )}

        {result && !result.found && (
          <div className="flex items-start gap-2.5 rounded-card border border-border bg-surface-muted/60 p-5">
            <XCircle className="mt-0.5 size-5 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
            <p className="text-body">No certificate found with this code. Please check and try again.</p>
          </div>
        )}
      </div>
    </div>
  )
}
