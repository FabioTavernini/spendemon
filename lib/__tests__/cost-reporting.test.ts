import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getCostReport, getNamespaceAverages } from '../cost-reporting'

// getClusters is mocked wholesale so each test controls the cluster list and
// its Prometheus endpoint (the hostname is used to route the fetch mock).
vi.mock('@/lib/clusters', () => ({
  getClusters: vi.fn(),
}))

// The settings module is only partially mocked: the real YAML parsers
// (parseCostsFromSettings, parseSharedNamespacesFromSettings) still run so the
// tests cover the genuine settings-to-rates path, while file IO is stubbed.
vi.mock('@/lib/settings', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/settings')>()
  return { ...actual, readSettingsFile: vi.fn() }
})

import { getClusters } from '@/lib/clusters'
import { clearPrometheusCache } from '@/lib/prometheus'
import { readSettingsFile } from '@/lib/settings'

const mockGetClusters = vi.mocked(getClusters)
const mockReadSettings = vi.mocked(readSettingsFile)

const GB = 1024 * 1024 * 1024

// ---------------------------------------------------------------------------
// Test doubles for Prometheus
// ---------------------------------------------------------------------------

type Entry = { namespace: string; pod?: string; value: number; phase?: string }

type ClusterFixture = {
  status?: Entry[]
  cpuRequest?: Entry[] // cores
  memoryRequest?: Entry[] // bytes
  storage?: Entry[] // bytes
  cpuUsage?: Entry[] // cores
  memoryUsage?: Entry[] // bytes
  nsAvgCpu?: Entry[] // cores, keyed by namespace
  nsAvgMem?: Entry[] // bytes, keyed by namespace
  fail?: boolean
}

type RawResult = {
  metric: { namespace?: string; pod?: string; phase?: string }
  value: [number, string]
}

function vec(entries: Entry[] = []): RawResult[] {
  return entries.map((e) => ({
    metric: {
      namespace: e.namespace,
      ...(e.pod ? { pod: e.pod } : {}),
      ...(e.phase ? { phase: e.phase } : {}),
    },
    value: [0, String(e.value)],
  }))
}

// Routes a PromQL query string to the matching slice of a cluster fixture.
// Mirrors the metric families queried by cost-reporting.ts.
function resultsFor(fx: ClusterFixture, query: string): RawResult[] {
  if (query.includes('kube_pod_status_phase')) return vec(fx.status)

  // Namespace-average panel: aggregated by namespace only (no pod) and wrapped
  // in avg_over_time. The pod-level range queries below also use avg_over_time,
  // but aggregate by (namespace, pod) — so they fall through to the metric
  // family branches and route by their inner metric name.
  if (
    query.includes('avg_over_time') &&
    query.includes('by (namespace)') &&
    !query.includes('by (namespace, pod)')
  ) {
    if (query.includes('container_cpu_usage')) return vec(fx.nsAvgCpu)
    return vec(fx.nsAvgMem)
  }

  // Ephemeral storage requests share the kube_pod_container_resource_requests
  // metric name, so this must be checked before the cpu/memory branches.
  if (query.includes('ephemeral')) return vec(fx.storage)

  if (query.includes('kube_pod_container_resource_requests')) {
    if (query.includes('resource="cpu"')) return vec(fx.cpuRequest)
    if (query.includes('resource="memory"')) return vec(fx.memoryRequest)
  }

  if (query.includes('container_cpu_usage_seconds_total')) return vec(fx.cpuUsage)
  if (query.includes('container_memory')) return vec(fx.memoryUsage)

  return []
}

let fixtures: Record<string, ClusterFixture> = {}
// Every PromQL string issued during a test, in order — lets range tests assert
// the subquery wrapping (avg_over_time / max_over_time) actually went out.
let capturedQueries: string[] = []

function configure(
  clusters: { name: string; prometheusUrl: string }[],
  settings: string,
) {
  mockGetClusters.mockResolvedValue(clusters)
  mockReadSettings.mockResolvedValue(settings)
}

