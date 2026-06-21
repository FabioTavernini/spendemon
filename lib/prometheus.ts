// Shared Prometheus query layer.
//
// Every page load fans out a large number of Prometheus queries (the cost
// report alone issues 6+ per cluster) and the API routes are all
// `dynamic = 'force-dynamic'`, so nothing is cached by Next. To avoid
// hammering a slow Prometheus on multi-cluster setups this module adds three
// things on top of the raw HTTP query:
//
//   1. A short-TTL in-memory cache keyed by the full request URL. The URL
//      encodes the cluster (host) and the query (which carries any namespace /
//      pod filter), so identical queries across overlapping requests are
//      served from memory.
//   2. In-flight coalescing: concurrent callers asking for the same URL share a
//      single outbound request instead of each issuing their own.
//   3. A per-host concurrency cap so the fan-out cannot open an unbounded
//      number of simultaneous connections to one Prometheus.
//
// TTL and concurrency are configurable via environment variables:
//   SPENDEMON_PROMETHEUS_CACHE_TTL_SECONDS  (default 15, 0 disables caching)
//   SPENDEMON_PROMETHEUS_MAX_CONCURRENCY    (default 8, per Prometheus host)

export type PrometheusVectorResult = {
  metric: Record<string, string | undefined>
  value: [number | string, string]
}

export type PrometheusRangeResult = {
  metric: Record<string, string>
  values: [number, string][]
}

export type PrometheusQueryOutcome<Result> = {
  success: boolean
  results: Result[]
}

type PrometheusResponse<Result> = {
  status?: string
  data?: {
    result?: Result[]
  }
}

const DEFAULT_TTL_MS = 15_000
const DEFAULT_MAX_CONCURRENCY = 8

function cacheTtlMs(): number {
  const raw = Number(process.env.SPENDEMON_PROMETHEUS_CACHE_TTL_SECONDS)
  if (Number.isFinite(raw) && raw >= 0) {
    return raw * 1000
  }
  return DEFAULT_TTL_MS
}

function maxConcurrency(): number {
  const raw = Number(process.env.SPENDEMON_PROMETHEUS_MAX_CONCURRENCY)
  if (Number.isFinite(raw) && raw > 0) {
    return Math.floor(raw)
  }
  return DEFAULT_MAX_CONCURRENCY
}

// ---------------------------------------------------------------------------
// Per-host concurrency limiting
// ---------------------------------------------------------------------------

type HostLimiter = {
  active: number
  queue: (() => void)[]
}

const limiters = new Map<string, HostLimiter>()

function hostKey(prometheusUrl: string): string {
  try {
    return new URL(prometheusUrl).origin
  } catch {
    return prometheusUrl
  }
}

async function withHostLimit<T>(
  prometheusUrl: string,
  run: () => Promise<T>
): Promise<T> {
  const key = hostKey(prometheusUrl)
  const limit = maxConcurrency()

  let limiter = limiters.get(key)
  if (!limiter) {
    limiter = { active: 0, queue: [] }
    limiters.set(key, limiter)
  }

  // Acquire a slot. If one is free we take it directly; otherwise we wait for a
  // running request to hand its slot over to us (active is not decremented on a
  // hand-off, so it always reflects running + reserved slots).
  if (limiter.active < limit) {
    limiter.active += 1
  } else {
    await new Promise<void>((resolve) => limiter!.queue.push(resolve))
  }

  try {
    return await run()
  } finally {
    const next = limiter.queue.shift()
    if (next) {
      next()
    } else {
      limiter.active -= 1
    }
  }
}

// ---------------------------------------------------------------------------
// TTL cache + in-flight coalescing
// ---------------------------------------------------------------------------

type CacheEntry = {
  expiresAt: number
  outcome: Promise<PrometheusQueryOutcome<unknown>>
}

const cache = new Map<string, CacheEntry>()

