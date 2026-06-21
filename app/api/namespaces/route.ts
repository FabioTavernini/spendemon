// app/api/namespaces/route.ts
import { NextResponse } from 'next/server'

import { requireApiRole } from '@/lib/authorization'
import { getClusters } from '@/lib/clusters'
import { queryPrometheusVector } from '@/lib/prometheus'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Cluster = {
  name: string
  prometheusUrl: string
}

type PrometheusNamespaceResult = {
  metric: {
    namespace?: string
  }
}

export async function GET(req: Request) {
  const session = await requireApiRole('viewer')

  if (session instanceof NextResponse) {
    return session
  }

  try {
    const { searchParams } = new URL(req.url)
    const clustersParam = searchParams.get('clusters')
    const namespacesParam = searchParams.get('namespaces')

    const allClusters = await getClusters()

    let selectedClusters: Cluster[]
    if (!clustersParam) {
      selectedClusters = allClusters
    } else {
      const requested = new Set(clustersParam.split(',').map((c) => c.trim()))
      selectedClusters = allClusters.filter((c) => requested.has(c.name))
    }

    const requestedNamespaces = namespacesParam
      ? new Set(
          namespacesParam
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
        )
      : null

    const query = 'kube_namespace_created'

    const responses = await Promise.all(
      selectedClusters.map(async (cluster) => {
        const { results } = await queryPrometheusVector<PrometheusNamespaceResult>(
          cluster.prometheusUrl,
          query,
          { logPrefix: 'namespaces' }
        )

        return results.flatMap((item) =>
          item.metric.namespace
            ? [
                {
                  cluster: cluster.name,
                  namespace: item.metric.namespace,
                },
              ]
            : []
        )
      })
    )

    const flatResults = responses.flat().filter((item) =>
      requestedNamespaces
        ? requestedNamespaces.has(`${item.cluster}:${item.namespace}`)
        : true
    )

    const seen = new Set<string>()
    const uniqueNamespaces: { cluster: string; namespace: string }[] = []

    for (const item of flatResults) {
      const key = `${item.cluster}:${item.namespace}`
      if (!seen.has(key)) {
        seen.add(key)
        uniqueNamespaces.push(item)
      }
    }

    const grouped: Record<
      string,
      {
        totalNamespaces: number;
        namespaces: string[];
      }
    > = {}

    for (const item of uniqueNamespaces) {
      if (!grouped[item.cluster]) {
        grouped[item.cluster] = {
          totalNamespaces: 0,
          namespaces: [],
        }
      }

      grouped[item.cluster].namespaces.push(item.namespace)
      grouped[item.cluster].totalNamespaces += 1
    }

    return NextResponse.json(
      {
        totalNamespaces: uniqueNamespaces.length,
        totalClusters: Object.keys(grouped).length,
        clusters: grouped,
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
