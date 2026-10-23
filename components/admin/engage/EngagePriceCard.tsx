"use client"

// One person's price for each Engage extension, on their Engage page and
// their Users profile: the usual $15/month, or a special price an admin set
// (lib/engage/price.ts), either every month or as an intro offer for their
// first 1–12 months, which their checkout charges through their own Lemon
// Squeezy discount. Loads and saves through
// /api/admin/engage/users/[userId]/price; every change asks why.
import { useState } from "react"
import { Tag } from "lucide-react"
import { AdminButton, AdminInput, AdminSelect, Modal, fmtDate } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import {
  MAX_INTRO_MONTHS,
  MAX_PRICE_CENTS,
  MIN_PRICE_CENTS,
  formatUsd,
  monthlyLabel,
  offerLabel,
  parseDollars,
  shortPriceLabel,
  type EngagePriceInfo,
} from "@/lib/engage/priceRules"
import type { adminEngagePrices } from "@/lib/engage/price"
import { ErrorState, Pill, SkeletonBlock, adminSend, useAdminApi } from "./shared"

type Jsonify<T> = T extends Date ? string : T extends Array<infer U> ? Jsonify<U>[] : T extends object ? { [K in keyof T]: Jsonify<T[K]> } : T
type PriceRow = Jsonify<Awaited<ReturnType<typeof adminEngagePrices>>[number]>
type PriceData = { prices: PriceRow[]; subscribed: Record<Platform, boolean> }
type Platform = PriceRow["platform"]

const NAMES: Record<Platform, string> = { linkedin: "Engage for LinkedIn", x: "Engage for X", reddit: "Engage for Reddit" }

// Today as YYYY-MM-DD, the earliest end date the form offers.
const today = () => new Date().toISOString().slice(0, 10)

// A stored special price as the person sees it.
const asOffer = (cents: number, standardCents: number, introMonths: number | null): EngagePriceInfo => ({
  cents,
  standardCents,
  special: true,
  endsAt: null,
  introMonths,
})

