import { notFound } from "next/navigation"

import { fontVariables } from "@/lib/fonts"
import { DesignPreview } from "./_components/DesignPreview"

export default async function DesignPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string }>
}) {
  if (process.env.NODE_ENV !== "development") notFound()
  const { theme } = await searchParams
  return (
    <div className={fontVariables}>
      <DesignPreview initialTheme={theme === "dark" ? "dark" : "light"} />
    </div>
  )
}
