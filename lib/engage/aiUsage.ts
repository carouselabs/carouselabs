// lib/engage/aiUsage.ts — records each AI model call the extensions make
// (lib/ai/commentModel.ts) for admin → Engage → AI. Never awaited by the
// request and never fails it: before scripts/engage-admin-phase-c.sql has
// run, or if the write fails, the call simply isn't recorded.
import { db } from "@/lib/db"
import { featureOfUsageKind, type EngageUsageKind } from "@/lib/engage/features"
import { isEngageSchemaMissing } from "@/lib/engage/schemaMissing"

export type AiOutcome = "ok" | "refused" | "empty" | "error" | "timeout" | "cancelled"

export interface AiAttempt {
  model: string
  fallback: boolean
  streamed: boolean
  outcome: AiOutcome
  inputTokens: number | null
  outputTokens: number | null
  firstTokenMs: number | null
  ms: number
}

export interface AiCaller {
  userId: string
  kind: EngageUsageKind
}

let warnedMissing = false

export function recordAiCall(caller: AiCaller, route: string, attempt: AiAttempt): void {
  try {
    write(caller, route, attempt)
  } catch (err) {
    // Even a mistake that throws before the write starts stays out of the
    // request: an unrecorded call is the worst that can happen here.
    console.error("[engage/ai-usage] couldn't record an AI call:", err)
  }
}

function write(caller: AiCaller, route: string, attempt: AiAttempt): void {
  const whole = (n: number | null) => (n === null || !Number.isFinite(n) ? null : Math.max(0, Math.round(n)))
  db.engageAiCall
    .create({
      data: {
        userId: caller.userId,
        kind: caller.kind,
        feature: featureOfUsageKind(caller.kind),
        route,
        model: attempt.model,
        fallback: attempt.fallback,
        streamed: attempt.streamed,
        outcome: attempt.outcome,
        inputTokens: whole(attempt.inputTokens),
        outputTokens: whole(attempt.outputTokens),
        firstTokenMs: whole(attempt.firstTokenMs),
        ms: whole(attempt.ms) ?? 0,
      },
    })
    .catch((err: unknown) => {
      if (!isEngageSchemaMissing(err)) console.error("[engage/ai-usage] couldn't record an AI call:", err)
      else if (!warnedMissing) {
        warnedMissing = true
        console.warn("[engage/ai-usage] EngageAiCall missing — run scripts/engage-admin-phase-c.sql. AI calls aren't recorded.")
      }
    })
}