function SetPriceModal({
  row,
  onClose,
  onSave,
}: {
  row: PriceRow
  onClose: () => void
  onSave: (body: { priceCents: number; introMonths: number | null; endsAt: string | null; reason: string }) => Promise<void>
}) {
  const current = row.special && !row.special.ended ? row.special : null
  const [dollars, setDollars] = useState(current ? (current.priceCents / 100).toFixed(current.priceCents % 100 ? 2 : 0) : "")
  // "every": this price every month; "intro": only the first `months`, then the usual price.
  const [mode, setMode] = useState<"every" | "intro">(current?.introMonths ? "intro" : "every")
  const [months, setMonths] = useState(current?.introMonths ?? 1)
  const [endDate, setEndDate] = useState(current?.endsAt ? current.endsAt.slice(0, 10) : "")
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cents = parseDollars(dollars)
  const problem =
    dollars.trim() === ""
      ? null
      : cents === null
        ? "Write a price like 5 or 4.99"
        : cents < MIN_PRICE_CENTS || cents > MAX_PRICE_CENTS
          ? `Between ${formatUsd(MIN_PRICE_CENTS)} and ${formatUsd(MAX_PRICE_CENTS)}`
          : mode === "intro" && cents >= row.standardCents
            ? `An intro price must be less than the usual ${formatUsd(row.standardCents)}`
            : cents === row.standardCents
              ? `That's the usual price. Remove the special price instead.`
              : null
  const introMonths = mode === "intro" ? months : null

  return (
    <Modal open onClose={onClose} title={`${current ? "Change" : "Set"} price for ${NAMES[row.platform]}`}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          if (cents === null || problem) return
          setBusy(true)
          setError(null)
          try {
            // The end date is the last day they can buy at this price, to its end.
            await onSave({
              priceCents: cents,
              introMonths,
              endsAt: endDate ? new Date(`${endDate}T23:59:59.000Z`).toISOString() : null,
              reason,
            })
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong")
          } finally {
            setBusy(false)
          }
        }}
      >
        <p className="text-caption leading-relaxed text-muted-foreground">
          Usually {monthlyLabel(row.standardCents)}. Their next checkout charges this price: every month they stay
          subscribed, or only for their first months and then the usual price.
        </p>
        {row.special?.introUsedAt && (
          <p className="rounded-control-sm bg-surface-muted px-3 py-2 text-caption text-foreground">
            They bought with their intro offer on {fmtDate(row.special.introUsedAt)}. Saving an offer gives them one
            again.
          </p>
        )}
        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-caption font-medium text-muted-foreground">How long</legend>
          <label className="flex items-center gap-2 text-label text-foreground">
            <input type="radio" name="price-mode" checked={mode === "every"} onChange={() => setMode("every")} />
            Every month
          </label>
          <label className="flex flex-wrap items-center gap-2 text-label text-foreground">
            <input type="radio" name="price-mode" checked={mode === "intro"} onChange={() => setMode("intro")} />
            Only the first
            <AdminSelect
              aria-label="Months at this price"
              value={months}
              onChange={(e) => {
                setMonths(Number(e.target.value))
                setMode("intro")
              }}
            >
              {Array.from({ length: MAX_INTRO_MONTHS }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </AdminSelect>
            {months === 1 ? "month" : "months"}, then {monthlyLabel(row.standardCents)}
          </label>
        </fieldset>
        <label className="block space-y-1.5">
          <span className="text-caption font-medium text-muted-foreground">Price per month (USD)</span>
          <div className="flex items-center gap-2">
            <span className="text-label text-muted-foreground" aria-hidden>
              $
            </span>
            <AdminInput
              required
              autoFocus
              inputMode="decimal"
              placeholder="5"
              className="w-32"
              value={dollars}
              aria-invalid={!!problem || undefined}
              onChange={(e) => setDollars(e.target.value)}
            />
            {cents !== null && !problem && (
              <span className="text-caption text-foreground">
                They&apos;ll see{" "}
                {cents < row.standardCents && <s className="text-muted-foreground">{formatUsd(row.standardCents)}</s>}{" "}
                <span className="font-semibold">{shortPriceLabel(asOffer(cents, row.standardCents, introMonths))}</span>
                {introMonths && <>, then {monthlyLabel(row.standardCents)}</>}
              </span>
            )}
          </div>
          {problem && <span className="block text-caption text-danger">{problem}</span>}
        </label>
        <label className="block space-y-1.5">
          <span className="text-caption font-medium text-muted-foreground">Last day to buy at this price (optional)</span>
          <div className="flex items-center gap-2">
            <AdminInput type="date" min={today()} className="w-44" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            {endDate && (
              <AdminButton variant="ghost" onClick={() => setEndDate("")}>
                No end date
              </AdminButton>
            )}
          </div>
          <span className="block text-caption text-muted-foreground/80">
            After it they see the usual price again. Anyone who bought before keeps their price.
          </span>
        </label>
        <label className="block space-y-1.5">
          <span className="text-caption font-medium text-muted-foreground">Reason (kept in the audit log)</span>
          <AdminInput required minLength={3} maxLength={500} className="w-full" value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        {error && (
          <p role="alert" className="text-caption text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <AdminButton variant="secondary" onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" loading={busy} disabled={cents === null || !!problem}>
            Save price
          </AdminButton>
        </div>
      </form>
    </Modal>
  )
}

function RemovePriceModal({ row, onClose, onRemove }: { row: PriceRow; onClose: () => void; onRemove: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <Modal open onClose={onClose} title={`Remove the special price for ${NAMES[row.platform]}?`}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError(null)
          try {
            await onRemove(reason)
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong")
          } finally {
            setBusy(false)
          }
        }}
      >
        <p className="text-caption leading-relaxed text-muted-foreground">
          They&apos;ll see the usual {monthlyLabel(row.standardCents)} again. If they already bought at their special price,
          they keep paying it.
        </p>
        <label className="block space-y-1.5">
          <span className="text-caption font-medium text-muted-foreground">Reason (kept in the audit log)</span>
          <AdminInput required minLength={3} maxLength={500} autoFocus className="w-full" value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        {error && (
          <p role="alert" className="text-caption text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <AdminButton variant="secondary" onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" variant="danger" loading={busy}>
            Remove price
          </AdminButton>
        </div>
      </form>
    </Modal>
  )
}

export function EngagePriceCard({ userId }: { userId: string }) {
  const { toast } = useToast()
  const url = `/api/admin/engage/users/${userId}/price`
  const { data: answer, error, reload } = useAdminApi<PriceData>(url)
  // An answer without the prices (an older server mid-deploy) is an error, not a crash.
  const data = answer && Array.isArray(answer.prices) ? answer : null
  const failed = error ?? (answer && !data ? "Couldn't load the prices." : null)
  const [editing, setEditing] = useState<null | { row: PriceRow; kind: "set" | "remove" }>(null)

  const done = (message: string) => {
    setEditing(null)
    toast(message, "success")
    reload()
  }

  return (
    <section aria-labelledby={`price-${userId}`} className="rounded-card border border-border bg-surface">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Tag className="size-3.5 text-muted-foreground" aria-hidden />
        <h2 id={`price-${userId}`} className="text-label font-semibold text-foreground">
          Extension price
        </h2>
      </header>
      {failed && !data ? (
        <div className="p-4">
          <ErrorState message={failed} onRetry={reload} />
        </div>
      ) : !data ? (
        <div className="space-y-2 p-4" aria-busy="true" aria-label="Loading prices">
          <SkeletonBlock className="h-12" />
          <SkeletonBlock className="h-12" />
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {data.prices.map((row) => {
            const special = row.special
            // A spent intro offer is shown, but they pay the usual price again.
            const live = special && !special.ended && !special.introUsedAt
            return (
              <li key={row.platform} aria-label={`${NAMES[row.platform]} price`} className="space-y-1.5 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-caption font-semibold text-foreground/90">{NAMES[row.platform]}</span>
                    <span className="flex flex-wrap items-center gap-1.5 text-label text-foreground">
                      {live ? (
                        <>
                          <Pill tone="violet">{special.introMonths ? "Intro offer" : "Special"}</Pill>
                          {special.priceCents < row.standardCents && (
                            <s className="text-muted-foreground">{formatUsd(row.standardCents)}</s>
                          )}
                          <span className="font-semibold tabular-nums">
                            {shortPriceLabel(asOffer(special.priceCents, row.standardCents, special.introMonths))}
                          </span>
                          {special.introMonths && (
                            <span className="text-caption text-muted-foreground">then {monthlyLabel(row.standardCents)}</span>
                          )}
                        </>
                      ) : (
                        <span className="tabular-nums">Usual price, {monthlyLabel(row.standardCents)}</span>
                      )}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <AdminButton variant="ghost" onClick={() => setEditing({ row, kind: "set" })}>
                      {live ? "Change" : "Set price"}
                    </AdminButton>
                    {special && (
                      <AdminButton variant="ghost" onClick={() => setEditing({ row, kind: "remove" })}>
                        Remove
                      </AdminButton>
                    )}
                  </div>
                </div>
                {special && (
                  <p className="text-caption text-muted-foreground">
                    {special.introUsedAt && !special.ended
                      ? `Intro offer used ${fmtDate(special.introUsedAt)}: was ${offerLabel(asOffer(special.priceCents, row.standardCents, special.introMonths))}. `
                      : special.ended
                      ? `Ended ${fmtDate(special.endsAt)}: was ${offerLabel(asOffer(special.priceCents, row.standardCents, special.introMonths))}. `
                      : special.endsAt
                        ? `Can buy at it until ${fmtDate(special.endsAt)}. `
                        : "No end date. "}
                    “{special.reason}” · {special.setBy}, {fmtDate(special.updatedAt)}
                    {special.discountCode && ` · Lemon Squeezy discount ${special.discountCode}`}
                  </p>
                )}
                {data.subscribed?.[row.platform] && (
                  <p className="text-caption text-warning">
                    Already subscribed: they keep paying what they bought at. A new price only applies if they cancel and buy
                    again.
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {editing?.kind === "set" && (
        <SetPriceModal
          row={editing.row}
          onClose={() => setEditing(null)}
          onSave={async (body) => {
            await adminSend(url, "PUT", { platform: editing.row.platform, ...body })
            done(`${NAMES[editing.row.platform]}: ${offerLabel(asOffer(body.priceCents, editing.row.standardCents, body.introMonths))}`)
          }}
        />
      )}
      {editing?.kind === "remove" && (
        <RemovePriceModal
          row={editing.row}
          onClose={() => setEditing(null)}
          onRemove={async (reason) => {
            await adminSend(url, "DELETE", { platform: editing.row.platform, reason })
            done(`${NAMES[editing.row.platform]} is back to the usual price`)
          }}
        />
      )}
    </section>
  )
}
