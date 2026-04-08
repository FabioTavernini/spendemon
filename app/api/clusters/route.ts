import { NextResponse } from 'next/server'

import { requireApiRole } from '@/lib/authorization'
import { getClusters } from '@/lib/clusters'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await requireApiRole('viewer')

  if (session instanceof NextResponse) {
    return session
  }

  try {
    const clusters = await getClusters()

    return NextResponse.json(
      {
        totalClusters: clusters.length,
        clusters,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
