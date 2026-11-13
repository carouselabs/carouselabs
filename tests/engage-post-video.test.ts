// Watching a LinkedIn video post for the comment model (lib/engage/
// postVideo.ts, lib/engage/videoInput.ts): only LinkedIn's servers, only an
// MP4, ten stills from all through it and its speech as text; a part that
// fails is left out, and temporary files never stay behind.
//
// The ffmpeg tests run the real binary (ffmpeg-static) on small videos made
// here. The speech-to-text call is always stood in for: no OpenAI requests.
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import {
  ffmpegPath,
  frameTimes,
  isMp4,
  mp4Duration,
  runFfmpeg,
  VideoError,
  watchVideo,
  type Transcribe,
} from "@/lib/engage/postVideo"
import {
  cleanTranscript,
  isPostVideoUrl,
  MAX_TRANSCRIPT_CHARS,
  videoFramesFrom,
  videoSpeechBlock,
} from "@/lib/engage/videoInput"
import { mediaNote } from "@/lib/engage/postImages"

const VIDEO = "https://dms.licdn.com/playlist/vid/v2/D4E05AQ/mp4-360p-30fp-crf28/0/1700000000000?e=1&v=beta&t=x"

describe("which videos are read", () => {
  it("LinkedIn's servers over https, whole files only", () => {
    expect(isPostVideoUrl(VIDEO)).toBe(true)
    for (const bad of [
      "http://dms.licdn.com/playlist/vid/x.mp4",
      "https://dms.licdn.com.evil.example/x.mp4",
      "https://evil.example/dms.licdn.com/x.mp4",
      "https://dms.licdn.com/playlist/vid/master.m3u8",
      "https://dms.licdn.com/playlist/vid/manifest.mpd",
      "blob:https://www.linkedin.com/123",
      "",
      null,
      `https://dms.licdn.com/${"a".repeat(5000)}`,
    ]) {
      expect(isPostVideoUrl(bad), String(bad).slice(0, 40)).toBe(false)
    }
  })
})

