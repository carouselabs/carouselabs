"use client"

export function DraftRecoveryNotice({ onRestore }: { onRestore: () => void }) {
  return (
    <div role="status" className="rounded-control border border-warning/30 bg-warning-soft p-4 text-label text-foreground">
      <p>A separate browser draft is available. The saved version takes priority when its revision has changed.</p>
      <p className="mt-1 text-muted-foreground">Restore the browser copy to review it. Your server draft changes only when you save.</p>
      <button
        type="button"
        onClick={onRestore}
        className="mt-3 inline-flex h-9 items-center rounded-control-sm border border-warning/50 bg-surface-raised px-3 font-medium text-foreground transition-colors duration-(--motion-fast) hover:bg-surface"
      >
        Restore browser copy
      </button>
    </div>
  )
}
