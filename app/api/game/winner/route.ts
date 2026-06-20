// app/api/game/winner/route.ts
import { auth, currentUser } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST() {
  console.log("[winner] API called")
  console.log("[winner] RESEND_API_KEY exists:", !!process.env.RESEND_API_KEY)

  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await currentUser()
  const name = user?.fullName ?? user?.firstName ?? "Unknown"
  const email = user?.emailAddresses[0]?.emailAddress ?? "Unknown"

  try {
    console.log("[winner] Sending email to carouselabs@gmail.com")
    // Resend returns { data, error } — it does NOT throw on API errors, so check
    // `error` here (this is the usual reason an email silently fails to send).
    const { data, error } = await resend.emails.send({
      from: "CarouseLabs <support@carouselabs.com>",
      to: "carouselabs@gmail.com",
      subject: "🎉 New Game Winner on CarouseLabs!",
      html: `
        <h2>Someone just won the Number Stop Game!</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p>Send them their prize!</p>
      `,
    })

    if (error) {
      console.error("[winner] Email failed:", error)
      return NextResponse.json({ error: "Failed to send winner email" }, { status: 502 })
    }

    console.log("[winner] Email sent successfully", data?.id ?? "")
  } catch (err) {
    console.error("[winner] Email failed:", err)
    return NextResponse.json({ error: "Failed to send winner email" }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