function getCached<Result>(
  key: string,
  run: () => Promise<PrometheusQueryOutcome<Result>>
): Promise<PrometheusQueryOutcome<Result>> {
  const now = Date.now()
  const existing = cache.get(key)

  if (existing && existing.expiresAt > now) {
    return existing.outcome as Promise<PrometheusQueryOutcome<Result>>
  }

  const ttl = cacheTtlMs()
  const outcome = run()
    .then((result) => {
      // Never cache a failure for the full TTL — evict it so the next caller
      // retries. Concurrent callers still share this in-flight promise.
      if (!result.success || ttl === 0) {
        cache.delete(key)
      }
      return result
    })
    .catch((error) => {
      cache.delete(key)
      throw error
    })

  cache.set(key, { expiresAt: now + ttl, outcome })
  return outcome
}

// ---------------------------------------------------------------------------
// Raw fetch (shared by instant and range queries)
// ---------------------------------------------------------------------------

async function fetchPrometheus<Result>(
  requestUrl: string,
  prometheusUrl: string,
  logPrefix: string
): Promise<PrometheusQueryOutcome<Result>> {
  return withHostLimit(prometheusUrl, async () => {
    let response: Response

    try {
      response = await fetch(requestUrl, { cache: 'no-store' })
    } catch (error) {
      console.warn(
        `[${logPrefix}] Failed to query Prometheus at "${prometheusUrl}":`,
        error
      )
      return { success: false, results: [] }
    }

    let payload: PrometheusResponse<Result>

    try {
      payload = (await response.json()) as PrometheusResponse<Result>
    } catch (error) {
      console.warn(
        `[${logPrefix}] Invalid Prometheus response from "${prometheusUrl}":`,
        error
      )
      return { success: false, results: [] }
    }

    if (!response.ok || payload.status !== 'success') {
      return { success: false, results: [] }
    }

    return { success: true, results: payload.data?.result ?? [] }
  })
}

// ---------------------------------------------------------------------------
// Public query helpers
// ---------------------------------------------------------------------------

export type PrometheusQueryOptions = {
  /** Prefix used in warning logs, e.g. "cost-reporting" or "nodes". */
  logPrefix?: string
}

/**
 * Run an instant (vector) query against `/api/v1/query`. Results are cached and
 * coalesced by request URL. Never throws — failures resolve to
 * `{ success: false, results: [] }`.
 */
export function queryPrometheusVector<Result = PrometheusVectorResult>(
  prometheusUrl: string,
  query: string,
  options: PrometheusQueryOptions = {}
): Promise<PrometheusQueryOutcome<Result>> {
  const logPrefix = options.logPrefix ?? 'prometheus'
  let requestUrl: string

  try {
    requestUrl = new URL(
      `/api/v1/query?query=${encodeURIComponent(query)}`,
      prometheusUrl
    ).toString()
  } catch (error) {
    console.warn(
      `[${logPrefix}] Invalid Prometheus URL "${prometheusUrl}":`,
      error
    )
    return Promise.resolve({ success: false, results: [] })
  }

  return getCached(requestUrl, () =>
    fetchPrometheus<Result>(requestUrl, prometheusUrl, logPrefix)
  )
}

/**
 * Run a range query against `/api/v1/query_range`. Results are cached and
 * coalesced by request URL (which includes start/end/step). Never throws.
 */
export function queryPrometheusRange<Result = PrometheusRangeResult>(
  prometheusUrl: string,
  query: string,
  start: number,
  end: number,
  step: string,
  options: PrometheusQueryOptions = {}
): Promise<PrometheusQueryOutcome<Result>> {
  const logPrefix = options.logPrefix ?? 'prometheus'
  let requestUrl: string

  try {
    const url = new URL('/api/v1/query_range', prometheusUrl)
    url.searchParams.set('query', query)
    url.searchParams.set('start', String(start))
    url.searchParams.set('end', String(end))
    url.searchParams.set('step', step)
    requestUrl = url.toString()
  } catch (error) {
    console.warn(
      `[${logPrefix}] Invalid Prometheus URL "${prometheusUrl}":`,
      error
    )
    return Promise.resolve({ success: false, results: [] })
  }

  return getCached(requestUrl, () =>
    fetchPrometheus<Result>(requestUrl, prometheusUrl, logPrefix)
  )
}

/** Clear the query cache and concurrency state. Intended for tests. */
export function clearPrometheusCache(): void {
  cache.clear()
  limiters.clear()
}
