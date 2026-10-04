import { useEffect, useState } from "react";
import { ExternalLink, LogOut, Sparkles } from "lucide-react";
import { apiFetch, ApiError, openWebsite, type ExtensionAccess, type MeResponse } from "@/lib/api";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { clearAccountData } from "@/lib/account";
import {
  EXTENSION_PRICE_LABEL,
  freeGenerationsLeft,
  openCheckout,
  setExtensionAccess,
  useExtensionAccess,
} from "@/lib/extensionAccess";
import { Initials } from "../Initials";
import { ScreenHeader } from "../ScreenHeader";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

function planLabel(access: ExtensionAccess): string {
  if (access.access === "testing") return "Testing (paywall off)";
  if (access.access === "unlimited") {
    if (access.status === "cancelled" && access.endsAt) return `Unlimited until ${formatDate(access.endsAt)}`;
    if (access.status === "past_due") return "Unlimited (payment failed)";
    return "Unlimited";
  }
  return `Free — ${freeGenerationsLeft(access)} of ${access.freeLimit} left`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{children}</dd>
    </div>
  );
}

export function AccountScreen() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [openingCheckout, setOpeningCheckout] = useState(false);
  const access = useExtensionAccess();

  useEffect(() => {
    let cancelled = false;

    apiFetch<MeResponse>("/api/ext/me")
      .then((res) => {
        if (cancelled) return;
        setMe(res);
        setExtensionAccess(res.extension);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load account");
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    setError(null);

    try {
      // Revoke server-side first. If this fails the token stays valid, and
      // clearing it locally anyway would leave a live credential on the
      // account with no way for the user to reach it again from here.
      await apiFetch("/api/ext/auth/signout", { method: "POST" });
    } catch (err) {
      // 401 means the server already doesn't accept this token (revoked or
      // expired) — there is nothing left to revoke, so finish signing out
      // locally. Anything else, keep it: it may still be live.
      if (!(err instanceof ApiError && err.status === 401)) {
        setError(err instanceof ApiError ? err.message : "Couldn't sign out, try again");
        setSigningOut(false);
        return;
      }
    }

    // App.tsx watches extensionToken via chrome.storage.onChanged, so removing
    // it flips the panel back to the signed-out screen with no reload. Every
    // other piece of this person's data goes with it — see lib/account.ts.
    await clearAccountData();
    setExtensionAccess(null);
  }

  async function handleGetUnlimited() {
    setOpeningCheckout(true);
    setError(null);
    try {
      await openCheckout();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't open checkout. Try again.");
    } finally {
      setOpeningCheckout(false);
    }
  }

  // Free generations used, as a bar: what's left is easier to see than read.
  const freeUsedShare =
    access?.access === "free" && access.freeLimit > 0
      ? Math.min(1, (access.freeLimit - (freeGenerationsLeft(access) ?? 0)) / access.freeLimit)
      : null;

  return (
    <div className="flex flex-col gap-4 p-4">
      <ScreenHeader title="Account" />

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <div role="status" aria-label="Loading account" className="space-y-3 rounded-lg border bg-card p-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="w-1/3" />
              <Skeleton className="w-3/4" />
            </div>
          </div>
          <Skeleton className="w-full" />
        </div>
      ) : (
        me && (
          <>
            <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
              <Initials name={me.email} />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Signed in as</p>
                <p className="break-all text-sm font-medium">
                  {me.email}
                </p>
              </div>
            </div>

            <section className="space-y-1.5" aria-label="Extension plan">
              <h3 className="text-xs font-medium text-muted-foreground">Extension plan</h3>
              <div className="overflow-hidden rounded-lg border bg-card">
                {access && (
                  <div className="space-y-2.5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{planLabel(access)}</p>
                      {access.access === "unlimited" && access.status === "past_due" ? (
                        <Badge variant="warning">Action needed</Badge>
                      ) : access.access === "unlimited" ? (
                        <Badge variant="success">Active</Badge>
                      ) : null}
                    </div>
                    {freeUsedShare !== null && (
                      <div
                        role="progressbar"
                        aria-label="Free generations used"
                        aria-valuemin={0}
                        aria-valuemax={access.freeLimit}
                        aria-valuenow={access.freeLimit - (freeGenerationsLeft(access) ?? 0)}
                        className="h-1.5 overflow-hidden rounded-full bg-muted"
                      >
                        <div
                          className="h-full rounded-full bg-primary transition-[width] duration-slow ease-out"
                          style={{ width: `${freeUsedShare * 100}%` }}
                        />
                      </div>
                    )}
                    {/* Both open a real browser tab: checkout and the Lemon
                        Squeezy portal are full web flows, far too wide for the
                        side panel. */}
                    {access.access === "free" && (
                      <Button className="w-full" loading={openingCheckout} onClick={handleGetUnlimited}>
                        {!openingCheckout && <Sparkles aria-hidden />}
                        {openingCheckout ? "Opening checkout…" : `Get unlimited — ${EXTENSION_PRICE_LABEL}`}
                      </Button>
                    )}
                    {access.access === "unlimited" && access.manageUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => chrome.tabs.create({ url: access.manageUrl! })}
                      >
                        Manage subscription
                        <ExternalLink aria-hidden />
                      </Button>
                    )}
                  </div>
                )}
                <dl className="divide-y border-t">
                  {access?.access === "unlimited" && access.status !== "cancelled" && access.renewsAt && (
                    <Row label="Renews">{formatDate(access.renewsAt)}</Row>
                  )}
                  <Row label="Comments this month">
                    <span className="tabular-nums">{me.commentsThisMonth}</span>
                  </Row>
                </dl>
              </div>
            </section>

            <div className="space-y-1.5">
              <Button variant="outline" className="w-full" onClick={() => void openWebsite("/extension")}>
                Open on carouselabs.com
                <ExternalLink aria-hidden />
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Your profiles, full history, settings and payments are there too.
              </p>
            </div>
          </>
        )
      )}

      {/* Always available, even when the account can't be loaded: a revoked
          or expired token would otherwise leave the user stuck signed in. */}
      <div className="border-t pt-3">
        <Button
          variant="ghost"
          className="w-full text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
          loading={signingOut}
          onClick={handleSignOut}
        >
          {!signingOut && <LogOut aria-hidden />}
          {signingOut ? "Signing out…" : "Sign out"}
        </Button>
      </div>
    </div>
  );
}