function settingsYaml({
  cpuCore = 0,
  memoryGb = 0,
  storageGb = 0,
  shared = [] as string[],
} = {}): string {
  const sharedBlock = shared.length
    ? `sharednamespaces:\n${shared.map((s) => `  - ${s}`).join('\n')}\n`
    : ''
  return `clusters:
  - name: placeholder
    prometheusUrl: http://placeholder:9090
costs:
  cpuCore: ${cpuCore}
  memoryGb: ${memoryGb}
  storageGb: ${storageGb}
${sharedBlock}`
}

beforeEach(() => {
  fixtures = {}
  capturedQueries = []
  vi.clearAllMocks()
  // The shared Prometheus layer caches by request URL; clear it between tests
  // so a cluster's fixture changes are never served stale from a prior test.
  clearPrometheusCache()

  global.fetch = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input))
    const fx = fixtures[url.hostname]

    if (!fx || fx.fail) {
      throw new Error(`connection refused for ${url.hostname}`)
    }

    const query = url.searchParams.get('query') ?? ''
    capturedQueries.push(query)
    const result = resultsFor(fx, query)

    return {
      ok: true,
      json: async () => ({ status: 'success', data: { result } }),
    } as Response
  }) as typeof fetch
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// getCostReport — core cost math
// ---------------------------------------------------------------------------

describe('getCostReport — cost math and unit conversion', () => {
  it('computes per-resource cost from requested cpu, memory, and storage', async () => {
    fixtures.prod = {
      status: [{ namespace: 'app', pod: 'web-1', phase: 'Running', value: 1 }],
      cpuRequest: [{ namespace: 'app', pod: 'web-1', value: 2 }],
      memoryRequest: [{ namespace: 'app', pod: 'web-1', value: 4 * GB }],
      storage: [{ namespace: 'app', pod: 'web-1', value: 10 * GB }],
    }
    configure(
      [{ name: 'prod', prometheusUrl: 'http://prod:9090' }],
      settingsYaml({ cpuCore: 10, memoryGb: 5, storageGb: 1 }),
    )

    const report = await getCostReport()
    const pod = report.clusters.prod.namespaces.app.pods[0]

    // bytes are converted to GB before pricing
    expect(pod.cpuCores).toBe(2)
    expect(pod.memoryGb).toBe(4)
    expect(pod.storageGb).toBe(10)

    expect(pod.cpuCost).toBe(20) // 2 cores * 10
    expect(pod.memoryCost).toBe(20) // 4 GB * 5
    expect(pod.storageCost).toBe(10) // 10 GB * 1
    expect(pod.totalCost).toBe(50)

    expect(pod.status).toBe('Running')
    expect(pod.isEstimated).toBe(false)
    expect(pod.estimatedResources).toEqual([])
  })

  it('rolls totals up through namespace, cluster, and report levels', async () => {
    fixtures.prod = {
      status: [
        { namespace: 'app', pod: 'web-1', phase: 'Running', value: 1 },
        { namespace: 'app', pod: 'web-2', phase: 'Running', value: 1 },
        { namespace: 'db', pod: 'pg-1', phase: 'Running', value: 1 },
      ],
      cpuRequest: [
        { namespace: 'app', pod: 'web-1', value: 1 },
        { namespace: 'app', pod: 'web-2', value: 2 },
        { namespace: 'db', pod: 'pg-1', value: 3 },
      ],
    }
    configure(
      [{ name: 'prod', prometheusUrl: 'http://prod:9090' }],
      settingsYaml({ cpuCore: 10 }),
    )

    const report = await getCostReport()

    const appNs = report.clusters.prod.namespaces.app
    expect(appNs.totalPods).toBe(2)
    expect(appNs.totalCpuCores).toBe(3)
    expect(appNs.totalCost).toBe(30)

    const cluster = report.clusters.prod
    expect(cluster.totalPods).toBe(3)
    expect(cluster.totalNamespaces).toBe(2)
    expect(cluster.totalCpuCores).toBe(6)
    expect(cluster.totalCost).toBe(60)

    expect(report.totalClusters).toBe(1)
    expect(report.totalNamespaces).toBe(2)
    expect(report.totalPods).toBe(3)
    expect(report.totalCost).toBe(60)
    expect(report.rates).toEqual({ cpuCore: 10, memoryGb: 0, storageGb: 0 })
  })

  it('aggregates across multiple clusters', async () => {
    fixtures.prod = {
      status: [{ namespace: 'app', pod: 'web-1', phase: 'Running', value: 1 }],
      cpuRequest: [{ namespace: 'app', pod: 'web-1', value: 2 }],
    }
    fixtures.staging = {
      status: [{ namespace: 'app', pod: 'web-1', phase: 'Running', value: 1 }],
      cpuRequest: [{ namespace: 'app', pod: 'web-1', value: 1 }],
    }
    configure(
      [
        { name: 'prod', prometheusUrl: 'http://prod:9090' },
        { name: 'staging', prometheusUrl: 'http://staging:9090' },
      ],
      settingsYaml({ cpuCore: 10 }),
    )

    const report = await getCostReport()

    expect(report.totalClusters).toBe(2)
    expect(report.clusters.prod.totalCost).toBe(20)
    expect(report.clusters.staging.totalCost).toBe(10)
    expect(report.totalCost).toBe(30)
  })

  it('rounds resource and cost values to four decimal places', async () => {
    fixtures.prod = {
      status: [{ namespace: 'app', pod: 'web-1', phase: 'Running', value: 1 }],
      cpuRequest: [{ namespace: 'app', pod: 'web-1', value: 0.123456789 }],
    }
    configure(
      [{ name: 'prod', prometheusUrl: 'http://prod:9090' }],
      settingsYaml({ cpuCore: 1 }),
    )

    const report = await getCostReport()
    const pod = report.clusters.prod.namespaces.app.pods[0]

    expect(pod.cpuCores).toBe(0.1235)
    expect(pod.cpuCost).toBe(0.1235)
  })
})

