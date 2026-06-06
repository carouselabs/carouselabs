import { NextRequest } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: { ideaId: string } }
) {
  return new Response('Not implemented', { status: 501 })
}

export async function GET(
  req: NextRequest,
  { params }: { params: { ideaId: string } }
) {
  return new Response('Not implemented', { status: 501 })
}
