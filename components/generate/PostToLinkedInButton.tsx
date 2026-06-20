"use client"

import { useState } from "react"
import Link from "next/link"
import { Linkedin, Loader2, ExternalLink } from "lucide-react"

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
          <Linkedin size={13} strokeWidth={2.2} />
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