// ---------------------------------------------------------------------------
// getCostReport — estimation fallback
// ---------------------------------------------------------------------------

describe('getCostReport — estimation fallback', () => {
  it('falls back to usage metrics when requests are absent and flags the pod', async () => {
    fixtures.prod = {
      status: [{ namespace: 'jobs', pod: 'batch-1', phase: 'Running', value: 1 }],
      // no cpuRequest / memoryRequest
      cpuUsage: [{ namespace: 'jobs', pod: 'batch-1', value: 0.5 }],
      memoryUsage: [{ namespace: 'jobs', pod: 'batch-1', value: 2 * GB }],
    }
    configure(
      [{ name: 'prod', prometheusUrl: 'http://prod:9090' }],
      settingsYaml({ cpuCore: 10, memoryGb: 5 }),
    )

    const report = await getCostReport()
    const pod = report.clusters.prod.namespaces.jobs.pods[0]

    expect(pod.cpuCores).toBe(0.5)
    expect(pod.memoryGb).toBe(2)
    expect(pod.cpuCost).toBe(5)
    expect(pod.memoryCost).toBe(10)
    expect(pod.totalCost).toBe(15)

    expect(pod.isEstimated).toBe(true)
    expect(pod.estimatedResources).toEqual(['cpu', 'memory'])
    expect(report.clusters.prod.namespaces.jobs.estimatedPodCount).toBe(1)
    expect(report.estimatedPodCount).toBe(1)
  })

  it('prefers requested values over usage when both are present', async () => {
    fixtures.prod = {
      status: [{ namespace: 'app', pod: 'web-1', phase: 'Running', value: 1 }],
      cpuRequest: [{ namespace: 'app', pod: 'web-1', value: 2 }],
      cpuUsage: [{ namespace: 'app', pod: 'web-1', value: 0.3 }],
    }
    configure(
      [{ name: 'prod', prometheusUrl: 'http://prod:9090' }],
      settingsYaml({ cpuCore: 10 }),
    )

    const report = await getCostReport()
    const pod = report.clusters.prod.namespaces.app.pods[0]

    expect(pod.cpuCores).toBe(2)
    expect(pod.isEstimated).toBe(false)
    expect(pod.estimatedResources).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// getCostReport — shared namespace allocation
// ---------------------------------------------------------------------------

describe('getCostReport — shared namespace allocation', () => {
  it('redistributes a shared namespace cost across recipients and conserves the total', async () => {
    fixtures.prod = {
      status: [
        { namespace: 'shared', pod: 'ingress-1', phase: 'Running', value: 1 },
        { namespace: 'app', pod: 'web-1', phase: 'Running', value: 1 },
        { namespace: 'app2', pod: 'api-1', phase: 'Running', value: 1 },
      ],
      cpuRequest: [
        { namespace: 'shared', pod: 'ingress-1', value: 4 },
        { namespace: 'app', pod: 'web-1', value: 1 },
        { namespace: 'app2', pod: 'api-1', value: 1 },
      ],
    }
    configure(
      [{ name: 'prod', prometheusUrl: 'http://prod:9090' }],
      settingsYaml({ cpuCore: 10, shared: ['shared'] }),
    )

    const report = await getCostReport()
    const namespaces = report.clusters.prod.namespaces

    // the shared namespace is removed from the output
    expect(namespaces.shared).toBeUndefined()
    expect(Object.keys(namespaces).sort()).toEqual(['app', 'app2'])

    // shared cost (40) split evenly across the two recipients (20 each)
    expect(namespaces.app.totalCost).toBe(30) // 10 + 20
    expect(namespaces.app2.totalCost).toBe(30) // 10 + 20
    expect(namespaces.app.pods[0].totalCost).toBe(30)

    // total cost is conserved: 40 + 10 + 10 === 30 + 30
    expect(report.clusters.prod.totalCost).toBe(60)
    expect(report.clusters.prod.totalNamespaces).toBe(2)
  })

  it('is a no-op when there are no recipient namespaces', async () => {
    fixtures.prod = {
      status: [{ namespace: 'shared', pod: 'ingress-1', phase: 'Running', value: 1 }],
      cpuRequest: [{ namespace: 'shared', pod: 'ingress-1', value: 4 }],
    }
    configure(
      [{ name: 'prod', prometheusUrl: 'http://prod:9090' }],
      settingsYaml({ cpuCore: 10, shared: ['shared'] }),
    )

    const report = await getCostReport()

    expect(report.clusters.prod.namespaces.shared.totalCost).toBe(40)
    expect(report.clusters.prod.totalCost).toBe(40)
  })
})

// ---------------------------------------------------------------------------
// getCostReport — filtering
// ---------------------------------------------------------------------------

describe('getCostReport — filtering', () => {
  beforeEach(() => {
    fixtures.prod = {
      status: [{ namespace: 'app', pod: 'web-1', phase: 'Running', value: 1 }],
      cpuRequest: [{ namespace: 'app', pod: 'web-1', value: 2 }],
    }
    fixtures.staging = {
      status: [{ namespace: 'app', pod: 'web-1', phase: 'Running', value: 1 }],
      cpuRequest: [{ namespace: 'app', pod: 'web-1', value: 1 }],
    }
    configure(
      [
        { name: 'prod', prometheusUrl: 'http://prod:9090' },
        { name: 'staging', prometheusUrl: 'http://staging:9090' },
      ],
      settingsYaml({ cpuCore: 10 }),
    )
  })

  it('limits the report to the requested clusters', async () => {
    const report = await getCostReport(['prod'])

    expect(Object.keys(report.clusters)).toEqual(['prod'])
    expect(report.totalClusters).toBe(1)
    expect(report.totalCost).toBe(20)
  })

  it('limits the report to the requested cluster:namespace pairs', async () => {
    fixtures.prod.status!.push({
      namespace: 'db',
      pod: 'pg-1',
      phase: 'Running',
      value: 1,
    })
    fixtures.prod.cpuRequest!.push({ namespace: 'db', pod: 'pg-1', value: 5 })

    const report = await getCostReport(['prod'], ['prod:app'])

    expect(Object.keys(report.clusters.prod.namespaces)).toEqual(['app'])
    expect(report.clusters.prod.totalCost).toBe(20)
  })
})

// ---------------------------------------------------------------------------
// getCostReport — resilience
// ---------------------------------------------------------------------------

describe('getCostReport — resilience', () => {
  it('continues rendering other clusters when one cannot be queried', async () => {
    fixtures.prod = {
      status: [{ namespace: 'app', pod: 'web-1', phase: 'Running', value: 1 }],
      cpuRequest: [{ namespace: 'app', pod: 'web-1', value: 2 }],
    }
    fixtures.broken = { fail: true }
    configure(
      [
        { name: 'prod', prometheusUrl: 'http://prod:9090' },
        { name: 'broken', prometheusUrl: 'http://broken:9090' },
      ],
      settingsYaml({ cpuCore: 10 }),
    )

    const report = await getCostReport()

    expect(report.clusters.prod.totalCost).toBe(20)
    expect(report.clusters.broken.totalPods).toBe(0)
    expect(report.clusters.broken.totalCost).toBe(0)
    expect(report.totalCost).toBe(20)
  })
})

// ---------------------------------------------------------------------------
// getNamespaceAverages
// ---------------------------------------------------------------------------

describe('getNamespaceAverages', () => {
  it('computes 24h average cost per namespace, keyed by cluster:namespace', async () => {
    fixtures.prod = {
      nsAvgCpu: [{ namespace: 'app', value: 2 }],
      nsAvgMem: [{ namespace: 'app', value: 4 * GB }],
    }
    configure(
      [{ name: 'prod', prometheusUrl: 'http://prod:9090' }],
      settingsYaml({ cpuCore: 10, memoryGb: 5 }),
    )

    const averages = await getNamespaceAverages()
    const app = averages.get('prod:app')

    expect(app).toBeDefined()
    expect(app!.avgCpuCores).toBe(2)
    expect(app!.avgMemoryGb).toBe(4)
    expect(app!.avgCpuCost).toBe(20)
    expect(app!.avgMemoryCost).toBe(20)
    expect(app!.avgTotalCost).toBe(40)
  })

  it('applies the cluster:namespace filter', async () => {
    fixtures.prod = {
      nsAvgCpu: [
        { namespace: 'app', value: 2 },
        { namespace: 'db', value: 3 },
      ],
      nsAvgMem: [
        { namespace: 'app', value: 1 * GB },
        { namespace: 'db', value: 1 * GB },
      ],
    }
    configure(
      [{ name: 'prod', prometheusUrl: 'http://prod:9090' }],
      settingsYaml({ cpuCore: 10, memoryGb: 5 }),
    )

    const averages = await getNamespaceAverages(['prod'], ['prod:app'])

    expect([...averages.keys()]).toEqual(['prod:app'])
  })
})

// ---------------------------------------------------------------------------
// Time-range selection
// ---------------------------------------------------------------------------

describe('getCostReport — time range', () => {
  it('issues instant (unwrapped) queries for the default "now" range', async () => {
    fixtures.prod = {
      status: [{ namespace: 'app', pod: 'web-1', phase: 'Running', value: 1 }],
      cpuRequest: [{ namespace: 'app', pod: 'web-1', value: 2 }],
    }
    configure(
      [{ name: 'prod', prometheusUrl: 'http://prod:9090' }],
      settingsYaml({ cpuCore: 10 }),
    )

    await getCostReport(undefined, undefined, 'now')

    expect(capturedQueries.some((q) => q.includes('over_time'))).toBe(false)
    expect(capturedQueries).toContain('kube_pod_status_phase == 1')
  })

  it('wraps pod-level queries in avg/max_over_time subqueries for a range', async () => {
    fixtures.prod = {
      status: [{ namespace: 'app', pod: 'web-1', phase: 'Running', value: 1 }],
      cpuRequest: [{ namespace: 'app', pod: 'web-1', value: 2 }],
      memoryRequest: [{ namespace: 'app', pod: 'web-1', value: 4 * GB }],
      storage: [{ namespace: 'app', pod: 'web-1', value: 10 * GB }],
    }
    configure(
      [{ name: 'prod', prometheusUrl: 'http://prod:9090' }],
      settingsYaml({ cpuCore: 10, memoryGb: 5, storageGb: 1 }),
    )

    const report = await getCostReport(undefined, undefined, '7d')

    // 7 days -> 604800s window, 1h step
    expect(
      capturedQueries.some(
        (q) =>
          q.startsWith('max_over_time((kube_pod_status_phase == 1)[604800s:1h]'),
      ),
    ).toBe(true)
    expect(
      capturedQueries.some(
        (q) =>
          q.includes('avg_over_time((') &&
          q.includes('resource="cpu"') &&
          q.includes('[604800s:1h]'),
      ),
    ).toBe(true)

    // The wrapping is transparent to the cost math: scalar-per-series in,
    // identical totals out.
    const pod = report.clusters.prod.namespaces.app.pods[0]
    expect(pod.cpuCost).toBe(20)
    expect(pod.memoryCost).toBe(20)
    expect(pod.storageCost).toBe(10)
    expect(pod.totalCost).toBe(50)
  })

  it('resolves the "this month" window to a positive duration', async () => {
    fixtures.prod = {
      status: [{ namespace: 'app', pod: 'web-1', phase: 'Running', value: 1 }],
      cpuRequest: [{ namespace: 'app', pod: 'web-1', value: 1 }],
    }
    configure(
      [{ name: 'prod', prometheusUrl: 'http://prod:9090' }],
      settingsYaml({ cpuCore: 10 }),
    )

    await getCostReport(undefined, undefined, 'month')

    const monthQuery = capturedQueries.find((q) => q.includes('avg_over_time(('))
    expect(monthQuery).toBeDefined()
    const window = monthQuery!.match(/\[(\d+)s:1h\]/)
    expect(window).not.toBeNull()
    expect(Number(window![1])).toBeGreaterThan(0)
  })
})

describe('getNamespaceAverages — time range', () => {
  it('uses the 24h/5m window for the default "now" range', async () => {
    fixtures.prod = {
      nsAvgCpu: [{ namespace: 'app', value: 2 }],
    }
    configure(
      [{ name: 'prod', prometheusUrl: 'http://prod:9090' }],
      settingsYaml({ cpuCore: 10 }),
    )

    await getNamespaceAverages(undefined, undefined, 'now')

    expect(
      capturedQueries.some(
        (q) => q.includes('avg_over_time((') && q.includes('[86400s:5m]'),
      ),
    ).toBe(true)
  })

  it('tracks the selected range window for the average panel', async () => {
    fixtures.prod = {
      nsAvgCpu: [{ namespace: 'app', value: 2 }],
    }
    configure(
      [{ name: 'prod', prometheusUrl: 'http://prod:9090' }],
      settingsYaml({ cpuCore: 10 }),
    )

    await getNamespaceAverages(undefined, undefined, '30d')

    expect(
      capturedQueries.some(
        (q) => q.includes('avg_over_time((') && q.includes('[2592000s:6h]'),
      ),
    ).toBe(true)
  })
})
