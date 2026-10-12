"use client"

// Engage → AI: what the AI costs and how it performs, from every AI call the
// extensions recorded (/api/admin/engage/ai): cost per day, per feature and
// per user, tokens, speed, backup use and failures; the model each feature
// tries first and the price per model; and what each feature sends the AI
// (/api/admin/engage/prompts, read-only).
import { useMemo, useState } from "react"
import Link from "next/link"
import { AdminLineChart } from "@/components/admin/charts"
import { AdminButton, AdminInput, AdminSelect, Modal } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import { Ledger } from "@/components/admin/Ledger"
import { AI_MODEL_KEYS, AI_MODELS, modelLabel, type AiModelKey, type ModelPrice } from "@/lib/ai/models"
import {
  FEATURE_LABELS,
  PLATFORM_FEATURES,
  PLATFORM_LABELS,
  type EngageFeature,
  type EngagePlatform,
} from "@/lib/engage/features"
import { RANGE_KEYS, RANGE_LABELS, type RangeKey } from "@/lib/engage/ranges"
import type { AiUsage } from "@/lib/engage/aiQueries"
import type { PromptSample } from "@/lib/engage/promptSamples"
import {
  CsvLink,
  EmptyState,
  ErrorState,
  Segmented,
  SkeletonBlock,
  Tabs,
  adminSend,
  fmtDollars,
  fmtNumber,
  useAdminApi,
  useStoredState,
} from "./shared"

interface AiState {
  usage: AiUsage
  models: Record<EngageFeature, AiModelKey>
  prices: Record<string, ModelPrice>
  settingsReady: boolean
}

type Tab = "usage" | "models" | "prompts"
type PlatformView = EngagePlatform | "all"
const PRESET_RANGES = RANGE_KEYS.filter((k) => k !== "custom") as Exclude<RangeKey, "custom">[]

const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—")
const secs = (ms: number | null | undefined) => (ms === null || ms === undefined ? "—" : `${(ms / 1000).toFixed(1)}s`)


const th = "whitespace-nowrap bg-surface-muted/60 px-3 py-2.5 font-medium"
const td = "px-3 py-2 tabular-nums"

type Dialog =
  | { kind: "model"; feature: EngageFeature; key: AiModelKey }
  | { kind: "price"; model: string; input: string; output: string }

