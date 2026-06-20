"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, ExternalLink } from "lucide-react"

// lucide-react dropped brand logos, so inline the LinkedIn "in" mark.
function LinkedInIcon({ size = 13, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  )
}

interface PostToLinkedInButtonProps {
  caption: string
  imageUrls: string[]
  /** Disabled while the underlying content is still generating. */
  disabled?: boolean
}

// Self-contained button that posts the given caption + images to the user's
// connected LinkedIn account. Handles the "not connected" case by pointing the
// user to Settings, and shows a "View post" link on success.
export function PostToLinkedInButton({
  caption,
  imageUrls,
  disabled,
}: PostToLinkedInButtonProps) {
  const [posting, setPosting] = useState(false)
  const [postUrl, setPostUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notConnected, setNotConnected] = useState(false)

  async function handlePost() {
    setPosting(true)
    setError(null)
    setNotConnected(false)
    setPostUrl(null)
    try {
      const res = await fetch("/api/linkedin/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption, imageUrls }),
      })
      const data = (await res.json()) as { postUrl?: string; error?: string }

      // 400 "LinkedIn not connected" → nudge the user to Settings.
      if (res.status === 400 && /not connected/i.test(data.error ?? "")) {
        setNotConnected(true)
        return
      }
      if (!res.ok) throw new Error(data.error ?? "Failed to post to LinkedIn")

      setPostUrl(data.postUrl ?? "https://www.linkedin.com/feed/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setPosting(false)
    }
  }

  if (postUrl) {
    return (
      <a
        href={postUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-white bg-[#0A66C2] hover:bg-[#004182] transition-colors"
      >
        <ExternalLink size={13} strokeWidth={2.2} />
        Posted to LinkedIn! View post →
      </a>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={handlePost}
        disabled={posting || disabled}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-white bg-[#0A66C2] hover:bg-[#004182] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {posting ? (
          <Loader2 size={13} className="animate-spin" strokeWidth={2.2} />
        ) : (
          <LinkedInIcon size={13} />
        )}
        {posting ? "Posting…" : "Post to LinkedIn"}
      </button>

      {notConnected && (
        <p className="text-[11px] text-[#9CA3AF]">
          Connect your LinkedIn account in{" "}
          <Link href="/settings/account" className="text-[#0A66C2] underline">
            Settings
          </Link>{" "}
          first
        </p>
      )}

      {error && (
        <p className="text-[11px] text-[rgba(239,68,68,0.9)]">{error}</p>
      )}
    </div>
  )
}
