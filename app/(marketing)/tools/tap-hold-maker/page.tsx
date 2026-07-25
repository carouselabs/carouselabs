import type { Metadata } from "next"
import { TapHoldMaker } from "@/components/tools/TapHoldMaker"

export const metadata: Metadata = {
  title: "Free Tap & Hold Image Maker for X (Twitter) — CarouseLabs",
  description:
    "Create hidden 'tap and hold to reveal' images for X/Twitter for free. No login required. Upload, paint, and download in seconds.",
}

export default function TapHoldMakerPage() {
  return <TapHoldMaker />
}
