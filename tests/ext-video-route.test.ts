// POST /api/ext/video and its check (lib/engage/gate.ts engageVideoCheck):
// signed in, the same blocks as a comment, nothing for an account with no
// comments left, a daily cap of its own, LinkedIn's video servers only, and
// a failure the panel can simply go without. Watching itself is stood in for
// (tests/engage-post-video.test.ts covers it).
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextResponse } from "next/server"

const state = vi.hoisted(() => ({
  user: { id: "u1" } as { id: string } | null,
  access: null as unknown,
  outdated: false,
  limitOk: true,
  limited: [] as string[],
  watch: null as null | ((url: string, signal: AbortSignal) => Promise<unknown>),
  cache: new Map<string, unknown>(),
  cacheBroken: false,
}))

vi.mock("@upstash/redis", () => ({
  Redis: {
    fromEnv: () => ({
      get: async (key: string) => {
        if (state.cacheBroken) throw new Error("redis down")
        return state.cache.get(key) ?? null
      },
      set: async (key: string, value: unknown) => {
        state.cache.set(key, value)
        return "OK"
      },
    }),
  },
}))
vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    static slidingWindow(limit: number, window: string) {
      return { limit, window }
    }
    constructor(public options: { prefix: string; limiter: { limit: number; window: string } }) {}
    async limit(id: string) {
      state.limited.push(`${this.options.prefix}:${this.options.limiter.limit}/${this.options.limiter.window}:${id}`)
      return { success: state.limitOk }
    }
  }
  return { Ratelimit }
})
vi.mock("@/lib/extensionCommentAuth", () => ({ getUserFromCommentExtensionToken: vi.fn(async () => state.user) }))
// The rest of the gate: not used by this check, and kept off the database.
vi.mock("@/lib/extAccess", () => ({ onlyOnce: (f: unknown) => f, reserveExtGeneration: vi.fn(), reserveFreeGeneration: vi.fn() }))
vi.mock("@/lib/engage/usage", () => ({ reserveUsage: vi.fn() }))
vi.mock("@/lib/extDailyLimit", () => ({ extDailyLimitResponse: vi.fn(async () => null) }))
vi.mock("@/lib/engage/access", () => ({ loadEngageAccess: vi.fn(async () => state.access), isEngageSchemaMissing: () => false }))
vi.mock("@/lib/engage/settings", () => ({
  outdatedExtensionResponse: vi.fn(async () =>
    state.outdated ? NextResponse.json({ error: "Update the extension" }, { status: 426 }) : null,
  ),
}))
vi.mock("@/lib/engage/postVideo", () => ({
  watchVideo: vi.fn((url: string, signal: AbortSignal) => state.watch!(url, signal)),
}))

import { POST } from "@/app/api/ext/video/route"
import { watchVideo } from "@/lib/engage/postVideo"
import { videoCacheKey, videoId } from "@/lib/engage/videoCache"

const VIDEO = "https://dms.licdn.com/playlist/vid/v2/D4E05AQ/mp4-360p-30fp-crf28/0/1700000000000?e=1&v=beta&t=x"

const feature = { enabled: true, paused: false, override: null, pauseMessage: null }
function accessWith({ status = "active", comments = feature, pay = { access: "unlimited", freeRemaining: null } } = {}) {
  return {
    status,
    features: { comments, replies: feature },
    platforms: { linkedin: pay, x: pay, reddit: pay },
  }
}

const ask = (body: unknown = { url: VIDEO }) =>
  new Request("https://carouselabs.com/api/ext/video", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer cl_cmt_test" },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  state.user = { id: "u1" }
  state.access = accessWith()
  state.outdated = false
  state.limitOk = true
  state.limited = []
  state.cache = new Map()
  state.cacheBroken = false
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io")
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test")
  state.watch = async () => ({
    frames: [{ mediaType: "image/jpeg", data: "/9j/AAA" }, { mediaType: "image/jpeg", data: "/9j/BBB" }],
    transcript: "Here's what we learned.",
    seconds: 41.2,
  })
  vi.spyOn(console, "log").mockImplementation(() => {})
  vi.spyOn(console, "warn").mockImplementation(() => {})
})

