import { NextResponse } from 'next/server'

import { requireApiRole } from '@/lib/authorization'
import { listNodes } from '@/lib/nodes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await requireApiRole('viewer')

  if (session instanceof NextResponse) {
    return session
  }

  try {
    const { searchParams } = new URL(req.url)
    const clustersParam = searchParams.get('clusters')
    const clusterNames = clustersParam
      ?.split(',')
      .map((clusterName) => clusterName.trim())
      .filter(Boolean)

    const report = await listNodes(
      clusterNames && clusterNames.length > 0 ? clusterNames : undefined
    )

    return NextResponse.json(report, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
