import { Clock } from "lucide-react"
import type { TapHoldTutorialStep } from "@/app/(marketing)/tap-hold/types"

const STEP_TIME = ["30 sec", "15 sec", "1-2 min", "30 sec", "10 sec", "20 sec"]

type TapHoldTutorialStepsProps = {
  steps: TapHoldTutorialStep[]
}

/** Renders the required "How to Create This with CarouseLabs" 6-step workflow. */
export function TapHoldTutorialSteps({ steps }: TapHoldTutorialStepsProps) {
  return (
    <ol className="flex flex-col gap-6">
      {steps.map((step, i) => (
        <li
          key={i}
          className="flex flex-col gap-4 p-7 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8]"
        >
          <div className="flex items-start gap-5">
            <span className="shrink-0 w-12 h-12 rounded-2xl bg-[#7C3AED] text-white text-[19px] font-extrabold flex items-center justify-center shadow-[0_8px_20px_rgba(124,58,237,0.25)]">
              {i + 1}
            </span>
            <div className="flex-1 flex flex-col gap-3 pt-1">
              <h3 className="text-[19px] font-bold leading-snug tracking-[-0.015em] text-[#0A0A0A]">
                {step.title}
              </h3>
              <p className="text-[15px] leading-[1.7] text-[#3F3F46]">{step.description}</p>
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F0EEE8] text-[12px] font-semibold text-[#6B7280]">
                  <Clock size={12} strokeWidth={2.4} />
                  {STEP_TIME[i] ?? "quick"}
                </span>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