describe("POST /api/ext/video", () => {
  it("watches the video: stills as base64 JPEGs, the speech and the length", async () => {
    const res = await POST(ask())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ frames: ["/9j/AAA", "/9j/BBB"], transcript: "Here's what we learned.", seconds: 41.2 })
    expect(watchVideo).toHaveBeenCalledWith(VIDEO, expect.any(AbortSignal))
    // Its own daily cap, per person.
    expect(state.limited).toEqual(["ext-video:60/1 d:user:u1"])
  })

  it("signed out: nothing watched", async () => {
    state.user = null
    expect((await POST(ask())).status).toBe(401)
    expect(watchVideo).not.toHaveBeenCalled()
  })

  it("only LinkedIn's video servers, only whole files", async () => {
    for (const body of [
      { url: "https://evil.example/x.mp4" },
      { url: "https://dms.licdn.com/playlist/vid/master.m3u8" },
      { url: "blob:https://www.linkedin.com/1" },
      {},
      "not json",
    ]) {
      const res = await POST(ask(body))
      expect(res.status, JSON.stringify(body)).toBe(400)
    }
    expect(watchVideo).not.toHaveBeenCalled()
  })

  it("blocked like a comment would be: suspended, Comments off, an outdated extension", async () => {
    state.access = accessWith({ status: "suspended" })
    expect((await POST(ask())).status).toBe(403)
    state.access = accessWith({ comments: { ...feature, enabled: false, override: "off" as never } })
    expect(((await (await POST(ask())).json()) as { code: string }).code).toBe("feature_disabled")
    state.access = accessWith()
    state.outdated = true
    expect((await POST(ask())).status).toBe(426)
    expect(watchVideo).not.toHaveBeenCalled()
  })

  it("no free comments left: nothing watched (Generate shows the paywall)", async () => {
    state.access = accessWith({ pay: { access: "free", freeRemaining: 0 } as never })
    const res = await POST(ask())
    expect(res.status).toBe(403)
    expect(((await res.json()) as { code: string }).code).toBe("no_free_left")
    // Free comments still to use: watched.
    state.access = accessWith({ pay: { access: "free", freeRemaining: 3 } as never })
    expect((await POST(ask())).status).toBe(200)
    expect(watchVideo).toHaveBeenCalledTimes(1)
  })

  it("over the day's videos: 429, nothing watched", async () => {
    state.limitOk = false
    const res = await POST(ask())
    expect(res.status).toBe(429)
    expect(((await res.json()) as { code: string }).code).toBe("video_limit")
    expect(watchVideo).not.toHaveBeenCalled()
  })

  it("a video that can't be watched: a plain 422, no details", async () => {
    state.watch = async () => {
      throw new Error("ffmpeg exited 1: /tmp/engage-video-x/post.mp4: Invalid data")
    }
    const res = await POST(ask())
    expect(res.status).toBe(422)
    expect(await res.json()).toEqual({ error: "Couldn't watch this video." })
  })

  it("the panel going away stops the watching", async () => {
    let seen: AbortSignal | null = null
    state.watch = (_url, signal) =>
      new Promise((_, reject) => {
        seen = signal
        signal.addEventListener("abort", () => reject(new Error("stopped")))
      })
    const controller = new AbortController()
    const req = new Request("https://carouselabs.com/api/ext/video", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: "Bearer cl_cmt_test" },
      body: JSON.stringify({ url: VIDEO }),
    })
    const pending = POST(req)
    await vi.waitFor(() => expect(seen).not.toBeNull())
    controller.abort()
    expect((await pending).status).toBe(422)
    expect(seen!.aborted).toBe(true)
  })
})

describe("a video watched before", () => {
  // The same video at another size, with a fresh signature.
  const AGAIN = "https://dms.licdn.com/playlist/vid/v2/D4E05AQ/mp4-720p-30fp-crf28/0/1700000000000?e=2&v=beta&t=y"
  const WATCHED = { frames: ["/9j/AAA", "/9j/BBB"], transcript: "Here's what we learned.", seconds: 41.2 }

  it("one video, however it's addressed: its media id; without one, its address minus the signature", () => {
    const real = "https://dms.licdn.com/playlist/vid/v2/D4E05AQHabcdefghij1234/mp4-720p-30fp-crf28/0/1700000000000?e=1&t=x"
    expect(videoId(real)).toBe("D4E05AQHabcdefghij1234")
    expect(videoCacheKey("u1", real)).toBe("ext-video:v1:u1:D4E05AQHabcdefghij1234")
    expect(videoId(AGAIN)).toBe("dms.licdn.com/playlist/vid/v2/D4E05AQ/mp4-720p-30fp-crf28/0/1700000000000")
  })

  it("asked again: sent back at once, not watched, paid for or counted again", async () => {
    const real = (size: number, sig: string) =>
      `https://dms.licdn.com/playlist/vid/v2/D4E05AQHabcdefghij1234/mp4-${size}p-30fp-crf28/0/1700000000000?e=1&t=${sig}`
    expect((await POST(ask({ url: real(360, "a") }))).status).toBe(200)
    expect(watchVideo).toHaveBeenCalledTimes(1)
    expect(state.limited).toHaveLength(1)

    const again = await POST(ask({ url: real(720, "b") }))
    expect(again.status).toBe(200)
    expect(await again.json()).toEqual(WATCHED)
    expect(watchVideo).toHaveBeenCalledTimes(1)
    expect(state.limited).toHaveLength(1)
  })

  it("not shared with anyone else: their first watch is their own", async () => {
    await POST(ask())
    state.user = { id: "u2" }
    expect((await POST(ask())).status).toBe(200)
    expect(watchVideo).toHaveBeenCalledTimes(2)
  })

  it("still blocked if the account is now suspended", async () => {
    await POST(ask())
    state.access = accessWith({ status: "suspended" })
    expect((await POST(ask())).status).toBe(403)
    expect(watchVideo).toHaveBeenCalledTimes(1)
  })

  it("can't be looked up: watched as before", async () => {
    await POST(ask())
    state.cacheBroken = true
    expect((await POST(ask())).status).toBe(200)
    expect(watchVideo).toHaveBeenCalledTimes(2)
  })

  it("a video that couldn't be watched isn't kept", async () => {
    state.watch = async () => {
      throw new Error("broken file")
    }
    expect((await POST(ask())).status).toBe(422)
    expect(state.cache.size).toBe(0)
  })
})
