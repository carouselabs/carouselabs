import { NextRequest } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: { postId: string } }
) {
  return new Response('Not implemented', { status: 501 })
}
