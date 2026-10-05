import { NextResponse } from "next/server"
import { Resend } from "resend"
import { getCurrentUser } from "@/lib/auth"
import { requestLimit } from "@/lib/requestLimit"

export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const limited = await requestLimit("winner", user.id)
  if (limited) return limited
  try {
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: "CarouseLabs <support@carouselabs.com>",
      to: "carouselabs@gmail.com",
      subject: "New Game Winner on CarouseLabs",
      // User content is plain text, never interpolated into HTML.
      text: "A user reported winning the Number Stop Game. Verify before awarding a prize.\nName: " + (user.profile?.name || "Unknown") + "\nEmail: " + user.email,
    })
    if (error) throw new Error("Email delivery failed")
    return NextResponse.json({ success: true })
  } catch {
    console.error("[winner] Email delivery failed")
    return NextResponse.json({ error: "Failed to send winner email" }, { status: 502 })
  }
}
