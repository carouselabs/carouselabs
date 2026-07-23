import { headers } from "next/headers"
import { Webhook } from "svix"
import type { WebhookEvent } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { sendWelcomeEmail } from "@/lib/email"

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    return new Response("Missing CLERK_WEBHOOK_SECRET", { status: 500 })
  }

  const headersList = await headers()
  const svixId = headersList.get("svix-id")
  const svixTimestamp = headersList.get("svix-timestamp")
  const svixSignature = headersList.get("svix-signature")

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 })
  }

  const body = await req.text()
  const wh = new Webhook(secret)
  let event: WebhookEvent

  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent
  } catch {
    return new Response("Invalid signature", { status: 400 })
  }

  if (event.type === "user.created") {
    const { id: clerkId, email_addresses, primary_email_address_id, first_name, last_name } =
      event.data
    const primary = email_addresses.find((e) => e.id === primary_email_address_id)
    if (!primary) {
      return new Response("No primary email", { status: 400 })
    }
    const email = primary.email_address

    // The email may already belong to a User row under a different clerkId
    // (Clerk account deleted and re-created, or a new sign-in method). Creating
    // would violate the unique email constraint (P2002) — re-link that row to
    // the new clerkId instead of creating a duplicate. Same-clerkId hits are
    // webhook retries: nothing to do.
    const existingByEmail = await db.user.findFirst({ where: { email } })
    if (existingByEmail) {
      if (existingByEmail.clerkId !== clerkId) {
        await db.user.update({
          where: { id: existingByEmail.id },
          data: { clerkId },
        })
      }
    } else {
      await db.user.create({
        data: {
          clerkId,
          email,
          subscription: { create: {} },
          usage: { create: {} },
        },
      })

      // Welcome email — best-effort, never fail the webhook on email errors.
      // Only for genuinely new users, not re-linked or retried ones.
      const name = [first_name, last_name].filter(Boolean).join(" ")
      try {
        await sendWelcomeEmail(email, name)
      } catch (err) {
        console.error("[webhooks/clerk] welcome email failed:", err)
      }
    }
  }

  if (event.type === "user.deleted") {
    const { id: clerkId } = event.data
    if (clerkId) {
      await db.user.updateMany({
        where: { clerkId },
        data: { deletedAt: new Date() },
      })
    }
  }

  return new Response("OK", { status: 200 })
}
