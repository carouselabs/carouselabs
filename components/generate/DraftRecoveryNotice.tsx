"use client"

export function DraftRecoveryNotice({ onRestore }: { onRestore: () => void }) {
  return (
    <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <p>A separate browser draft is available. The saved version takes priority when its revision has changed.</p>
      <p className="mt-1">Restore the browser copy to review it. Your server draft changes only when you save.</p>
      <button type="button" onClick={onRestore} className="mt-3 rounded-lg border border-amber-500 px-3 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2">
        Restore browser copy
      </button>
    </div>
  )
}
