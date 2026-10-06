// The Insert switch both content scripts check before an Insert
// (src/lib/insertSwitch.ts). It used to be fetched fresh on every Insert,
// waiting up to 8s, and refused the Insert whenever that fetch failed, so on
// a slow or briefly dropped connection Insert "sometimes didn't work".
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FRESH_MS,
  STALE_OK_MS,
  insertSwitch,
  rememberInsertSwitch,
  resetInsertSwitch,
} from "@/lib/insertSwitch";

let clock = 1_000_000;
const now = () => clock;
const down = vi.fn(async (): Promise<boolean> => {
  throw new Error("offline");
});

beforeEach(() => {
  resetInsertSwitch();
  clock = 1_000_000;
  down.mockClear();
});
afterEach(() => vi.useRealTimers());

describe("Insert switch", () => {
  it("a recent reading is used without asking the server, so Insert is instant", async () => {
    rememberInsertSwitch(true, clock);
    clock += FRESH_MS - 1;
    const read = vi.fn(async () => true);
    expect(await insertSwitch(read, now)).toBe("on");
    expect(read).not.toHaveBeenCalled();
  });

  it("an older reading is read again, and switching Insert off reaches the page that way", async () => {
    rememberInsertSwitch(true, clock);
    clock += FRESH_MS;
    expect(await insertSwitch(async () => false, now)).toBe("off");
    // And the new reading is remembered.
    clock += 1_000;
    expect(await insertSwitch(down, now)).toBe("off");
    expect(down).not.toHaveBeenCalled();
  });

  it("a dropped connection uses the last reading while it's under an hour old", async () => {
    rememberInsertSwitch(true, clock);
    clock += FRESH_MS + 1;
    expect(await insertSwitch(down, now)).toBe("on");
    expect(down).toHaveBeenCalledTimes(1);
    clock += STALE_OK_MS;
    expect(await insertSwitch(down, now)).toBe("unknown");
  });

  it("with no reading at all and no connection, the Insert is refused (fails closed)", async () => {
    expect(await insertSwitch(down, now)).toBe("unknown");
  });

  it("a server that never answers is given up on after 4 seconds, not 8", async () => {
    vi.useFakeTimers();
    const hang = (signal: AbortSignal) =>
      new Promise<boolean>((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
    let result: string | null = null;
    void insertSwitch(hang).then((r) => (result = r));
    await vi.advanceTimersByTimeAsync(3_999);
    expect(result).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    expect(result).toBe("unknown");
  });
});
