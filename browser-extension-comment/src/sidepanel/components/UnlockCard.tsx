// The paywall's two faces in the panel. UnlockCard replaces a Generate
// button once the free generations are used up: a disabled button with a
// note gives the user nothing to act on, and subscribing is the only thing
// that helps. FreeGenerationsNote is the quiet count shown while some are left.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import {
  EXTENSION_PRICE_LABEL,
  freeGenerationsLeft,
  openCheckout,
  refreshExtensionAccess,
  useExtensionAccess,
} from "@/lib/extensionAccess";

function useCheckout() {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setOpening(true);
    setError(null);
    try {
      await openCheckout();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't open checkout. Try again.");
    } finally {
      setOpening(false);
    }
  }

  return { opening, error, start };
}

export function UnlockCard() {
  const access = useExtensionAccess();
  const { opening, error, start } = useCheckout();
  const [refreshing, setRefreshing] = useState(false);
  const limit = access?.freeLimit ?? 10;

  return (
    <div className="animate-fade-in space-y-3 rounded-lg border border-primary/25 bg-accent/60 p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold">You&apos;ve used your {limit} free generations</p>
        <p className="text-xs text-muted-foreground">
          Get unlimited comments, replies, connection notes and messages for {EXTENSION_PRICE_LABEL}. Cancel anytime.
        </p>
      </div>
      <Button className="w-full" loading={opening} onClick={start}>
        {opening ? "Opening checkout…" : `Get unlimited — ${EXTENSION_PRICE_LABEL}`}
      </Button>
      <div className="text-center">
        <button
          type="button"
          disabled={refreshing}
          onClick={async () => {
            setRefreshing(true);
            await refreshExtensionAccess();
            setRefreshing(false);
          }}
          className="rounded text-xs text-muted-foreground underline underline-offset-2 transition-colors duration-fast hover:text-foreground disabled:opacity-50"
        >
          {refreshing ? "Checking…" : "Already subscribed? Refresh"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function FreeGenerationsNote() {
  const access = useExtensionAccess();
  const { opening, error, start } = useCheckout();
  const left = freeGenerationsLeft(access);
  if (left === null || left === 0 || !access) return null;

  return (
    <div className="space-y-1">
      <p className="text-center text-xs text-muted-foreground">
        {left} of {access.freeLimit} free generation{access.freeLimit === 1 ? "" : "s"} left ·{" "}
        <button
          type="button"
          disabled={opening}
          onClick={start}
          className="rounded font-medium text-primary-text underline-offset-2 hover:underline disabled:opacity-50"
        >
          {opening ? "Opening…" : "Get unlimited"}
        </button>
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
