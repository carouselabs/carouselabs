import { afterEach, describe, expect, it, vi } from "vitest";
import {
  apiFetch,
  ApiError,
  getApiBaseUrl,
  onSignedOut,
  OFFLINE_MESSAGE,
  SIGNED_OUT_MESSAGE,
  UNREACHABLE_MESSAGE,
  userFacingError,
} from "@/lib/api";
import { chromeMock } from "../setup/chrome";

function respond(status: number, body: unknown, asJson = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(asJson ? JSON.stringify(body) : String(body), { status })),
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe("API base URL", () => {
  it("uses the dev server in non-production builds", async () => {
    expect(await getApiBaseUrl()).toBe("http://localhost:3000");
  });

  it("honours a trimmed apiBaseUrl override and ignores a blank one", async () => {
    chromeMock().__store.apiBaseUrl = "  https://staging.carouselabs.com  ";
    expect(await getApiBaseUrl()).toBe("https://staging.carouselabs.com");
    chromeMock().__store.apiBaseUrl = "   ";
    expect(await getApiBaseUrl()).toBe("http://localhost:3000");
  });
});

describe("apiFetch", () => {
  it("never calls the network without a token", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(apiFetch("/api/ext/me")).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the bearer token and returns parsed JSON", async () => {
    chromeMock().__store.extensionToken = "cl_cmt_abc";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await apiFetch("/api/ext/me")).toEqual({ ok: 1 });
    const init = (fetchMock.mock.calls[0] as unknown[])[1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer cl_cmt_abc");
  });

  it.each([401, 402, 429, 500, 503])("surfaces the server's message for HTTP %i", async (status) => {
    chromeMock().__store.extensionToken = "cl_cmt_abc";
    respond(status, { error: `boom ${status}` });
    await expect(apiFetch("/x")).rejects.toMatchObject({ status, message: `boom ${status}` });
  });

  it("falls back to a generic message when the error body is not JSON", async () => {
    chromeMock().__store.extensionToken = "cl_cmt_abc";
    respond(502, "<html>Bad gateway</html>", false);
    await expect(apiFetch("/x")).rejects.toMatchObject({ status: 502, message: "Request failed (502)" });
  });

  it("rejects (not hangs) when the network is down", async () => {
    chromeMock().__store.extensionToken = "cl_cmt_abc";
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    await expect(apiFetch("/x")).rejects.toBeInstanceOf(TypeError);
  });

  it("gives up with a clear error when the server never answers", async () => {
    chromeMock().__store.extensionToken = "cl_cmt_abc";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
          }),
      ),
    );
    vi.useFakeTimers();
    const pending = apiFetch("/x").catch((err) => err);
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    const err = await pending;
    expect(err).toBeInstanceOf(ApiError);
    expect(String((err as ApiError).message)).toMatch(/took too long|timed out/i);
  });
});

describe("what a failed request tells the person", () => {
  afterEach(() => {
    onSignedOut(null);
    vi.unstubAllGlobals();
  });

  it("a refusal the server explains is shown as written; its own trouble is a plain try again", () => {
    expect(userFacingError(new ApiError(429, "You've reached your limit of 50 comments today."))).toBe(
      "You've reached your limit of 50 comments today.",
    );
    expect(userFacingError(new ApiError(502, "upstream exploded at line 4"))).toBe("Something went wrong, try again");
  });

  it("no connection says so, offline or not", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(userFacingError(new TypeError("Failed to fetch"))).toBe(OFFLINE_MESSAGE);
    vi.stubGlobal("navigator", { onLine: true });
    expect(userFacingError(new TypeError("Failed to fetch"))).toBe(UNREACHABLE_MESSAGE);
  });

  it("a token the server no longer accepts signs this browser out, and says so in plain words", async () => {
    chromeMock().__store.extensionToken = "cl_cmt_revoked";
    const signedOut = vi.fn();
    onSignedOut(signedOut);
    respond(401, { error: "Invalid or missing extension token" });
    const err = await apiFetch("/api/ext/me").catch((e) => e);
    expect(signedOut).toHaveBeenCalledOnce();
    expect(userFacingError(err)).toBe(SIGNED_OUT_MESSAGE);
  });

  it("any other refusal leaves the sign-in alone", async () => {
    chromeMock().__store.extensionToken = "cl_cmt_ok";
    const signedOut = vi.fn();
    onSignedOut(signedOut);
    respond(403, { error: "Engage is paused for this account." });
    await apiFetch("/api/ext/generate").catch(() => {});
    expect(signedOut).not.toHaveBeenCalled();
  });
});
