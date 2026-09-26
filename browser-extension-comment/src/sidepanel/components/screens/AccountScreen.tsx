import { useEffect, useState } from "react";
import { apiFetch, ApiError, BILLING_URL, type MeResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { clearAccountData } from "@/lib/account";

export function AccountScreen() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    apiFetch<MeResponse>("/api/ext/me")
      .then((res) => !cancelled && setMe(res))
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
  }

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading account…</div>;
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-sm font-semibold">Account</h2>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {me && (
        <>
          <div className="space-y-2 rounded-md border border-input p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Signed in as</span>
              <span className="truncate text-xs font-medium">{me.email}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Plan</span>
              <span className="text-xs font-medium">{me.plan}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Credits remaining</span>
              <span className="text-xs font-medium">{me.creditsAvailable}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Comments this month</span>
              <span className="text-xs font-medium">{me.commentsThisMonth}</span>
            </div>
          </div>

          {/* Opens a real browser tab: billing is a full web flow and the side
              panel is far too narrow to complete it in. */}
          <Button onClick={() => chrome.tabs.create({ url: BILLING_URL })}>Upgrade</Button>
        </>
      )}

      {/* Always available, even when the account can't be loaded: a revoked
          or expired token would otherwise leave the user stuck signed in. */}
      <Button variant="outline" disabled={signingOut} onClick={handleSignOut}>
        {signingOut ? "Signing out…" : "Sign out"}
      </Button>
    </div>
  );
}
