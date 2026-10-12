// components/generate/HookVariations.tsx
"use client"

import { Zap } from "lucide-react"

interface HookVariationsProps {
  hooks: string[]
  onSelect: (hook: string) => void
}

export function HookVariations({ hooks, onSelect }: HookVariationsProps) {
  if (!hooks.length) return null

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-caption font-medium text-muted-foreground">Alternative Hooks</p>
      <div className="flex flex-col gap-2">
        {hooks.map((hook, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(hook)}
            className="group flex items-start gap-3 rounded-control border border-border bg-surface px-3.5 py-3 text-left transition-colors duration-(--motion-fast) hover:border-brand/50 hover:bg-surface-raised"
          >
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-detail bg-brand-soft text-brand">
              <Zap className="size-3" strokeWidth={2.5} aria-hidden />
            </span>
            <span className="text-label text-foreground">{hook}</span>
          </button>
        ))}
      </div>
      <p className="text-caption text-muted-foreground">Click to replace the opening line of your caption</p>
    </div>
  )
}
