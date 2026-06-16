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
      <p className="text-[11px] font-medium text-[#ADA99F] uppercase tracking-widest">
        Alternative Hooks
      </p>
      <div className="flex flex-col gap-2">
        {hooks.map((hook, i) => (
          <button
            key={i}
            onClick={() => onSelect(hook)}
            className="group flex items-start gap-3 px-4 py-3 rounded-xl border border-[#E9E7E1] bg-[#F6F4EE] hover:border-[rgba(26,26,26,0.35)] hover:bg-[rgba(26,26,26,0.06)] text-left transition-all duration-150"
          >
            <div className="flex-shrink-0 w-5 h-5 rounded-md bg-[rgba(26,26,26,0.1)] border border-[rgba(26,26,26,0.2)] flex items-center justify-center mt-0.5 group-hover:bg-[rgba(26,26,26,0.18)] transition-colors">
              <Zap size={10} className="text-[#1A1A1A]" strokeWidth={2.5} />
            </div>
            <p className="text-[13px] text-[#4B5563] leading-[1.45] group-hover:text-[#1A1A1A] transition-colors">
              {hook}
            </p>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-[#D6D3CC]">
        Click to replace the opening line of your caption
      </p>
    </div>
  )
}
