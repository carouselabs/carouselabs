"use client"

// Payment history for the extension's $15/month plan, read live from Lemon
// Squeezy through app/api/ext/payments.
import { useEffect, useState } from "react"
import { ExternalLink } from "lucide-react"
import { errorMessage, extApi, shortDate, type ExtPayment } from "./api"

const STATUS_STYLES: Record<string, string> = {
  paid: "text-[#15803D] bg-[#DCFCE7]",
  pending: "text-[#B45309] bg-[#FEF3C7]",
  refunded: "text-[#6B7280] bg-[#F3F4F6]",
  partial_refund: "text-[#6B7280] bg-[#F3F4F6]",
  void: "text-[#6B7280] bg-[#F3F4F6]",
}

// platform "x": the X extension's payments (sold separately).
export function PaymentsList({ platform = "linkedin" }: { platform?: "linkedin" | "x" }) {
  const [payments, setPayments] = useState<ExtPayment[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    extApi<{ payments: ExtPayment[] }>(platform === "x" ? "/api/ext/payments?platform=x" : "/api/ext/payments")
      .then((res) => setPayments(res.payments))
      .catch((err) => setError(errorMessage(err)))
  }, [platform])

  if (error) return <p className="text-[13px] text-[#DC2626]">{error}</p>
  if (!payments) return <p className="text-[13px] text-[#9CA3AF]">Loading payments…</p>
  if (payments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#E5E3DE] p-8 text-center text-[13px] text-[#6B7280]">
        No payments yet. Your $15/month payments will show here.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#E5E3DE] bg-white">
      <table className="w-full min-w-[560px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-[#F0EEE8] text-[11px] uppercase tracking-wide text-[#9CA3AF]">
            <th className="px-5 py-3 font-semibold">Date</th>
            <th className="px-5 py-3 font-semibold">What</th>
            <th className="px-5 py-3 font-semibold">Amount</th>
            <th className="px-5 py-3 font-semibold">Status</th>
            <th className="px-5 py-3 font-semibold">Card</th>
            <th className="px-5 py-3 font-semibold text-right">Invoice</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-b border-[#F0EEE8] last:border-0">
              <td className="px-5 py-3.5 text-[#0A0A0A]">{p.date ? shortDate(p.date) : "—"}</td>
              <td className="px-5 py-3.5 text-[#374151]">{p.reason}</td>
              <td className="px-5 py-3.5 font-semibold tabular-nums text-[#0A0A0A]">{p.amount}</td>
              <td className="px-5 py-3.5">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    STATUS_STYLES[p.status] ?? "text-[#6B7280] bg-[#F3F4F6]"
                  }`}
                >
                  {p.statusLabel}
                </span>
              </td>
              <td className="px-5 py-3.5 text-[#6B7280]">{p.card ?? "—"}</td>
              <td className="px-5 py-3.5 text-right">
                {p.invoiceUrl ? (
                  <a
                    href={p.invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-[#7C3AED] hover:underline"
                  >
                    Download <ExternalLink size={12} />
                  </a>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
