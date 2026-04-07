// app/api/namespaces/route.ts
import { NextResponse } from 'next/server'

import { getClusters } from '@/lib/clusters'

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

type PrometheusResponse = {
  status?: string
  data?: {
    result?: PrometheusNamespaceResult[]
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const clustersParam = searchParams.get('clusters')
    const namespacesParam = searchParams.get('namespaces')

    const allClusters = await getClusters()

    let selectedClusters: Cluster[]
    if (!clustersParam) {
      selectedClusters = allClusters
    } else {
      const requested = clustersParam.split(',').map((c) => c.trim())
      selectedClusters = allClusters.filter((c) => requested.includes(c.name))
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
        try {
          const res = await fetch(
            `${cluster.prometheusUrl}/api/v1/query?query=${encodeURIComponent(query)}`,
            { cache: 'no-store' }
          )

          const data = (await res.json()) as PrometheusResponse
          if (data.status !== 'success') return []

          return (data.data?.result ?? []).flatMap((item) =>
            item.metric.namespace
              ? [
                  {
                    cluster: cluster.name,
                    namespace: item.metric.namespace,
                  },
                ]
              : []
          )
        } catch (err) {
          console.error(`Error querying namespaces for ${cluster.name}:`, err)
          return []
        }
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
