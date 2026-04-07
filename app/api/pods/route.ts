// app/api/namespaces/route.ts
import { NextResponse } from 'next/server'

import { getClusters } from '@/lib/clusters'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Cluster = {
  name: string
  prometheusUrl: string
}

type PodItem = {
  cluster: string
  namespace: string
  pod: string
  status: string
}

type PrometheusPodResult = {
  metric: {
    namespace?: string
    pod?: string
    phase?: string
  }
}

type PrometheusResponse = {
  status?: string
  data?: {
    result?: PrometheusPodResult[]
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const clustersParam = searchParams.get('clusters')

    const allClusters = await getClusters()

    let selectedClusters: Cluster[]
    if (!clustersParam) {
      selectedClusters = allClusters
    } else {
      const requested = clustersParam.split(',').map((c) => c.trim())
      selectedClusters = allClusters.filter((c) => requested.includes(c.name))
    }

    const query = 'kube_pod_status_phase == 1'

    const responses = await Promise.all(
      selectedClusters.map(async (cluster): Promise<PodItem[]> => {
        try {
          const res = await fetch(
            `${cluster.prometheusUrl}/api/v1/query?query=${encodeURIComponent(query)}`
          )
          const data = (await res.json()) as PrometheusResponse

          if (data.status !== 'success') return []

          return (data.data?.result ?? []).flatMap((item) =>
            item.metric.namespace && item.metric.pod
              ? [
                  {
                    cluster: cluster.name,
                    namespace: item.metric.namespace,
                    pod: item.metric.pod,
                    status: item.metric.phase ?? 'Unknown',
                  },
                ]
              : []
          )
        } catch (err) {
          console.error(`Error querying cluster ${cluster.name}:`, err)
          return []
        }
      })
    )

    const flatResults = responses.flat()

    // Dedupe by cluster + namespace + pod
    const seen = new Set<string>()
    const uniquePods: PodItem[] = []

    for (const item of flatResults) {
      const key = `${item.cluster}:${item.namespace}:${item.pod}`
      if (!seen.has(key)) {
        seen.add(key)
        uniquePods.push(item)
      }
    }

    // Group by cluster -> namespace -> pods[]
    const grouped: Record<
      string,
      {
        totalPods: number;
        namespaces: Record<string, { pod: string; status: string }[]>;
      }
    > = {}

    for (const item of uniquePods) {
      if (!grouped[item.cluster]) {
        grouped[item.cluster] = {
          totalPods: 0,
          namespaces: {},
        }
      }

      if (!grouped[item.cluster].namespaces[item.namespace]) {
        grouped[item.cluster].namespaces[item.namespace] = []
      }

      grouped[item.cluster].namespaces[item.namespace].push({
        pod: item.pod,
        status: item.status,
      })
      grouped[item.cluster].totalPods += 1
    }

    return NextResponse.json(
      {
        totalPods: uniquePods.length,
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
