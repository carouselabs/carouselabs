// The server's Insert switch (admin → Engage → Controls, read from
// /api/ext/config), as the LinkedIn and X content scripts check it before an
// Insert.
//
// It used to be fetched fresh on every Insert, waiting up to 8s, and any
// failed fetch refused the Insert: on a slow or briefly dropped connection,
// Insert "sometimes didn't work" and often felt slow. Now a reading is
// remembered for this page:
//   - one under FRESH_MS old is used as is (no request: Insert is instant);
//   - otherwise it is read again, waiting at most FETCH_TIMEOUT_MS;
//   - if that fails, a reading under STALE_OK_MS old still counts;
//   - with no usable reading at all, the Insert is refused (fails closed), and
//     the person is told it was the connection.
// So switching Insert off reaches an already-open page within FRESH_MS.
export const FRESH_MS = 5 * 60_000;
export const STALE_OK_MS = 60 * 60_000;
export const FETCH_TIMEOUT_MS = 4_000;

export type InsertSwitch = "on" | "off" | "unknown";

let last: { enabled: boolean; at: number } | null = null;

// A reading taken elsewhere (the LinkedIn page's own config fetch at load).
export function rememberInsertSwitch(enabled: boolean, now: number = Date.now()): void {
  last = { enabled, at: now };
}

// For tests: forget the remembered reading.
export function resetInsertSwitch(): void {
  last = null;
}

const asSwitch = (enabled: boolean): InsertSwitch => (enabled ? "on" : "off");

// `read` fetches /api/ext/config's insertEnabled (true unless the server says
// false), throwing when it can't; it is given the signal to stop at the
// timeout.
export async function insertSwitch(
  read: (signal: AbortSignal) => Promise<boolean>,
  now: () => number = Date.now,
): Promise<InsertSwitch> {
  if (last && now() - last.at < FRESH_MS) return asSwitch(last.enabled);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const enabled = await read(controller.signal);
    rememberInsertSwitch(enabled, now());
    return asSwitch(enabled);
  } catch {
    if (last && now() - last.at < STALE_OK_MS) return asSwitch(last.enabled);
    return "unknown";
  } finally {
    clearTimeout(timer);
  }
}

// /api/ext/config's insertEnabled, for `insertSwitch`.
export async function readInsertEnabled(baseUrl: string, signal: AbortSignal): Promise<boolean> {
  const res = await fetch(`${baseUrl}/api/ext/config`, { signal });
  if (!res.ok) throw new Error(`/api/ext/config responded ${res.status}`);
  const config = (await res.json()) as { insertEnabled?: boolean };
  return config.insertEnabled !== false;
}