export function EngageAi() {
  const { toast } = useToast()
  const [tab, setTab] = useStoredState<Tab>("engage-admin:ai-tab", "usage")
  const [range, setRange] = useStoredState<Exclude<RangeKey, "custom">>("engage-admin:ai-range", "30d")
  const [platform, setPlatform] = useStoredState<PlatformView>("engage-admin:ai-platform", "all")
  const rangeQuery = `range=${range}${platform === "all" ? "" : `&platform=${platform}`}`
  const url = `/api/admin/engage/ai?${rangeQuery}`
  const { data, error, loading, reload } = useAdminApi<AiState>(url)
  const prompts = useAdminApi<{ prompts: PromptSample[] }>(tab === "prompts" ? "/api/admin/engage/prompts" : null)
  const [saved, setSaved] = useState<Pick<AiState, "models" | "prices"> | null>(null)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)

  const models = saved?.models ?? data?.models
  const prices = saved?.prices ?? data?.prices
  const priceModels = useMemo(() => {
    const ids = new Set<string>(AI_MODEL_KEYS.map((k) => AI_MODELS[k].id))
    for (const id of Object.keys(prices ?? {})) ids.add(id)
    for (const r of data?.usage.byFeature ?? []) ids.add(r.model)
    return [...ids]
  }, [prices, data])

  async function submit(body: Record<string, unknown>, done: string) {
    setBusy(true)
    setDialogError(null)
    try {
      const res = await adminSend<Pick<AiState, "models" | "prices">>("/api/admin/engage/ai", "PATCH", {
        ...body,
        reason: reason.trim() || undefined,
      })
      setSaved({ models: res.models, prices: res.prices })
      setDialog(null)
      toast(done)
      reload()
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : "Couldn't save that")
    } finally {
      setBusy(false)
    }
  }

  function openDialog(next: Dialog) {
    setDialog(next)
    setReason("")
    setDialogError(null)
  }

  const priceValid = (v: string) => v.trim() !== "" && Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 1000
  const usage = data?.usage
  const t = usage?.totals

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lead font-semibold tracking-tight text-foreground">AI</h2>
          <p className="mt-0.5 text-caption text-muted-foreground">
            What the AI costs and how it performs, from every call the extensions make. Days are UTC.
          </p>
        </div>
        {tab === "usage" && (
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              label="Extension"
              options={[
                { value: "all", label: "All" },
                { value: "linkedin", label: PLATFORM_LABELS.linkedin },
                { value: "x", label: PLATFORM_LABELS.x },
              ]}
              value={platform}
              onChange={setPlatform}
            />
            <Segmented label="Date range" options={PRESET_RANGES.map((k) => ({ value: k, label: RANGE_LABELS[k] }))} value={range} onChange={setRange} />
            <CsvLink type="ai-users" query={rangeQuery} />
          </div>
        )}
      </div>

      <Tabs<Tab>
        label="AI sections"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "usage", label: "Usage and cost" },
          { value: "models", label: "Models and prices" },
          { value: "prompts", label: "Prompts" },
        ]}
      />

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data || loading ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading AI usage">
          <SkeletonBlock className="h-[78px]" />
          <SkeletonBlock className="h-[280px]" />
        </div>
      ) : tab === "usage" ? (
        <>
          {!usage!.recording && (
            <EmptyState
              title="AI calls aren't recorded yet"
              body="Run scripts/engage-admin-phase-c.sql in Supabase. From then on, every AI call the extensions make shows here."
            />
          )}
          <section aria-label="AI totals" className="border-y border-border py-6">
            <Ledger
              size="lg"
              className="grid-cols-2 sm:grid-cols-4 2xl:grid-cols-7"
              items={[
                { label: "AI cost", value: fmtDollars(t!.cost), hint: t!.unpricedModels.length > 0 ? `No price yet for ${t!.unpricedModels.map(modelLabel).join(", ")}` : "At the prices set" },
                { label: "AI calls", value: fmtNumber(t!.calls), hint: `${fmtNumber(t!.ok)} answered` },
                { label: "Tokens in", value: fmtNumber(t!.inputTokens) },
                { label: "Tokens out", value: fmtNumber(t!.outputTokens) },
                { label: "Average time", value: secs(t!.avgMs), hint: "Per call" },
                { label: "Backup used", value: pct(t!.fallback, t!.calls), hint: "Calls by the backup model" },
                { label: "Failed", value: pct(t!.failed, t!.calls), hint: "Errors and time-outs" },
              ]}
            />
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-card border border-border bg-surface p-4" aria-labelledby="ai-cost-trend">
              <h2 id="ai-cost-trend" className="mb-3 text-label font-semibold text-foreground">
                Cost per day ($)
              </h2>
              <AdminLineChart
                data={usage!.series.map((d) => ({ ...d, cost: Math.round(d.cost * 10000) / 10000 }))}
                xKey="date"
                height={220}
                decimals
                series={[{ key: "cost", label: "Cost ($)", color: "#8B5CF6" }]}
              />
            </section>
            <section className="rounded-card border border-border bg-surface p-4" aria-labelledby="ai-calls-trend">
              <h2 id="ai-calls-trend" className="mb-3 text-label font-semibold text-foreground">
                AI calls per day
              </h2>
              <AdminLineChart data={usage!.series.map((d) => ({ ...d }))} xKey="date" height={220} series={[{ key: "calls", label: "AI calls", color: "#0D9488" }]} />
            </section>
          </div>

          <section className="relative overflow-x-auto rounded-card border border-border bg-surface" aria-labelledby="ai-by-feature">
            <h2 id="ai-by-feature" className="border-b border-border px-4 py-3 text-label font-semibold text-foreground">
              By feature and model
            </h2>
            {usage!.byFeature.length === 0 ? (
              <p className="px-4 py-6 text-center text-caption text-muted-foreground">No AI calls in this range.</p>
            ) : (
              <table className="w-full text-caption">
                <thead>
                  <tr className="text-left text-caption text-muted-foreground">
                    <th className={th}>Feature</th>
                    <th className={th}>Model</th>
                    <th className={`${th} text-right`}>Calls</th>
                    <th className={`${th} text-right`}>Backup</th>
                    <th className={`${th} text-right`}>Failed</th>
                    <th className={`${th} text-right`}>Refused or empty</th>
                    <th className={`${th} text-right`}>Tokens in</th>
                    <th className={`${th} text-right`}>Tokens out</th>
                    <th className={`${th} text-right`}>Cost</th>
                    <th className={`${th} text-right`}>Average</th>
                    <th className={`${th} text-right`}>Slowest 5%</th>
                    <th className={`${th} text-right`}>First words</th>
                  </tr>
                </thead>
                <tbody className="text-foreground/90">
                  {usage!.byFeature.map((r) => (
                    <tr key={`${r.feature}:${r.model}`} className="border-t border-border">
                      <td className="px-3 py-2">{FEATURE_LABELS[r.feature] ?? r.feature}</td>
                      <td className="px-3 py-2">{modelLabel(r.model)}</td>
                      <td className={`${td} text-right`}>{fmtNumber(r.calls)}</td>
                      <td className={`${td} text-right`}>{fmtNumber(r.fallback)}</td>
                      <td className={`${td} text-right ${r.failed > 0 ? "text-danger" : ""}`}>{fmtNumber(r.failed)}</td>
                      <td className={`${td} text-right`}>{fmtNumber(r.refused)}</td>
                      <td className={`${td} text-right`}>{fmtNumber(r.inputTokens)}</td>
                      <td className={`${td} text-right`}>{fmtNumber(r.outputTokens)}</td>
                      <td className={`${td} text-right`}>{r.cost === null ? <span className="text-muted-foreground">no price</span> : fmtDollars(r.cost)}</td>
                      <td className={`${td} text-right`}>{secs(r.avgMs)}</td>
                      <td className={`${td} text-right`}>{secs(r.p95Ms)}</td>
                      <td className={`${td} text-right`}>{secs(r.avgFirstTokenMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="relative overflow-x-auto rounded-card border border-border bg-surface" aria-labelledby="ai-top-users">
            <h2 id="ai-top-users" className="border-b border-border px-4 py-3 text-label font-semibold text-foreground">
              Who costs the most
            </h2>
            {usage!.topUsers.length === 0 ? (
              <p className="px-4 py-6 text-center text-caption text-muted-foreground">No AI calls in this range.</p>
            ) : (
              <table className="w-full text-caption">
                <thead>
                  <tr className="text-left text-caption text-muted-foreground">
                    <th className={th}>User</th>
                    <th className={`${th} text-right`}>Calls</th>
                    <th className={`${th} text-right`}>Tokens</th>
                    <th className={`${th} text-right`}>Cost</th>
                  </tr>
                </thead>
                <tbody className="text-foreground/90">
                  {usage!.topUsers.map((u) => (
                    <tr key={u.userId} className="border-t border-border">
                      <td className="px-3 py-2">
                        <Link href={`/admin/engage/users/${u.userId}`} className="text-brand hover:underline">
                          {u.email ?? u.userId}
                        </Link>
                      </td>
                      <td className={`${td} text-right`}>{fmtNumber(u.calls)}</td>
                      <td className={`${td} text-right`}>{fmtNumber(u.inputTokens + u.outputTokens)}</td>
                      <td className={`${td} text-right`}>{fmtDollars(u.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      ) : tab === "models" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-card border border-border bg-surface" aria-labelledby="ai-models">
            <header className="border-b border-border px-4 py-3">
              <h2 id="ai-models" className="text-label font-semibold text-foreground">
                Model per feature
              </h2>
              <p className="mt-0.5 text-caption text-muted-foreground">
                The model each feature tries first. If it fails or refuses, the other one writes instead.
              </p>
            </header>
            {(["linkedin", "x"] as const).map((p) => (
              <div key={p}>
                <p className="border-t border-border bg-background px-4 py-1.5 text-caption font-semibold text-muted-foreground first:border-t-0">
                  {PLATFORM_LABELS[p]} extension
                </p>
                {PLATFORM_FEATURES[p].map((f) => (
                  <div key={f} className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-2.5">
                    <span className="min-w-[160px] flex-1 text-caption text-foreground/90">{FEATURE_LABELS[f]}</span>
                    <AdminSelect
                      aria-label={`${FEATURE_LABELS[f]} model`}
                      value={models![f]}
                      disabled={!data.settingsReady}
                      onChange={(e) => openDialog({ kind: "model", feature: f, key: e.target.value as AiModelKey })}
                    >
                      {AI_MODEL_KEYS.map((k) => (
                        <option key={k} value={k}>
                          {AI_MODELS[k].label}
                        </option>
                      ))}
                    </AdminSelect>
                  </div>
                ))}
              </div>
            ))}
          </section>

          <section className="rounded-card border border-border bg-surface" aria-labelledby="ai-prices">
            <header className="border-b border-border px-4 py-3">
              <h2 id="ai-prices" className="text-label font-semibold text-foreground">
                Prices
              </h2>
              <p className="mt-0.5 text-caption text-muted-foreground">
                Dollars per million tokens, from each provider&apos;s price list. Cost figures use these, past ones included.
              </p>
            </header>
            {priceModels.map((id) => {
              const price = prices?.[id]
              return (
                <div key={id} className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-2.5 first:border-t-0">
                  <span className="min-w-[160px] flex-1 text-caption text-foreground/90">{modelLabel(id)}</span>
                  <span className="text-caption tabular-nums text-muted-foreground">
                    {price ? `$${price.input} in · $${price.output} out` : <span className="text-warning">Not set</span>}
                  </span>
                  <AdminButton
                    variant="secondary"
                    disabled={!data.settingsReady}
                    onClick={() =>
                      openDialog({ kind: "price", model: id, input: price ? String(price.input) : "", output: price ? String(price.output) : "" })
                    }
                  >
                    {price ? "Change" : "Set price"}
                  </AdminButton>
                </div>
              )
            })}
          </section>
          {!data.settingsReady && (
            <p className="text-caption text-warning xl:col-span-2">Run scripts/engage-admin-phase-b.sql in Supabase before changing models or prices.</p>
          )}
        </div>
      ) : prompts.error ? (
        <ErrorState message={prompts.error} onRetry={prompts.reload} />
      ) : !prompts.data ? (
        <SkeletonBlock className="h-[300px]" />
      ) : (
        <section className="space-y-3" aria-label="Prompts">
          <p className="text-caption text-muted-foreground">
            What each feature sends the AI, built from a made-up profile, post and conversation. To change a prompt, ask for it in
            the code, where it&apos;s tested before it goes live.
          </p>
          {prompts.data.prompts.map((p) => (
            <details key={p.id} className="rounded-card border border-border bg-surface">
              <summary className="cursor-pointer px-4 py-3 text-label font-semibold text-foreground">
                {p.label} <span className="ml-1 text-caption font-normal text-muted-foreground">· {FEATURE_LABELS[p.feature]}</span>
              </summary>
              <div className="grid gap-3 border-t border-border p-4 lg:grid-cols-2">
                {(["system", "user"] as const).map((part) => (
                  <div key={part} className="min-w-0">
                    <h3 className="mb-1.5 text-caption font-semibold text-muted-foreground">
                      {part === "system" ? "Instructions" : "Content sent"}
                    </h3>
                    <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-md bg-background p-3 text-caption leading-relaxed text-foreground/90">
                      {p[part]}
                    </pre>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </section>
      )}

      <Modal
        open={dialog !== null}
        onClose={() => !busy && setDialog(null)}
        title={
          dialog?.kind === "model"
            ? `${FEATURE_LABELS[dialog.feature]}: write with ${AI_MODELS[dialog.key].label} first?`
            : dialog?.kind === "price"
              ? `${modelLabel(dialog.model)} price`
              : ""
        }
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (dialog?.kind === "model") {
              void submit({ model: { feature: dialog.feature, key: dialog.key } }, `${FEATURE_LABELS[dialog.feature]} now uses ${AI_MODELS[dialog.key].label}`)
            } else if (dialog?.kind === "price") {
              void submit(
                { price: { model: dialog.model, input: Number(dialog.input), output: Number(dialog.output) } },
                `${modelLabel(dialog.model)} price saved`,
              )
            }
          }}
        >
          {dialog?.kind === "model" && (
            <p className="text-caption leading-relaxed text-muted-foreground">
              Within 10 seconds, {FEATURE_LABELS[dialog.feature]} tries {AI_MODELS[dialog.key].label} first, with{" "}
              {AI_MODELS[dialog.key === "luna" ? "haiku" : "luna"].label} as backup. Compare both on the Usage tab afterwards.
            </p>
          )}
          {dialog?.kind === "price" && (
            <div className="flex flex-wrap gap-3">
              <label className="block space-y-1">
                <span className="block text-caption text-muted-foreground">$ per million tokens in</span>
                <AdminInput className="w-32" inputMode="decimal" value={dialog.input} onChange={(e) => setDialog({ ...dialog, input: e.target.value })} />
              </label>
              <label className="block space-y-1">
                <span className="block text-caption text-muted-foreground">$ per million tokens out</span>
                <AdminInput className="w-32" inputMode="decimal" value={dialog.output} onChange={(e) => setDialog({ ...dialog, output: e.target.value })} />
              </label>
            </div>
          )}
          <label className="block space-y-1">
            <span className="block text-caption text-muted-foreground">Reason (for the audit log)</span>
            <AdminInput className="w-full" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Haiku was faster this week" />
          </label>
          {dialogError && (
            <p role="alert" className="text-caption text-danger">
              {dialogError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <AdminButton type="button" variant="secondary" onClick={() => setDialog(null)} disabled={busy}>
              Cancel
            </AdminButton>
            <AdminButton
              type="submit"
              loading={busy}
              disabled={dialog?.kind === "price" && !(priceValid(dialog.input) && priceValid(dialog.output))}
            >
              Save
            </AdminButton>
          </div>
        </form>
      </Modal>
    </div>
  )
}
