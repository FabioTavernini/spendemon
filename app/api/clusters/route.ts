import { NextResponse } from 'next/server'

import { getClusters } from '@/lib/clusters'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
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
