import { headers } from "next/headers"
import { Webhook } from "svix"
import type { WebhookEvent } from "@clerk/nextjs/server"
import { db } from "@/lib/db"

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
    const { id: clerkId, email_addresses, primary_email_address_id } = event.data
    const primary = email_addresses.find((e) => e.id === primary_email_address_id)
    if (!primary) {
      return new Response("No primary email", { status: 400 })
    }
    await db.user.create({
      data: {
        clerkId,
        email: primary.email_address,
        subscription: { create: {} },
        usage: { create: {} },
      },
    })
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
