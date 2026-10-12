"use client"

// Catches anything that breaks while rendering an Engage admin page, so a bad
// answer or a bug shows this instead of a blank screen. The rest of the admin
// keeps working around it.
import { useEffect } from "react"
import { AlertTriangle, RotateCw } from "lucide-react"
import { AdminButton } from "@/components/admin/ui"

export default function EngageError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("[engage admin] page crashed:", error)
  }, [error])

  return (
    <div role="alert" className="mx-auto mt-16 flex max-w-md flex-col items-center gap-3 text-center">
      <AlertTriangle className="h-6 w-6 text-amber-300" aria-hidden />
      <h1 className="text-[16px] font-semibold text-white">This page hit a problem</h1>
      <p className="text-[12.5px] leading-relaxed text-[#B0B0B0]">
        Nothing was changed. Try again; if it keeps happening, the error reference below helps find it in the logs.
      </p>
      {error.digest && <code className="rounded bg-[#1A1A1A] px-2 py-1 font-mono text-[11.5px] text-[#8A8A8A]">{error.digest}</code>}
      <AdminButton onClick={retry}>
        <RotateCw className="h-3.5 w-3.5" aria-hidden />
        Try again
      </AdminButton>
    </div>
  )
}
