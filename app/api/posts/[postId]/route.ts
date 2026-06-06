import { NextRequest } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: { postId: string } }
) {
  return new Response('Not implemented', { status: 501 })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { postId: string } }
) {
  return new Response('Not implemented', { status: 501 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { postId: string } }
) {
  return new Response('Not implemented', { status: 501 })
}
