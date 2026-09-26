import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch, ApiError, getApiBaseUrl } from "@/lib/api";
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
