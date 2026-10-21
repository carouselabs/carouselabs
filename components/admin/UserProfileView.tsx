// The admin user profile's display: who they are and their numbers in one
// band, their posts as the main canvas, and the admin actions in a side panel.
// The page loads the user (app/(admin)/admin/users/[userId]/page.tsx).
import Link from "next/link"
import { ArrowLeft, Sparkles } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import type { PostFormat } from "@prisma/client"
import { postCreditCost } from "@/lib/adminStats"
import { PlanBadge } from "@/components/admin/ui"
import { tableCls } from "@/components/admin/tableStyles"
import { UserAdminActions } from "@/components/admin/UserAdminActions"
import { EngagePriceCard } from "@/components/admin/engage/EngagePriceCard"

// fmtDate/fmtDateTime live in components/admin/ui.tsx, which is a "use
// client" module — every export of a client module becomes a client
// reference, so calling them as plain functions from a server component
// throws. Kept as local, dependency-free formatters instead.
function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "Never"
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "Never"
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export interface UserProfileData {
  user: {
    id: string
    email: string
    createdAt: Date
    updatedAt: Date
    suspendedAt: Date | null
    adminNote: string | null
    profile: { name: string | null; headline: string | null } | null
  }
  sub: {
    creditsUsed: number
    creditsTotal: number
    extraCredits: number
    currentPeriodEnd: Date | null
    cancelAtPeriodEnd: boolean
    status: string
  } | null
  plan: "FREE" | "PRO" | "GROWTH"
  creditsRemaining: number
  posts: {
    id: string
    title: string
    format: PostFormat
    status: string
    createdAt: Date
    idea: { title: string | null; hook: string | null } | null
  }[]
}

export function UserProfileView({ user, sub, plan, creditsRemaining, posts }: UserProfileData) {
  const counts = {
    captions: posts.filter((p) => p.format === "TEXT_ONLY").length,
    images: posts.filter((p) => p.format === "SINGLE_IMAGE").length,
    carousels: posts.filter((p) => p.format === "CAROUSEL").length,
  }
  const displayName = user.profile?.name ?? user.email

  const figures = [
    {
      label: "Credits",
      value: `${creditsRemaining}`,
      hint: sub
        ? `${sub.creditsUsed} used of ${sub.creditsTotal}${sub.extraCredits ? ` (+${sub.extraCredits} extra)` : ""}`
        : "no subscription row",
    },
    {
      label: "Renewal",
      value: sub?.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : "—",
      hint: sub?.cancelAtPeriodEnd ? "cancels at period end" : (sub?.status ?? undefined),
    },
    {
      label: "Posts",
      value: posts.length,
      hint: `${counts.captions} captions · ${counts.images} images · ${counts.carousels} carousels`,
    },
    {
      label: "Est. credits spent",
      value: posts.reduce((acc, p) => acc + postCreditCost(p.format), 0),
      hint: "derived from post formats (no ledger)",
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/users"
        className="inline-flex w-fit items-center gap-1.5 rounded-detail text-caption text-muted-foreground transition-colors duration-(--motion-fast) hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        All users
      </Link>

      {/* Who they are, and their numbers */}
      <section aria-label={displayName} className="rounded-showcase border border-border bg-surface p-6 sm:p-8">
        <div className="flex flex-wrap items-start gap-5">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-soft text-title-sm font-semibold text-brand">
            {displayName[0]?.toUpperCase()}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h2 className="min-w-0 font-display text-[2rem] leading-[1.05] tracking-[-0.01em] break-words text-foreground sm:text-[2.5rem]">
                {displayName}
              </h2>
              <PlanBadge plan={plan} />
              {user.suspendedAt && (
                <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-caption font-semibold text-danger">
                  SUSPENDED
                </span>
              )}
            </div>
            <p className="text-label text-muted-foreground">
              {user.email} · joined {formatDate(user.createdAt)} · last active{" "}
              {formatDate(user.updatedAt)}
              {user.profile?.headline ? ` · ${user.profile.headline}` : ""}
            </p>
          </div>
          {/* A personal email to just them, written with AI (/admin/users/[id]/email). */}
          <Link href={`/admin/users/${user.id}/email`} className={buttonVariants({ variant: "brand", size: "sm", className: "shrink-0" })}>
            <Sparkles aria-hidden />
            Send email with AI
          </Link>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-6 lg:grid-cols-4">
          {figures.map((f) => (
            <div key={f.label} className="flex min-w-0 flex-col gap-1 border-l border-border pl-4">
              <dt className="text-caption font-medium text-muted-foreground">{f.label}</dt>
              <dd className="text-lead font-semibold text-foreground tabular-nums">{f.value}</dd>
              {f.hint && <dd className="text-caption text-muted-foreground/80">{f.hint}</dd>}
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-10">
        {/* Posts — the main canvas */}
        <section aria-labelledby="all-posts" className="flex min-w-0 flex-col gap-3">
          <h2 id="all-posts" className="text-label font-semibold text-foreground">
            All Posts ({posts.length})
          </h2>
          <div className={tableCls.wrap}>
            <table className={tableCls.table}>
              <thead>
                <tr>
                  <th className={tableCls.th}>Title</th>
                  <th className={tableCls.th}>Type</th>
                  <th className={tableCls.th}>Status</th>
                  <th className={tableCls.th}>Idea</th>
                  <th className={tableCls.th}>Credits</th>
                  <th className={tableCls.th}>Created</th>
                </tr>
              </thead>
              <tbody>
                {posts.length === 0 && (
                  <tr>
                    <td className={tableCls.td} colSpan={6}>
                      No posts yet
                    </td>
                  </tr>
                )}
                {posts.map((p) => (
                  <tr key={p.id} className={tableCls.row}>
                    <td className={`${tableCls.td} max-w-[280px] truncate`}>{p.title}</td>
                    <td className={tableCls.td}>{p.format.replace("_", " ")}</td>
                    <td className={tableCls.td}>{p.status}</td>
                    <td className={`${tableCls.td} max-w-[280px] truncate text-muted-foreground`}>
                      {p.idea?.hook ?? p.idea?.title ?? "—"}
                    </td>
                    <td className={`${tableCls.td} tabular-nums`}>{postCreditCost(p.format)}</td>
                    <td className={`${tableCls.td} text-muted-foreground tabular-nums`}>{formatDateTime(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-caption text-muted-foreground/80">
            Credit costs are derived from post format (caption 5 · image 15 · carousel 40). There is no
            per-charge ledger table, so regenerations aren&apos;t itemized.
          </p>
        </section>

        {/* Admin actions — a side panel beside the posts */}
        <div className="flex min-w-0 flex-col gap-6 xl:sticky xl:top-0 xl:self-start">
          <UserAdminActions
            userId={user.id}
            email={user.email}
            plan={plan}
            suspended={!!user.suspendedAt}
            adminNote={user.adminNote}
          />
          {/* What they pay for each Engage extension: usual or special. */}
          <EngagePriceCard userId={user.id} />
        </div>
      </div>
    </div>
  )
}
