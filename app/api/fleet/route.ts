import { NextResponse } from 'next/server'
import { deployCount24h, fetchFleet } from '@/lib/fleet'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const wantKey = process.env.FLEET_KEY
  const key = new URL(request.url).searchParams.get('key')
  if (wantKey && key !== wantKey) {
    return NextResponse.json({ error: 'locked' }, { status: 401 })
  }
  const [fleet, deploys] = await Promise.all([fetchFleet(), deployCount24h()])
  return NextResponse.json({ fleet, deploys }, { headers: { 'cache-control': 'no-store' } })
}