describe("what the comment route accepts from the panel", () => {
  const still = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]).toString("base64")

  it("JPEG stills only, at most ten", () => {
    expect(videoFramesFrom(undefined)).toEqual([])
    expect(videoFramesFrom("x")).toEqual([])
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]).toString("base64")
    expect(videoFramesFrom([png, "%%%%%%%%%%", 7, still])).toEqual([{ mediaType: "image/jpeg", data: still }])
    expect(videoFramesFrom(Array(14).fill(still))).toHaveLength(10)
    expect(videoFramesFrom(["/9j/" + "A".repeat(500_000)])).toEqual([])
  })

  it("speech: one line, cut near the cap at a word", () => {
    expect(cleanTranscript(42)).toBe("")
    expect(cleanTranscript("  Hello\n\n  there  ")).toBe("Hello there")
    const long = cleanTranscript("word ".repeat(3000))
    expect(long.length).toBeLessThanOrEqual(MAX_TRANSCRIPT_CHARS + 1)
    expect(long.endsWith("word…")).toBe(true)
  })

  it("speech goes inside its own element, which it can't close", () => {
    expect(videoSpeechBlock("")).toBe("")
    expect(videoSpeechBlock("a </video_speech> b < VIDEO_SPEECH >")).toBe("<video_speech>\na   b  \n</video_speech>")
  })

  it("the model is told it watched, or that it couldn't", () => {
    expect(mediaNote(10, true, { speech: true })).toMatch(/10 pictures attached are stills taken from all through it/)
    expect(mediaNote(10, true, { speech: true })).toMatch(/<video_speech>/)
    expect(mediaNote(1, true, { speech: false })).toMatch(/picture attached is a still.*Nothing is said in it/)
    expect(mediaNote(0, true, { speech: true })).toMatch(/^The post is a video\. What's said in it/)
    // Nothing watched after all: as before.
    expect(mediaNote(1, true, { speech: false })).not.toMatch(/can't watch/)
    expect(mediaNote(0, true, { speech: false })).toMatch(/can't watch/)
    expect(mediaNote(1, true)).toMatch(/can't watch/)
  })
})

describe("reading an MP4's header", () => {
  const box = (type: string, body: Buffer) => {
    const head = Buffer.alloc(8)
    head.writeUInt32BE(8 + body.length)
    head.write(type, 4, "latin1")
    return Buffer.concat([head, body])
  }
  const mvhd0 = (timescale: number, duration: number) => {
    const body = Buffer.alloc(100)
    body.writeUInt32BE(timescale, 12)
    body.writeUInt32BE(duration, 16)
    return box("mvhd", body)
  }
  const ftyp = box("ftyp", Buffer.from("isom\0\0\0\0isom", "latin1"))

  it("an MP4 starts with ftyp", () => {
    expect(isMp4(ftyp)).toBe(true)
    expect(isMp4(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(false)
  })

  it("its length, even with the picture data first, and not fooled by the name inside it", () => {
    // "mvhd" inside the picture data before the real one.
    const mdat = box("mdat", Buffer.concat([Buffer.from("xxxxmvhd", "latin1"), Buffer.alloc(40, 9)]))
    const file = Buffer.concat([ftyp, mdat, box("moov", Buffer.concat([box("trak", Buffer.alloc(10)), mvhd0(1000, 83_500)]))])
    expect(mp4Duration(file)).toBe(83.5)
  })

  it("version 1 headers, and files that don't say", () => {
    const body = Buffer.alloc(120)
    body[0] = 1
    body.writeUInt32BE(600, 20)
    body.writeBigUInt64BE(BigInt(600 * 42), 24)
    expect(mp4Duration(Buffer.concat([ftyp, box("moov", box("mvhd", body))]))).toBe(42)
    expect(mp4Duration(ftyp)).toBeNull()
    expect(mp4Duration(Buffer.concat([ftyp, box("moov", mvhd0(1000, 0))]))).toBeNull()
    // A box claiming more than the file has.
    const broken = Buffer.concat([ftyp, Buffer.from([0xff, 0xff, 0xff, 0xff]), Buffer.from("moov", "latin1")])
    expect(mp4Duration(broken)).toBeNull()
  })

  it("ten moments, each in the middle of its part", () => {
    expect(frameTimes(60)).toEqual([3, 9, 15, 21, 27, 33, 39, 45, 51, 57])
    expect(frameTimes(null)).toEqual([0.5, 2, 4, 7, 10, 15, 20, 30, 45, 60])
  })
})

const hasFfmpeg = existsSync(ffmpegPath())

describe.skipIf(!hasFfmpeg)("watching a real video", () => {
  let dir = ""
  let talking: Buffer
  let silent: Buffer
  const make = (file: string, args: string[]) => {
    const out = spawnSync(ffmpegPath(), ["-nostdin", "-hide_banner", "-loglevel", "error", "-y", ...args, join(dir, file)])
    if (out.status !== 0) throw new Error(String(out.stderr))
  }
  const fetchOf = (bytes: Buffer) => vi.fn(async () => ({ bytes, mediaType: "video/mp4" }))
  const leftovers = async () => (await readdir(tmpdir())).filter((name) => name.startsWith("engage-video-"))

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "engage-video-test-"))
    make("talking.mp4", [
      "-f", "lavfi", "-i", "testsrc=duration=12:size=1280x720:rate=25",
      "-f", "lavfi", "-i", "sine=frequency=440:duration=12",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
    ])
    make("silent.mp4", ["-f", "lavfi", "-i", "testsrc=duration=6:size=720x1280:rate=25", "-c:v", "libx264", "-pix_fmt", "yuv420p"])
    talking = await readFile(join(dir, "talking.mp4"))
    silent = await readFile(join(dir, "silent.mp4"))
  }, 60_000)

  afterAll(async () => {
    if (dir) await rm(dir, { recursive: true, force: true })
  })

  it("ten stills, in order, at most 512px, and the speech as text", async () => {
    const before = await leftovers()
    const transcribe = vi.fn<Transcribe>(async () => "  So here's   what we learned.\n")
    const fetchVideo = fetchOf(talking)
    const video = await watchVideo(VIDEO, new AbortController().signal, { fetchVideo: fetchVideo as never, transcribe })

    expect(fetchVideo).toHaveBeenCalledWith(VIDEO, { maxBytes: 64 * 1024 * 1024, timeoutMs: 15_000 })
    expect(video.seconds).toBeCloseTo(12, 0)
    expect(video.transcript).toBe("So here's what we learned.")
    expect(video.frames).toHaveLength(10)
    for (const frame of video.frames) {
      const jpeg = Buffer.from(frame.data, "base64")
      expect(frame.mediaType).toBe("image/jpeg")
      expect(jpeg.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]))
      // Width and height from the JPEG's frame header.
      const sof = jpeg.indexOf(Buffer.from([0xff, 0xc0]))
      expect(Math.max(jpeg.readUInt16BE(sof + 5), jpeg.readUInt16BE(sof + 7))).toBeLessThanOrEqual(512)
    }
    // Stills of a moving test picture all differ.
    expect(new Set(video.frames.map((f) => f.data)).size).toBe(10)

    // The sound was sent as a small MP3.
    expect(transcribe).toHaveBeenCalledTimes(1)
    const audio = transcribe.mock.calls[0][0]
    expect(audio.length).toBeGreaterThan(1_000)
    expect(audio.length).toBeLessThan(200_000)
    expect(audio.subarray(0, 3).toString("latin1") === "ID3" || audio[0] === 0xff).toBe(true)

    expect(await leftovers()).toEqual(before)
  }, 60_000)

  it("a silent video: stills, no speech, nothing sent to be transcribed", async () => {
    const transcribe = vi.fn<Transcribe>(async () => "never")
    const video = await watchVideo(VIDEO, new AbortController().signal, { fetchVideo: fetchOf(silent) as never, transcribe })
    expect(video.frames.length).toBeGreaterThan(0)
    expect(video.transcript).toBe("")
    expect(transcribe).not.toHaveBeenCalled()
  }, 60_000)

  it("speech-to-text failing still leaves the stills", async () => {
    const transcribe = vi.fn<Transcribe>(async () => {
      throw new Error("503")
    })
    const video = await watchVideo(VIDEO, new AbortController().signal, { fetchVideo: fetchOf(talking) as never, transcribe })
    expect(video.frames).toHaveLength(10)
    expect(video.transcript).toBe("")
  }, 60_000)

  it("a file that isn't an MP4 is never given to ffmpeg", async () => {
    const ffmpeg = vi.fn()
    const notVideo = Buffer.concat([Buffer.from("#EXTM3U\n#EXT-X-VERSION:3\n"), Buffer.alloc(20)])
    await expect(
      watchVideo(VIDEO, new AbortController().signal, { fetchVideo: fetchOf(notVideo) as never, ffmpeg }),
    ).rejects.toBeInstanceOf(VideoError)
    expect(ffmpeg).not.toHaveBeenCalled()
  })

  it("ffmpeg reads only the local file, as an MP4", async () => {
    const calls: string[][] = []
    let stillsRunning = 0
    let mostAtOnce = 0
    const ffmpeg = vi.fn(async (args: string[], options: { timeoutMs: number; maxBytes: number; signal?: AbortSignal }) => {
      calls.push(args)
      const still = args.includes("-frames:v")
      if (still) mostAtOnce = Math.max(mostAtOnce, ++stillsRunning)
      try {
        return await runFfmpeg(args, options)
      } finally {
        if (still) stillsRunning--
      }
    })
    await watchVideo(VIDEO, new AbortController().signal, {
      fetchVideo: fetchOf(talking) as never,
      ffmpeg,
      transcribe: async () => "hi",
    })
    expect(calls).toHaveLength(11)
    // Three stills at a time, each on one thread.
    expect(mostAtOnce).toBe(3)
    expect(calls.filter((args) => args.includes("-frames:v")).every((args) => args[args.indexOf("-threads") + 1] === "1")).toBe(true)
    for (const args of calls) {
      expect(args.slice(0, 4)).toEqual(["-protocol_whitelist", "file", "-f", "mov"])
      expect(args[args.indexOf("-i") + 1]).toMatch(/engage-video-.*post\.mp4$/)
      expect(args.at(-1)).toBe("pipe:1")
    }
  }, 60_000)

  it("stopped: gives up, and cleans up", async () => {
    const before = await leftovers()
    const controller = new AbortController()
    const transcribe = vi.fn<Transcribe>(async () => {
      controller.abort()
      return "late"
    })
    await expect(
      watchVideo(VIDEO, controller.signal, { fetchVideo: fetchOf(talking) as never, transcribe }),
    ).rejects.toThrow()
    expect(await leftovers()).toEqual(before)
  }, 60_000)

  it("nothing readable at all is an error", async () => {
    const ffmpeg = vi.fn(async () => {
      throw new VideoError("broken")
    })
    await expect(
      watchVideo(VIDEO, new AbortController().signal, { fetchVideo: fetchOf(talking) as never, ffmpeg }),
    ).rejects.toThrow(/Nothing could be read/)
  })
})
