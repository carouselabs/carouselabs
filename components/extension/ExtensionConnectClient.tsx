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

// Must match MESSAGE_TYPE in both
// browser-extension-comment/src/content/authRelay.ts and
// browser-extension-comment/src/background.ts exactly — no shared package
// between this repo and the extension's, so it's a literal in all three
// places by necessity.
const MESSAGE_TYPE = "carouselabs:extension-token"

type Status = "connecting" | "connected" | "error"

export function ExtensionConnectClient() {
  const [status, setStatus] = useState<Status>("connecting")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function exchange() {
      try {
        const res = await fetch("/api/ext/auth/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device: navigator.userAgent.slice(0, 200) }),
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
          "token starts with:",
          token.slice(0, 8) + "…",
        )
        window.postMessage({ type: MESSAGE_TYPE, token }, window.location.origin)
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

  if (status === "connecting") {
    return <p className="text-sm text-white/70">Connecting your CarouseLabs Comment extension…</p>
  }

  if (status === "error") {
    return (
      <div className="text-center">
        <p className="text-sm text-red-400">Couldn&apos;t connect the extension: {errorMessage}</p>
        <p className="mt-2 text-xs text-white/50">Close this tab and try again from the extension.</p>
      </div>
    )
  }

  // The extension's background script closes this tab automatically once it
  // receives the relayed message — this is a fallback in case that doesn't
  // fire (e.g. the extension isn't installed, or the relay is blocked).
  return (
    <div className="text-center">
      <p className="text-sm font-medium text-white">Extension connected.</p>
      <p className="mt-1 text-xs text-white/50">You can close this tab now.</p>
    </div>
  )
}
