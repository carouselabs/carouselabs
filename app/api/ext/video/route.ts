// POST /api/ext/video — watch a LinkedIn video post for the comment model
// (lib/engage/postVideo.ts): ten stills from all through it and what's
// said in it, as text. Bearer-token authenticated like the rest of
// app/api/ext/*.
//
// The panel calls this once per video, before Generate, and sends the result
// with the post to /api/ext/generate (lib/engage/videoInput.ts checks it
// there), so Regenerate doesn't watch the video again. Nothing is used up
// here; the comment is counted by /api/ext/generate as usual. Any failure is
// fine for the panel: the comment is then written from the post's text and
// the video's cover, as before.
import { NextResponse } from "next/server"
import { getUserFromCommentExtensionToken } from "@/lib/extensionCommentAuth"
import { engageVideoCheck } from "@/lib/engage/gate"
import { watchVideo } from "@/lib/engage/postVideo"
import { isPostVideoUrl } from "@/lib/engage/videoInput"

export const maxDuration = 60
// Download, stills and speech together stop here, well inside maxDuration.
const WATCH_BUDGET_MS = 40_000

export async function POST(req: Request) {
  const started = Date.now()
  const user = await getUserFromCommentExtensionToken(req)
  if (!user) return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })

  const blocked = await engageVideoCheck(user.id, req)
  if (blocked) return blocked

  let url: unknown
  try {
    url = (await req.json())?.url
  } catch {
    url = null
  }
  if (!isPostVideoUrl(url)) return NextResponse.json({ error: "That video can't be read." }, { status: 400 })

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
    return NextResponse.json({
      frames: video.frames.map((frame) => frame.data),
      transcript: video.transcript,
      seconds: video.seconds,
    })
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
