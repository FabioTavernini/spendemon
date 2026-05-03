// Spendemon - K8s Cost monitoring
// Copyright (c) 2026 Fabio Tavernini

// This file is licensed under the Personal-Use Free License 1.0 for personal use.
// Commercial use requires a separate commercial license. See LICENSE and COMMERCIAL_LICENSE.md

import { NextResponse } from 'next/server'
import { requireApiRole } from '@/lib/authorization'
import { getClusters } from '@/lib/clusters'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BYTES_PER_GB = 1024 * 1024 * 1024

type RangeQueryResult = {
  metric: Record<string, string>
  values: [number, string][]
}

type PrometheusRangeResponse = {
  status?: string
  data?: {
    resultType?: string
    result?: RangeQueryResult[]
  }
}

export type PodHistoryPoint = {
  timestamp: number
  cpuCores: number | null
  memoryGb: number | null
}

async function queryPrometheusRange(
  prometheusUrl: string,
  query: string,
  start: number,
  end: number,
  step: string,
): Promise<RangeQueryResult[]> {
  let requestUrl: string

  try {
    const url = new URL('/api/v1/query_range', prometheusUrl)
    url.searchParams.set('query', query)
    url.searchParams.set('start', String(start))
    url.searchParams.set('end', String(end))
    url.searchParams.set('step', step)
    requestUrl = url.toString()
  } catch {
    return []
  }

  try {
    const response = await fetch(requestUrl, { cache: 'no-store' })
    const payload = (await response.json()) as PrometheusRangeResponse

    if (!response.ok || payload.status !== 'success') {
      return []
    }

    return payload.data?.result ?? []
  } catch {
    return []
  }
}

async function queryFirstRangeMetric(
  prometheusUrl: string,
  queries: string[],
  start: number,
  end: number,
  step: string,
): Promise<RangeQueryResult[]> {
  for (const query of queries) {
    const results = await queryPrometheusRange(prometheusUrl, query, start, end, step)
    if (results.length > 0) {
      return results
    }
  }
  return []
}

export async function GET(req: Request) {
  const session = await requireApiRole('viewer')
  if (session instanceof NextResponse) return session

  const { searchParams } = new URL(req.url)
  const clusterName = searchParams.get('cluster')
  const namespace = searchParams.get('namespace')
  const pod = searchParams.get('pod')

  if (!clusterName || !namespace || !pod) {
    return NextResponse.json({ error: 'Missing required params: cluster, namespace, pod' }, { status: 400 })
  }

  const clusters = await getClusters()
  const cluster = clusters.find((c) => c.name === clusterName)

  if (!cluster) {
    return NextResponse.json({ error: `Cluster "${clusterName}" not found` }, { status: 404 })
  }

  const now = Math.floor(Date.now() / 1000)
  const start = now - 24 * 60 * 60
  const step = '5m'

  const cpuQueries = [
    `sum by (namespace, pod) (rate(container_cpu_usage_seconds_total{container!="",container!="POD",namespace="${namespace}",pod="${pod}"}[5m]))`,
    `sum by (namespace, pod) (rate(container_cpu_usage_seconds_total{image!="",namespace="${namespace}",pod="${pod}"}[5m]))`,
    `sum by (namespace, pod) (rate(container_cpu_usage_seconds_total{namespace="${namespace}",pod="${pod}"}[5m]))`,
  ]

  const memoryQueries = [
    `sum by (namespace, pod) (container_memory_working_set_bytes{container!="",container!="POD",namespace="${namespace}",pod="${pod}"})`,
    `sum by (namespace, pod) (container_memory_working_set_bytes{image!="",namespace="${namespace}",pod="${pod}"})`,
    `sum by (namespace, pod) (container_memory_working_set_bytes{namespace="${namespace}",pod="${pod}"})`,
    `sum by (namespace, pod) (container_memory_usage_bytes{namespace="${namespace}",pod="${pod}"})`,
  ]

  const [cpuResults, memResults] = await Promise.all([
    queryFirstRangeMetric(cluster.prometheusUrl, cpuQueries, start, now, step),
    queryFirstRangeMetric(cluster.prometheusUrl, memoryQueries, start, now, step),
  ])

  const cpuSeries = cpuResults[0]?.values ?? []
  const memSeries = memResults[0]?.values ?? []

  const cpuMap = new Map<number, number>()
  for (const [ts, val] of cpuSeries) {
    cpuMap.set(ts, Number(val))
  }

  const memMap = new Map<number, number>()
  for (const [ts, val] of memSeries) {
    memMap.set(ts, Number(val) / BYTES_PER_GB)
  }

  const allTimestamps = Array.from(new Set([...cpuMap.keys(), ...memMap.keys()])).sort((a, b) => a - b)

  const history: PodHistoryPoint[] = allTimestamps.map((ts) => ({
    timestamp: ts * 1000,
    cpuCores: cpuMap.has(ts) ? cpuMap.get(ts)! : null,
    memoryGb: memMap.has(ts) ? memMap.get(ts)! : null,
  }))

  return NextResponse.json({ pod, namespace, cluster: clusterName, history })
}
