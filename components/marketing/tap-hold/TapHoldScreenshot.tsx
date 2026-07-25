import Image from "next/image"

type TapHoldScreenshotProps = {
  label: string
  caption: string
}

/** Product screenshot used throughout the /tap-hold articles. */
export function TapHoldScreenshot({ label, caption }: TapHoldScreenshotProps) {
  return (
    <figure className="max-w-[720px] mx-auto flex flex-col items-center gap-3">
      <div className="w-full rounded-2xl overflow-hidden border border-[#E5E3DE] shadow-[0_24px_60px_rgba(10,10,10,0.14)] bg-[#FFFDF8]">
        <Image
          src="/images/carouselabstool.png"
          alt={`CarouseLabs Tap & Hold Image Maker — ${label}`}
          width={1915}
          height={937}
          sizes="(max-width: 720px) 100vw, 720px"
          className="w-full h-auto"
        />
      </div>
      <figcaption className="text-[13px] text-[#6B7280] text-center">{caption}</figcaption>
    </figure>
  )
}
