// lib/engage/postVideo.ts — "watching" a LinkedIn video post for the comment
// model, which can't take a video: FRAME_COUNT stills spread evenly through
// it, and what's said in it as text (OpenAI speech-to-text). Used only by
// app/api/ext/video; the panel sends the result on to /api/ext/generate
// (lib/engage/videoInput.ts).
//
// 1. The file is downloaded with fetchPublicVideo: LinkedIn's servers only
//    (checked by the route), public addresses, a size and a time cap.
// 2. It must be an MP4 (an "ftyp" box), and is read by ffmpeg (the
//    ffmpeg-static package, shipped with this one route: next.config.ts) as
//    MP4 only, from a local file only, so nothing in it can make ffmpeg open
//    another file or address.
// 3. The stills and the sound are taken at the same time. The sound is the
//    first AUDIO_SECONDS, mono and small, turned into text.
//
// A still or the speech that fails is left out; only a video with neither
// is an error. Temporary files are always removed.
import { spawn } from "node:child_process"
import { constants } from "node:fs"
import { access, chmod, copyFile, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import OpenAI, { toFile } from "openai"
import type { PostImage } from "@/lib/ai/commentModel"
import { fetchPublicVideo } from "@/lib/safeRemoteImage"
import { cleanTranscript, FRAME_COUNT, isJpeg, MAX_FRAME_BYTES } from "@/lib/engage/videoInput"

export const MAX_VIDEO_BYTES = 64 * 1024 * 1024
export const DOWNLOAD_MS = 15_000
// The speech of a long video is only heard this far in; the stills still
// span all of it.
export const AUDIO_SECONDS = 300
const FRAME_MS = 10_000
const AUDIO_MS = 15_000
// 32 kbit/s mono for AUDIO_SECONDS is about 1.2 MB.
const MAX_AUDIO_BYTES = 4 * 1024 * 1024
const STILL_SIZE = 512
// Stills taken this many at a time, each on one thread: a server function
// has a core or two, and ten decoders at once only slow each other down.
const STILLS_AT_ONCE = 3

export class VideoError extends Error {}

export interface WatchedVideo {
  frames: PostImage[]
  transcript: string
  // From the file's header; null when it doesn't say.
  seconds: number | null
}

export function isMp4(bytes: Buffer): boolean {
  return bytes.length >= 12 && bytes.toString("latin1", 4, 8) === "ftyp"
}

// The video's length from its "moov/mvhd" box, walking boxes rather than
// searching for the name (which could appear inside the picture data).
export function mp4Duration(bytes: Buffer): number | null {
  const find = (start: number, end: number, type: string): [number, number] | null => {
    let at = start
    while (at + 8 <= end) {
      let size = bytes.readUInt32BE(at)
      let header = 8
      if (size === 1) {
        if (at + 16 > end) return null
        const large = bytes.readBigUInt64BE(at + 8)
        if (large > BigInt(end - at)) return null
        size = Number(large)
        header = 16
      } else if (size === 0) {
        size = end - at
      }
      if (size < header || at + size > end) return null
      if (bytes.toString("latin1", at + 4, at + 8) === type) return [at + header, at + size]
      at += size
    }
    return null
  }
  const moov = find(0, bytes.length, "moov")
  const mvhd = moov && find(moov[0], moov[1], "mvhd")
  if (!mvhd) return null
  const [start, end] = mvhd
  let timescale: number
  let duration: number
  if (bytes[start] === 1) {
    if (start + 32 > end) return null
    timescale = bytes.readUInt32BE(start + 20)
    duration = Number(bytes.readBigUInt64BE(start + 24))
  } else {
    if (start + 20 > end) return null
    timescale = bytes.readUInt32BE(start + 12)
    duration = bytes.readUInt32BE(start + 16)
  }
  if (!timescale || !duration) return null
  const seconds = duration / timescale
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null
}

// Evenly through the video, each in the middle of its part (never the black
// first frame or the last). A video of unknown length: a spread of fixed
// moments; any past its end simply give nothing.
export function frameTimes(seconds: number | null, count: number = FRAME_COUNT): number[] {
  if (!seconds) return [0.5, 2, 4, 7, 10, 15, 20, 30, 45, 60].slice(0, count)
  return Array.from({ length: count }, (_, i) => Math.round((((i + 0.5) * seconds) / count) * 100) / 100)
}

export type RunFfmpeg = (
  args: string[],
  options: { timeoutMs: number; maxBytes: number; signal?: AbortSignal },
) => Promise<Buffer>

export type Transcribe = (audio: Buffer, signal: AbortSignal) => Promise<string>

// The binary ffmpeg-static downloaded at install, read from the project's
// node_modules (next.config.ts ships it with app/api/ext/video).
export function ffmpegPath(): string {
  return (
    process.env.FFMPEG_PATH ||
    join(process.cwd(), "node_modules", "ffmpeg-static", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg")
  )
}

let binary: Promise<string> | null = null
function ffmpegBinary(): Promise<string> {
  binary ??= (async () => {
    const path = ffmpegPath()
    if (process.platform === "win32") return path
    try {
      await access(path, constants.X_OK)
      return path
    } catch {
      // A deploy can lose the file's "may run" bit: a runnable copy instead.
      const copy = join(tmpdir(), "engage-ffmpeg")
      await copyFile(path, copy)
      await chmod(copy, 0o755)
      return copy
    }
  })().catch((err) => {
    binary = null
    throw err
  })
  return binary
}

export const runFfmpeg: RunFfmpeg = async (args, { timeoutMs, maxBytes, signal }) => {
  const bin = await ffmpegBinary()
  return new Promise<Buffer>((resolve, reject) => {
    const child = spawn(bin, ["-nostdin", "-hide_banner", "-loglevel", "error", ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      signal,
    })
    const chunks: Buffer[] = []
    let size = 0
    let errors = ""
    let failed: Error | null = null
    const stop = (why: Error) => {
      failed ??= why
      child.kill("SIGKILL")
    }
    const timer = setTimeout(() => stop(new VideoError("ffmpeg took too long")), timeoutMs)
    child.stdout.on("data", (chunk: Buffer) => {
      size += chunk.length
      if (size > maxBytes) stop(new VideoError("ffmpeg output too large"))
      else chunks.push(chunk)
    })
    child.stderr.on("data", (chunk: Buffer) => {
      if (errors.length < 2_000) errors += chunk.toString()
    })
    // Settled only once the process has gone ("close" always follows
    // "error"), so the caller can delete the file it was reading.
    child.on("error", (err) => {
      failed ??= err
    })
    child.on("close", (code) => {
      clearTimeout(timer)
      if (failed) reject(failed)
      else if (code === 0) resolve(Buffer.concat(chunks))
      else reject(new VideoError(`ffmpeg exited ${code}: ${errors.trim().slice(0, 300)}`))
    })
  })
}

// OpenAI's more accurate speech model (names and figures matter in a
// comment); whisper-1 only when the account can't use it (not on a timeout or
// an outage, which a second model wouldn't fix).
let openai: OpenAI | null = null
export const transcribeWithOpenAI: Transcribe = async (audio, signal) => {
  openai ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: AUDIO_MS, maxRetries: 0 })
  const models = [...new Set([process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-transcribe", "whisper-1"])]
  let lastError: unknown = null
  for (const model of models) {
    try {
      const file = await toFile(audio, "speech.mp3", { type: "audio/mpeg" })
      const result = await openai.audio.transcriptions.create({ file, model }, { signal })
      return result.text
    } catch (err) {
      lastError = err
      if (!(err instanceof OpenAI.APIError) || ![400, 403, 404].includes(err.status ?? 0)) throw err
    }
  }
  throw lastError
}

// Read only as MP4, only from the local file.
const INPUT = ["-protocol_whitelist", "file", "-f", "mov"]

// Runs the tasks at most `limit` at a time, in order, settling each like
// Promise.allSettled. Once stopped, the ones not started yet are skipped.
async function inTurns<T>(tasks: (() => Promise<T>)[], limit: number, signal: AbortSignal): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length)
  let next = 0
  const worker = async () => {
    while (next < tasks.length) {
      const i = next++
      if (signal.aborted) {
        results[i] = { status: "rejected", reason: new VideoError("Stopped") }
        continue
      }
      try {
        results[i] = { status: "fulfilled", value: await tasks[i]() }
      } catch (reason) {
        results[i] = { status: "rejected", reason }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker))
  return results
}

export async function watchVideo(
  url: string,
  signal: AbortSignal,
  {
    fetchVideo = fetchPublicVideo,
    ffmpeg = runFfmpeg,
    transcribe = transcribeWithOpenAI,
  }: { fetchVideo?: typeof fetchPublicVideo; ffmpeg?: RunFfmpeg; transcribe?: Transcribe } = {},
): Promise<WatchedVideo> {
  const { bytes } = await fetchVideo(url, { maxBytes: MAX_VIDEO_BYTES, timeoutMs: DOWNLOAD_MS })
  if (!isMp4(bytes)) throw new VideoError("Not an MP4 file")
  const seconds = mp4Duration(bytes)

  const dir = await mkdtemp(join(tmpdir(), "engage-video-"))
  try {
    const file = join(dir, "post.mp4")
    await writeFile(file, bytes)

    const stills = inTurns(
      frameTimes(seconds).map((at) => () =>
        ffmpeg(
          [
            ...INPUT,
            "-threads", "1",
            "-ss", at.toFixed(2),
            "-i", file,
            "-frames:v", "1",
            "-vf", `scale=${STILL_SIZE}:${STILL_SIZE}:force_original_aspect_ratio=decrease`,
            "-q:v", "5",
            "-c:v", "mjpeg",
            "-f", "image2pipe",
            "pipe:1",
          ],
          { timeoutMs: FRAME_MS, maxBytes: MAX_FRAME_BYTES, signal },
        ),
      ),
      STILLS_AT_ONCE,
      signal,
    )

    // A silent video, or one whose speech can't be heard, still has stills.
    const speech = ffmpeg(
      [
        ...INPUT,
        "-i", file,
        "-map", "0:a:0",
        "-vn", "-ac", "1", "-ar", "16000", "-b:a", "32k",
        "-t", String(AUDIO_SECONDS),
        "-f", "mp3",
        "pipe:1",
      ],
      { timeoutMs: AUDIO_MS, maxBytes: MAX_AUDIO_BYTES, signal },
    )
      .then((audio) => (audio.length > 1_000 ? transcribe(audio, signal) : ""))
      .then(cleanTranscript)
      .catch((err) => {
        if (signal.aborted) throw err
        console.warn(`[engage/postVideo] no speech: ${err instanceof Error ? err.message : "failed"}`)
        return ""
      })

    const [taken, transcript] = await Promise.all([stills, speech])
    if (signal.aborted) throw new VideoError("Stopped")
    const frames = taken.flatMap((result): PostImage[] =>
      result.status === "fulfilled" && isJpeg(result.value)
        ? [{ mediaType: "image/jpeg", data: result.value.toString("base64") }]
        : [],
    )
    if (!frames.length && !transcript) throw new VideoError("Nothing could be read from the video")
    return { frames, transcript, seconds }
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch((err) =>
      console.warn(`[engage/postVideo] temporary files left: ${err instanceof Error ? err.message : "failed"}`),
    )
  }
}
