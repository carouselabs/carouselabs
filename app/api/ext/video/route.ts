// POST /api/ext/video — watch a LinkedIn video post for the comment model
// (lib/engage/postVideo.ts): ten stills from all through it and what's
// said in it, as text. Bearer-token authenticated like the rest of
// app/api/ext/*.
//
// The panel starts this as soon as a video post is picked and sends the
// result with the post to /api/ext/generate (lib/engage/videoInput.ts checks
// it there). Each video is watched once per person: asked again (Regenerate,
// the panel reopened, the post opened another day), the earlier watch is
// sent back from lib/engage/videoCache.ts, at once, at no cost, and not
// counted toward the day's videos. Nothing is used up here; the comment is
// counted by /api/ext/generate as usual. Any failure is fine for the panel:
// the comment is then written from the post's text and the video's cover.
import { NextResponse } from "next/server"
import { getUserFromCommentExtensionToken } from "@/lib/extensionCommentAuth"
import { engageVideoCheck } from "@/lib/engage/gate"
import { watchVideo } from "@/lib/engage/postVideo"
import { cachedVideo, rememberVideo, videoCacheKey } from "@/lib/engage/videoCache"
import { isPostVideoUrl } from "@/lib/engage/videoInput"

export const maxDuration = 60
// Download, stills and speech together stop here, well inside maxDuration.
const WATCH_BUDGET_MS = 40_000

export async function POST(req: Request) {
  const started = Date.now()
  const user = await getUserFromCommentExtensionToken(req)
  if (!user) return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })

  let url: unknown
  try {
    url = (await req.json())?.url
  } catch {
    url = null
  }
  if (!isPostVideoUrl(url)) return NextResponse.json({ error: "That video can't be read." }, { status: 400 })

  // Watched before: the same blocks apply (suspended, Comments off), but it
  // isn't watched, paid for or counted again.
  const key = videoCacheKey(user.id, url)
  const earlier = await cachedVideo(key)
  const blocked = await engageVideoCheck(user.id, req, { count: !earlier })
  if (blocked) return blocked
  if (earlier) {
    console.log(`[ext/video] watched before frames=${earlier.frames.length} ms=${Date.now() - started}`)
    return NextResponse.json(earlier)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), WATCH_BUDGET_MS)
  const stop = () => controller.abort()
  req.signal.addEventListener("abort", stop, { once: true })
  try {
    const video = await watchVideo(url, controller.signal)
    console.log(
      `[ext/video] watched frames=${video.frames.length} speech_chars=${video.transcript.length}` +
        ` seconds=${video.seconds === null ? "-" : Math.round(video.seconds)} ms=${Date.now() - started}`,
    )
    const answer = {
      frames: video.frames.map((frame) => frame.data),
      transcript: video.transcript,
      seconds: video.seconds,
    }
    await rememberVideo(key, answer)
    return NextResponse.json(answer)
  } catch (err) {
    // The reason is logged; the panel only needs to know to go without.
    const reason = controller.signal.aborted ? "took too long or was stopped" : err instanceof Error ? err.message : "failed"
    console.warn(`[ext/video] couldn't watch: ${reason} ms=${Date.now() - started}`)
    return NextResponse.json({ error: "Couldn't watch this video." }, { status: 422 })
  } finally {
    clearTimeout(timer)
    req.signal.removeEventListener("abort", stop)
  }
}
