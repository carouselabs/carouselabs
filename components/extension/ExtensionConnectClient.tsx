"use client"

// components/extension/ExtensionConnectClient.tsx — renders only once
// app/extension-connect/page.tsx has an active Clerk session (see that
// route's comment). Calls the token exchange from a real same-origin fetch
// (real cookies, no copy-pasting) and hands the token to the extension via
// window.postMessage — never a URL/query string, so it never ends up in
// browser history or a server log. browser-extension-comment/'s content
// script (src/content/authRelay.ts, injected only into this exact page —
// see manifest.config.ts's content_scripts) is the only listener for this
// message; it relays it into the extension via chrome.runtime.sendMessage.
import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { parseEngagePlatform, type EngagePlatform } from "@/lib/engage/features"

// Must match TOKEN_MESSAGE_TYPE in browser-extension-comment/src/lib/platform.ts
// for each extension. The X extension opens this page with ?for=x and listens
// only for its own name, so with both installed neither picks up the other's
// token. The LinkedIn name is what every installed copy already listens for.
const MESSAGE_TYPES: Record<EngagePlatform, string> = {
  linkedin: "carouselabs:extension-token",
  x: "carouselabs:x-extension-token",
}
const PRODUCT_NAMES: Record<EngagePlatform, string> = { linkedin: "CarouseLabs Engage", x: "CarouseLabs Engage for X" }

type Client = EngagePlatform

function clientFromUrl(): Client {
  return parseEngagePlatform(new URLSearchParams(window.location.search).get("for"))
}

type Status = "connecting" | "connected" | "error"

export function ExtensionConnectClient() {
  const [status, setStatus] = useState<Status>("connecting")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [client, setClient] = useState<Client>("linkedin")

  useEffect(() => {
    let cancelled = false

    async function exchange() {
      const asking = clientFromUrl()
      setClient(asking)
      try {
        const res = await fetch("/api/ext/auth/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device: navigator.userAgent.slice(0, 200), client: asking }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}) as { error?: string })
          throw new Error(body.error ?? `Request failed (${res.status})`)
        }
        const { token } = (await res.json()) as { token: string }
        if (cancelled) return

        console.log(
          "[ExtensionConnectClient] posting token to self, origin:",
          window.location.origin,
          "token received",
        )
        window.postMessage({ type: MESSAGE_TYPES[asking], token }, window.location.origin)
        setStatus("connected")
      } catch (err) {
        if (cancelled) return
        setErrorMessage(err instanceof Error ? err.message : "Something went wrong")
        setStatus("error")
      }
    }

    exchange()
    return () => {
      cancelled = true
    }
  }, [])

  // Presentation only below — the exchange and postMessage logic above is
  // unchanged. One card, the state announced politely to screen readers.
  return (
    <div className="w-full max-w-form rounded-showcase border border-border bg-surface p-8 text-center shadow-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.png" alt="CarouseLabs" className="mx-auto size-10" />
      <div role="status" aria-live="polite" className="mt-6 flex flex-col items-center gap-3">
        {status === "connecting" && (
          <>
            <Loader2 className="size-6 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden />
            <p className="text-body text-muted-foreground">Connecting your {PRODUCT_NAMES[client]} extension…</p>
          </>
        )}
        {status === "error" && (
          <>
            <AlertCircle className="size-6 text-danger" aria-hidden />
            <p className="text-body font-medium text-danger">Couldn&apos;t connect the extension: {errorMessage}</p>
            <p className="text-label text-muted-foreground">Close this tab and try again from the extension.</p>
          </>
        )}
        {/* The extension's background script closes this tab automatically once it
            receives the relayed message — this is a fallback in case that doesn't
            fire (e.g. the extension isn't installed, or the relay is blocked). */}
        {status === "connected" && (
          <>
            <CheckCircle2 className="size-6 text-success" aria-hidden />
            <p className="text-body-lg font-semibold">Extension connected.</p>
            <p className="text-label text-muted-foreground">You can close this tab now.</p>
          </>
        )}
      </div>
    </div>
  )
}
