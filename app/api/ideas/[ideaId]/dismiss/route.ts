import { NextRequest } from 'next/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { ideaId: string } }
) {
  return new Response('Not implemented', { status: 501 })
}
