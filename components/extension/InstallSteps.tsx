// components/extension/InstallSteps.tsx — how to install one of the Engage
// extensions and start using it, on its overview page. Open until the
// extension is signed in on a browser, then folded away as "Install on
// another browser" (a <details>, so it works without any script).
import type { ReactNode } from "react"
import { ChevronDown, ExternalLink } from "lucide-react"
import type { ExtAccessSummary } from "@/lib/extAccess"
import type { EngagePlatform } from "@/lib/engage/features"
import { ENGAGE_EXTENSIONS, EngageIcon } from "./engageExtensions"

const link = "font-semibold text-[#7C3AED] hover:underline"

export function InstallSteps({
  platform,
  email,
  ext,
  signedInBrowsers,
}: {
  platform: EngagePlatform
  email: string
  ext: ExtAccessSummary
  signedInBrowsers: number
}) {
  const info = ENGAGE_EXTENSIONS[platform]
  const installed = signedInBrowsers > 0
  const paid = ext.access === "unlimited"
  const freeLeft = Math.max(0, ext.freeLimit - ext.freeUsed)

  const steps: { title: string; body: ReactNode }[] = [
    {
      title: "Add it to your browser",
      body: (
        <>
          <p>
            Open <strong className="font-semibold text-[#0A0A0A]">{info.storeName}</strong> in the Chrome Web Store
            and click <strong className="font-semibold text-[#0A0A0A]">Add to Chrome</strong>.
            {platform === "x" && " It's a separate extension from the LinkedIn one."}
          </p>
          {info.storeUrl && (
            <a
              href={info.storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={[
                "mt-1 inline-flex w-fit items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold text-white transition-colors",
                platform === "x" ? "bg-[#000000] hover:bg-[#1F1F1F]" : "bg-[#7C3AED] hover:bg-[#6D28D9]",
              ].join(" ")}
            >
              Open in Chrome Web Store
              <ExternalLink size={13} />
            </a>
          )}
          <p className="text-[12px] text-[#9CA3AF]">
            On a computer, in Chrome, Edge, Brave, Opera, Vivaldi or Arc. In Edge, click &ldquo;Allow extensions from
            other stores&rdquo; if it asks.
          </p>
        </>
      ),
    },
    {
      title: "Pin it to your toolbar",
      body: (
        <p>
          Click the puzzle-piece icon next to the address bar, then the pin next to {info.storeName}. Its icon{" "}
          <span className="inline-block align-[-3px]">
            <EngageIcon platform={platform} size={16} />
          </span>{" "}
          stays in your toolbar.
        </p>
      ),
    },
    {
      title: "Sign in",
      body: (
        <p>
          Go to{" "}
          <a href={info.siteUrl} target="_blank" rel="noopener noreferrer" className={link}>
            {info.site}
          </a>
          , click the icon to open the extension&apos;s panel, and click Sign in. Use this account,{" "}
          <strong className="font-semibold text-[#0A0A0A] break-words">{email}</strong>
          {paid ? ": that's what unlocks your plan." : "."}
        </p>
      ),
    },
    {
      title: "Start writing",
      body:
        platform === "x" ? (
          <p>
            Click Reply under a post, or open a chat in Messages, and the panel writes it in your voice. You review
            it and post it yourself.
          </p>
        ) : (
          <p>
            Click Comment, Reply or Connect on LinkedIn, or open a conversation, and the panel writes it in your
            voice. You review it and post it yourself.
          </p>
        ),
    },
  ]

  return (
    <details open={!installed} className="group rounded-2xl border border-[#E5E3DE] bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl p-5 outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/50 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-3">
          <EngageIcon platform={platform} size={36} />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-[#0A0A0A]">
              {installed ? "Install on another browser" : `Install ${info.name}`}
            </span>
            <span className="text-[12.5px] text-[#6B7280]">
              {installed
                ? `Signed in on ${signedInBrowsers} ${signedInBrowsers === 1 ? "browser" : "browsers"}.`
                : "Four steps, about a minute."}
            </span>
          </span>
        </span>
        <ChevronDown size={16} className="flex-shrink-0 text-[#9CA3AF] transition-transform group-open:rotate-180" />
      </summary>

      <div className="flex flex-col gap-4 border-t border-[#F0EEE9] px-5 pb-5 pt-4">
        {!installed && paid && (
          <p className="rounded-xl bg-[#F0FDF4] px-4 py-3 text-[12.5px] leading-[1.6] text-[#166534]">
            Your {info.name} plan is active. Install it and sign in with {email}, and it&apos;s unlimited straight
            away.
          </p>
        )}
        {!installed && ext.access === "free" && freeLeft > 0 && (
          <p className="rounded-xl bg-[#F9F7F2] px-4 py-3 text-[12.5px] leading-[1.6] text-[#374151]">
            You have {freeLeft} free {freeLeft === 1 ? "generation" : "generations"} to try it, no card needed.
          </p>
        )}
        <ol className="flex flex-col gap-4">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#F4F2EC] text-[12px] font-bold tabular-nums text-[#0A0A0A]">
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-col gap-1.5 text-[13px] leading-[1.6] text-[#374151]">
                <h3 className="text-[13.5px] font-semibold text-[#0A0A0A]">{step.title}</h3>
                {step.body}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </details>
  )
}
