import { notFound } from "next/navigation"

import { fontVariables } from "@/lib/fonts"
import { Prototype } from "../_proto/Prototype"
import { destinations } from "../_proto/nav"
import type { Screen } from "../_proto/Frame"

function parseScreen(raw: string | undefined): Screen {
  if (raw === "landing" || raw === "generate" || raw === "create") return raw
  if (raw?.startsWith("stub:") && raw.slice(5) in destinations) return raw as Screen
  return "generate"
}

export default async function DirectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ direction: string }>
  searchParams: Promise<{ screen?: string; device?: string; theme?: string }>
}) {
  if (process.env.NODE_ENV !== "development") notFound()
  const { direction } = await params
  if (direction !== "a" && direction !== "b") notFound()
  const { screen, device, theme } = await searchParams
  return (
    <div className={fontVariables}>
      <Prototype
        direction={direction}
        screen={parseScreen(screen)}
        device={device === "mobile" ? "mobile" : "desktop"}
        theme={theme === "dark" ? "dark" : "light"}
      />
    </div>
  )
}
