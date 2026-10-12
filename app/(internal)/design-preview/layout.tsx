import type { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Design preview",
  robots: { index: false, follow: false },
}

// Development-only. The route group is not access control: this check runs
// on the server before anything renders, so production answers 404. The
// page repeats it in case the layout is ever bypassed.
export default function DesignPreviewLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV !== "development") notFound()
  return children
}
