import { ImageIcon } from "lucide-react"

type TapHoldScreenshotProps = {
  label: string
  caption: string
}

/**
 * Placeholder for a real product screenshot, to be swapped in later.
 * Keeps a fixed aspect ratio so layout doesn't shift once images are added.
 */
export function TapHoldScreenshot({ label, caption }: TapHoldScreenshotProps) {
  return (
    <figure className="max-w-[720px] mx-auto flex flex-col items-center gap-3">
      <div className="w-full aspect-video rounded-2xl border-2 border-dashed border-[#D8D0E0] bg-[#FBFAF6] flex flex-col items-center justify-center gap-2">
        <ImageIcon size={28} strokeWidth={1.6} className="text-[#C4B5FD]" />
        <span className="text-[13px] font-semibold text-[#9CA3AF]">
          Screenshot placeholder: {label}
        </span>
      </div>
      <figcaption className="text-[13px] text-[#6B7280] text-center">{caption}</figcaption>
    </figure>
  )
}
