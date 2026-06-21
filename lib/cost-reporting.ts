import { getClusters } from "@/lib/clusters";
import { queryPrometheusVector as queryVector } from "@/lib/prometheus";
import {
  parseCostsFromSettings,
  parseSharedNamespacesFromSettings,
  readSettingsFile,
  type CostSettings,
} from "@/lib/settings";

const BYTES_PER_GB = 1024 * 1024 * 1024;

// Time-range selection. "now" keeps the original point-in-time snapshot
// (instant vector queries); the other presets wrap each instant expression in an
// avg_over_time/max_over_time subquery so a range collapses back into a single
// scalar per series, leaving the entire downstream cost pipeline unchanged.
export type CostRange = "now" | "24h" | "7d" | "30d" | "month";

export const COST_RANGES: readonly CostRange[] = [
  "now",
  "24h",
  "7d",
  "30d",
  "month",
];

export function parseCostRange(value: string | undefined | null): CostRange {
  return value && (COST_RANGES as readonly string[]).includes(value)
    ? (value as CostRange)
    : "now";
}

type RangeWindow = { windowSeconds: number; step: string };

const SECONDS_PER_DAY = 24 * 60 * 60;

function startOfMonthSeconds(now: number): number {
  const date = new Date(now * 1000);
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  return Math.floor(start.getTime() / 1000);
}

// Resolve a preset into a subquery window + resolution step. Steps are chosen to
// keep the number of evaluated points bounded (~150-300) regardless of window.
// Returns null for "now", which signals the instant (unwrapped) query path.
function resolveRange(range: CostRange, nowSeconds: number): RangeWindow | null {
  switch (range) {
    case "now":
      return null;
    case "24h":
      return { windowSeconds: SECONDS_PER_DAY, step: "5m" };
    case "7d":
      return { windowSeconds: 7 * SECONDS_PER_DAY, step: "1h" };
    case "30d":
      return { windowSeconds: 30 * SECONDS_PER_DAY, step: "6h" };
    case "month": {
      const windowSeconds = Math.max(
        nowSeconds - startOfMonthSeconds(nowSeconds),
        60,
      );
      return { windowSeconds, step: "1h" };
    }
  }
}

// Wrap an instant expression in an aggregation-over-time subquery. When `window`
// is null the expression is returned verbatim (the snapshot / instant path).
function wrapOverTime(
  fn: "avg_over_time" | "max_over_time",
  expr: string,
  window: RangeWindow | null,
): string {
  if (!window) {
    return expr;
  }
  return `${fn}((${expr})[${window.windowSeconds}s:${window.step}])`;
}

function withRange(expr: string, window: RangeWindow | null): string {
  return wrapOverTime("avg_over_time", expr, window);
}

function withRangeMax(expr: string, window: RangeWindow | null): string {
  return wrapOverTime("max_over_time", expr, window);
}

type QueryResult = {
  metric: {
    namespace?: string;
    pod?: string;
    phase?: string;
  };
  value: [number | string, string];
};

export type PodCost = {
  cluster: string;
  namespace: string;
  pod: string;
  status: string;
  cpuCores: number;
  memoryGb: number;
  storageGb: number;
  cpuCost: number;
  memoryCost: number;
  storageCost: number;
  totalCost: number;
  isEstimated: boolean;
  estimatedResources: string[];
};

export type NamespaceCostSummary = {
  totalPods: number;
  estimatedPodCount: number;
  totalCpuCores: number;
  totalMemoryGb: number;
  totalStorageGb: number;
  totalCost: number;
  pods: PodCost[];
};

export type ClusterCostSummary = {
  totalPods: number;
  totalNamespaces: number;
  estimatedPodCount: number;
  totalCpuCores: number;
  totalMemoryGb: number;
  totalStorageGb: number;
  totalCost: number;
  namespaces: Record<string, NamespaceCostSummary>;
};

export type CostReport = {
  generatedAt: string;
  rates: CostSettings;
  totalClusters: number;
  totalNamespaces: number;
  totalPods: number;
  estimatedPodCount: number;
  totalCpuCores: number;
  totalMemoryGb: number;
  totalStorageGb: number;
  totalCost: number;
  clusters: Record<string, ClusterCostSummary>;
};


type ClusterPodState = {
  cluster: string;
  namespace: string;
  pod: string;
  status: string;
  cpuCores: number;
  memoryGb: number;
  storageGb: number;
  estimatedResources: Set<string>;
};

type MetricValue = {
  namespace: string;
  pod: string;
  value: number;
};

async function queryPrometheusVector(
  prometheusUrl: string,
  query: string,
): Promise<QueryResult[]> {
  const { results } = await queryVector<QueryResult>(prometheusUrl, query, {
    logPrefix: "cost-reporting",
  });
  return results;
}

function parseMetricValues(
  results: QueryResult[],
  transformer?: (value: number) => number,
): MetricValue[] {
  return results.flatMap((item) => {
    const namespace = item.metric.namespace;
    const pod = item.metric.pod;
    const rawValue = Number(item.value?.[1] ?? 0);

    if (!namespace || !pod || !Number.isFinite(rawValue)) {
      return [];
    }

    return [
      {
        namespace,
        pod,
        value: transformer ? transformer(rawValue) : rawValue,
      },
    ];
  });
}

function upsertPodState(
  podMap: Map<string, ClusterPodState>,
  cluster: string,
  namespace: string,
  pod: string,
): ClusterPodState {
  const key = `${cluster}:${namespace}:${pod}`;
  const existing = podMap.get(key);

  if (existing) {
    return existing;
  }

  const next = {
    cluster,
    namespace,
    pod,
    status: "Unknown",
    cpuCores: 0,
    memoryGb: 0,
    storageGb: 0,
    estimatedResources: new Set<string>(),
  };

  podMap.set(key, next);
  return next;
}

async function queryFirstAvailableMetric(
  prometheusUrl: string,
  queries: string[],
  window: RangeWindow | null,
  transformer?: (value: number) => number,
): Promise<MetricValue[]> {
  for (const query of queries) {
    const results = await queryPrometheusVector(
      prometheusUrl,
      withRange(query, window),
    );

    if (results.length > 0) {
      return parseMetricValues(results, transformer);
    }
  }

  return [];
}

async function queryStorageMetrics(
  prometheusUrl: string,
  window: RangeWindow | null,
): Promise<MetricValue[]> {
  return queryFirstAvailableMetric(prometheusUrl, [
    'sum by (namespace, pod) (kube_pod_container_resource_requests{resource="ephemeral_storage",unit="byte"})',
    'sum by (namespace, pod) (kube_pod_container_resource_requests{resource="ephemeral-storage",unit="byte"})',
    "sum by (namespace, pod) (kube_pod_ephemeral_storage_request_bytes)",
  ], window, (value) => value / BYTES_PER_GB);
}

type ResourceKey = "cpuCores" | "memoryGb" | "storageGb";

// Direct assignment of a requested-resource metric (cpu/memory/storage).
function applyRequestMetric(
  podMap: Map<string, ClusterPodState>,
  clusterName: string,
  values: MetricValue[],
  key: ResourceKey,
): void {
  for (const item of values) {
    const podState = upsertPodState(podMap, clusterName, item.namespace, item.pod);
    podState[key] = item.value;
  }
}

// cAdvisor usage fallback: only fills a resource the request metric left at zero,
// and flags it as estimated when a non-zero usage value is substituted.
function applyUsageFallback(
  podMap: Map<string, ClusterPodState>,
  clusterName: string,
  values: MetricValue[],
  key: "cpuCores" | "memoryGb",
  resourceName: string,
): void {
  for (const item of values) {
    const podState = upsertPodState(podMap, clusterName, item.namespace, item.pod);
    if (podState[key] > 0) {
      continue;
    }
    podState[key] = item.value;
    if (item.value > 0) {
      podState.estimatedResources.add(resourceName);
    }
  }
}

async function buildClusterPodStates(
  cluster: {
    name: string;
    prometheusUrl: string;
  },
  window: RangeWindow | null,
) {
  const podStatusQuery = withRangeMax("kube_pod_status_phase == 1", window);
  const cpuQuery = withRange(
    'sum by (namespace, pod) (kube_pod_container_resource_requests{resource="cpu",unit="core"})',
    window,
  );
  const memoryQuery = withRange(
    'sum by (namespace, pod) (kube_pod_container_resource_requests{resource="memory",unit="byte"})',
    window,
  );
  const cpuUsageQueries = [
    'sum by (namespace, pod) (rate(container_cpu_usage_seconds_total{container!="",container!="POD"}[5m]))',
    'sum by (namespace, pod) (rate(container_cpu_usage_seconds_total{image!="",pod!=""}[5m]))',
    'sum by (namespace, pod) (rate(container_cpu_usage_seconds_total{pod!="",namespace!="",cpu="total"}[5m]))',
    'sum by (namespace, pod) (rate(container_cpu_usage_seconds_total{id=~".*pod.*",pod!="",namespace!="",cpu="total"}[5m]))',
    'sum by (namespace, pod) (label_replace(rate(container_cpu_usage_seconds_total{container_name!="",container_name!="POD",pod_name!=""}[5m]), "pod", "$1", "pod_name", "(.*)"))',
    'sum by (namespace, pod) (label_replace(rate(container_cpu_usage_seconds_total{cpu="total",pod_name!=""}[5m]), "pod", "$1", "pod_name", "(.*)"))',
  ];
  const memoryUsageQueries = [
    'sum by (namespace, pod) (container_memory_working_set_bytes{container!="",container!="POD"})',
    'sum by (namespace, pod) (container_memory_working_set_bytes{image!="",pod!=""})',
    'sum by (namespace, pod) (container_memory_working_set_bytes{pod!="",namespace!=""})',
    'sum by (namespace, pod) (container_memory_working_set_bytes{id=~".*pod.*",pod!="",namespace!=""})',
    'sum by (namespace, pod) (label_replace(container_memory_working_set_bytes{container_name!="",container_name!="POD",pod_name!=""}, "pod", "$1", "pod_name", "(.*)"))',
    'sum by (namespace, pod) (label_replace(container_memory_working_set_bytes{pod_name!=""}, "pod", "$1", "pod_name", "(.*)"))',
    'sum by (namespace, pod) (container_memory_usage_bytes{container!="",container!="POD"})',
    'sum by (namespace, pod) (container_memory_usage_bytes{image!="",pod!=""})',
    'sum by (namespace, pod) (container_memory_usage_bytes{pod!="",namespace!=""})',
    'sum by (namespace, pod) (container_memory_usage_bytes{id=~".*pod.*",pod!="",namespace!=""})',
    'sum by (namespace, pod) (label_replace(container_memory_usage_bytes{container_name!="",container_name!="POD",pod_name!=""}, "pod", "$1", "pod_name", "(.*)"))',
    'sum by (namespace, pod) (label_replace(container_memory_usage_bytes{pod_name!=""}, "pod", "$1", "pod_name", "(.*)"))',
    'sum by (namespace, pod) (container_memory_rss{container!="",container!="POD"})',
    'sum by (namespace, pod) (container_memory_rss{image!="",pod!=""})',
    'sum by (namespace, pod) (container_memory_rss{pod!="",namespace!=""})',
    'sum by (namespace, pod) (container_memory_rss{id=~".*pod.*",pod!="",namespace!=""})',
    'sum by (namespace, pod) (label_replace(container_memory_rss{container_name!="",container_name!="POD",pod_name!=""}, "pod", "$1", "pod_name", "(.*)"))',
    'sum by (namespace, pod) (label_replace(container_memory_rss{pod_name!=""}, "pod", "$1", "pod_name", "(.*)"))',
  ];

  const [
    statusResults,
    cpuResults,
    memoryResults,
    cpuUsageResults,
    memoryUsageResults,
    storageResults,
  ] =
    await Promise.all([
      queryPrometheusVector(cluster.prometheusUrl, podStatusQuery),
      queryPrometheusVector(cluster.prometheusUrl, cpuQuery),
      queryPrometheusVector(cluster.prometheusUrl, memoryQuery),
      queryFirstAvailableMetric(cluster.prometheusUrl, cpuUsageQueries, window),
      queryFirstAvailableMetric(
        cluster.prometheusUrl,
        memoryUsageQueries,
        window,
        (value) => value / BYTES_PER_GB,
      ),
      queryStorageMetrics(cluster.prometheusUrl, window),
    ]);

  const podMap = new Map<string, ClusterPodState>();

  for (const item of statusResults) {
    const namespace = item.metric.namespace;
    const pod = item.metric.pod;

    if (!namespace || !pod) {
      continue;
    }

    const podState = upsertPodState(podMap, cluster.name, namespace, pod);
    podState.status = item.metric.phase ?? "Unknown";
  }

  applyRequestMetric(podMap, cluster.name, parseMetricValues(cpuResults), "cpuCores");
  applyRequestMetric(
    podMap,
    cluster.name,
    parseMetricValues(memoryResults, (value) => value / BYTES_PER_GB),
    "memoryGb",
  );
  applyUsageFallback(podMap, cluster.name, cpuUsageResults, "cpuCores", "cpu");
  applyUsageFallback(podMap, cluster.name, memoryUsageResults, "memoryGb", "memory");
  applyRequestMetric(podMap, cluster.name, storageResults, "storageGb");

  return Array.from(podMap.values());
}

function round(value: number): number {
  return Number(value.toFixed(4));
}

function clonePodCost(pod: PodCost): PodCost {
  return { ...pod };
}

function cloneNamespaceCostSummary(
  summary: NamespaceCostSummary,
): NamespaceCostSummary {
  return {
    totalPods: summary.totalPods,
    estimatedPodCount: summary.estimatedPodCount,
    totalCpuCores: summary.totalCpuCores,
    totalMemoryGb: summary.totalMemoryGb,
    totalStorageGb: summary.totalStorageGb,
    totalCost: summary.totalCost,
    pods: summary.pods.map(clonePodCost),
  };
}

function applySharedNamespaceCosts(
  namespaces: Record<string, NamespaceCostSummary>,
  sharedNamespaces: Set<string>,
): Record<string, NamespaceCostSummary> {
  if (sharedNamespaces.size === 0) {
    return namespaces;
  }

  const sharedEntries = Object.entries(namespaces).filter(([namespace]) =>
    sharedNamespaces.has(namespace),
  );

  if (sharedEntries.length === 0) {
    return namespaces;
  }

  const recipientEntries = Object.entries(namespaces)
    .filter(([namespace]) => !sharedNamespaces.has(namespace))
    .map(
      ([namespace, summary]) =>
        [namespace, cloneNamespaceCostSummary(summary)] as const,
    );

  if (recipientEntries.length === 0) {
    return namespaces;
  }

  const nextNamespaces = Object.fromEntries(recipientEntries);

  for (const [, sharedSummary] of sharedEntries) {
    const cpuShare = sharedSummary.totalCpuCores / recipientEntries.length;
    const memoryShare = sharedSummary.totalMemoryGb / recipientEntries.length;
    const storageShare = sharedSummary.totalStorageGb / recipientEntries.length;
    const costShare = sharedSummary.totalCost / recipientEntries.length;

    for (const [, recipientSummary] of recipientEntries) {
      recipientSummary.totalCpuCores += cpuShare;
      recipientSummary.totalMemoryGb += memoryShare;
      recipientSummary.totalStorageGb += storageShare;
      recipientSummary.totalCost += costShare;

      const podShareCount = recipientSummary.pods.length;

      if (podShareCount === 0) {
        continue;
      }

      const cpuPerPod = cpuShare / podShareCount;
      const memoryPerPod = memoryShare / podShareCount;
      const storagePerPod = storageShare / podShareCount;
      const costPerPod = costShare / podShareCount;

      for (const pod of recipientSummary.pods) {
        pod.cpuCores += cpuPerPod;
        pod.memoryGb += memoryPerPod;
        pod.storageGb += storagePerPod;
        pod.totalCost += costPerPod;

        const resourceCostTotal =
          pod.cpuCost + pod.memoryCost + pod.storageCost;

        if (resourceCostTotal > 0) {
          const ratio = costPerPod / resourceCostTotal;
          pod.cpuCost += pod.cpuCost * ratio;
          pod.memoryCost += pod.memoryCost * ratio;
          pod.storageCost += pod.storageCost * ratio;
        } else {
          pod.cpuCost += costPerPod;
        }
      }
    }
  }

  return nextNamespaces;
}

export type NamespaceAverage = {
  avgCpuCores: number;
  avgMemoryGb: number;
  avgCpuCost: number;
  avgMemoryCost: number;
  avgTotalCost: number;
};

async function queryFirstAvailableNamespaceMetric(
  prometheusUrl: string,
  queries: string[],
  transformer?: (value: number) => number,
): Promise<Map<string, number>> {
  for (const query of queries) {
    const results = await queryPrometheusVector(prometheusUrl, query);
    if (results.length === 0) continue;

    const map = new Map<string, number>();
    for (const item of results) {
      const ns = item.metric.namespace;
      const rawValue = Number(item.value?.[1] ?? 0);
      if (ns && Number.isFinite(rawValue)) {
        map.set(ns, transformer ? transformer(rawValue) : rawValue);
      }
    }
    if (map.size > 0) return map;
  }
  return new Map();
}

async function buildClusterNamespaceAverages(
  cluster: { name: string; prometheusUrl: string },
  rates: CostSettings,
  window: RangeWindow,
): Promise<Map<string, NamespaceAverage>> {
  const cpuQueries = [
    'sum by (namespace) (rate(container_cpu_usage_seconds_total{container!="",container!="POD"}[5m]))',
    'sum by (namespace) (rate(container_cpu_usage_seconds_total{image!="",pod!=""}[5m]))',
    'sum by (namespace) (rate(container_cpu_usage_seconds_total{namespace!=""}[5m]))',
  ].map((expr) => withRange(expr, window));
  const memoryQueries = [
    'sum by (namespace) (container_memory_working_set_bytes{container!="",container!="POD"})',
    'sum by (namespace) (container_memory_working_set_bytes{image!="",pod!=""})',
    'sum by (namespace) (container_memory_working_set_bytes{namespace!=""})',
    'sum by (namespace) (container_memory_usage_bytes{namespace!=""})',
  ].map((expr) => withRange(expr, window));

  const [cpuMap, memMap] = await Promise.all([
    queryFirstAvailableNamespaceMetric(cluster.prometheusUrl, cpuQueries),
    queryFirstAvailableNamespaceMetric(
      cluster.prometheusUrl,
      memoryQueries,
      (v) => v / BYTES_PER_GB,
    ),
  ]);

  const allNamespaces = new Set([...cpuMap.keys(), ...memMap.keys()]);
  const result = new Map<string, NamespaceAverage>();

  for (const ns of allNamespaces) {
    const avgCpuCores = round(cpuMap.get(ns) ?? 0);
    const avgMemoryGb = round(memMap.get(ns) ?? 0);
    const avgCpuCost = round(avgCpuCores * rates.cpuCore);
    const avgMemoryCost = round(avgMemoryGb * rates.memoryGb);
    result.set(ns, {
      avgCpuCores,
      avgMemoryGb,
      avgCpuCost,
      avgMemoryCost,
      avgTotalCost: round(avgCpuCost + avgMemoryCost),
    });
  }

  return result;
}

// A "snapshot" has no meaningful averaging window, so the namespace-average
// panel falls back to the original 24h/5m behavior when range is "now".
const DEFAULT_NAMESPACE_AVERAGE_WINDOW: RangeWindow = {
  windowSeconds: SECONDS_PER_DAY,
  step: "5m",
};

export async function getNamespaceAverages(
  clusterFilter?: string[],
  namespaceFilter?: string[],
  range: CostRange = "now",
): Promise<Map<string, NamespaceAverage>> {
  const [clusters, settingsContent] = await Promise.all([
    getClusters(),
    readSettingsFile(),
  ]);
  const rates = parseCostsFromSettings(settingsContent);
  const window =
    resolveRange(range, Math.floor(Date.now() / 1000)) ??
    DEFAULT_NAMESPACE_AVERAGE_WINDOW;

  const selectedClusters =
    clusterFilter && clusterFilter.length > 0
      ? clusters.filter((c) => clusterFilter.includes(c.name))
      : clusters;

  const requestedNamespaces =
    namespaceFilter && namespaceFilter.length > 0
      ? new Set(namespaceFilter)
      : null;

  const perCluster = await Promise.all(
    selectedClusters.map((cluster) =>
      buildClusterNamespaceAverages(cluster, rates, window).then((nsMap) => ({
        clusterName: cluster.name,
        nsMap,
      })),
    ),
  );

  const result = new Map<string, NamespaceAverage>();

  for (const { clusterName, nsMap } of perCluster) {
    for (const [ns, avg] of nsMap) {
      const key = `${clusterName}:${ns}`;
      if (requestedNamespaces && !requestedNamespaces.has(key)) continue;
      result.set(key, avg);
    }
  }

  return result;
}

export async function getCostReport(
  clusterFilter?: string[],
  namespaceFilter?: string[],
  range: CostRange = "now",
): Promise<CostReport> {
  const [clusters, settingsContent] = await Promise.all([
    getClusters(),
    readSettingsFile(),
  ]);
  const rates = parseCostsFromSettings(settingsContent);
  const sharedNamespaces = new Set(
    parseSharedNamespacesFromSettings(settingsContent),
  );
  const window = resolveRange(range, Math.floor(Date.now() / 1000));

  const selectedClusters =
    clusterFilter && clusterFilter.length > 0
      ? clusters.filter((cluster) => clusterFilter.includes(cluster.name))
      : clusters;

  const clusterStates = await Promise.all(
    selectedClusters.map(async (cluster) => {
      try {
        const podStates = await buildClusterPodStates(cluster, window);
        return { clusterName: cluster.name, podStates };
      } catch (error) {
        console.error(`Error building cost report for ${cluster.name}:`, error);
        return { clusterName: cluster.name, podStates: [] };
      }
    }),
  );

  const grouped: Record<string, ClusterCostSummary> = {};

  const requestedNamespaces =
    namespaceFilter && namespaceFilter.length > 0
      ? new Set(namespaceFilter)
      : null;

  for (const { clusterName, podStates } of clusterStates) {
    const namespaces: Record<string, NamespaceCostSummary> = {};

    for (const podState of podStates
      .filter((item) =>
        requestedNamespaces
          ? requestedNamespaces.has(`${item.cluster}:${item.namespace}`)
          : true,
      )
      .sort((a, b) => {
        if (a.namespace === b.namespace) {
          return a.pod.localeCompare(b.pod);
        }

        return a.namespace.localeCompare(b.namespace);
      })) {
      const cpuCost = podState.cpuCores * rates.cpuCore;
      const memoryCost = podState.memoryGb * rates.memoryGb;
      const storageCost = podState.storageGb * rates.storageGb;
      const totalCost = cpuCost + memoryCost + storageCost;

      const podCost: PodCost = {
        cluster: podState.cluster,
        namespace: podState.namespace,
        pod: podState.pod,
        status: podState.status,
        cpuCores: round(podState.cpuCores),
        memoryGb: round(podState.memoryGb),
        storageGb: round(podState.storageGb),
        cpuCost: round(cpuCost),
        memoryCost: round(memoryCost),
        storageCost: round(storageCost),
        totalCost: round(totalCost),
        isEstimated: podState.estimatedResources.size > 0,
        estimatedResources: Array.from(podState.estimatedResources).sort(
          (left, right) => left.localeCompare(right)
        ),
      };

      if (!namespaces[podState.namespace]) {
        namespaces[podState.namespace] = {
          totalPods: 0,
          estimatedPodCount: 0,
          totalCpuCores: 0,
          totalMemoryGb: 0,
          totalStorageGb: 0,
          totalCost: 0,
          pods: [],
        };
      }

      const namespaceSummary = namespaces[podState.namespace];
      namespaceSummary.totalPods += 1;
      namespaceSummary.estimatedPodCount += podCost.isEstimated ? 1 : 0;
      namespaceSummary.totalCpuCores += podCost.cpuCores;
      namespaceSummary.totalMemoryGb += podCost.memoryGb;
      namespaceSummary.totalStorageGb += podCost.storageGb;
      namespaceSummary.totalCost += podCost.totalCost;
      namespaceSummary.pods.push(podCost);
    }

    const namespacesWithSharing = applySharedNamespaceCosts(
      namespaces,
      sharedNamespaces,
    );

    const clusterSummary: ClusterCostSummary = {
      totalPods: 0,
      totalNamespaces: Object.keys(namespacesWithSharing).length,
      estimatedPodCount: 0,
      totalCpuCores: 0,
      totalMemoryGb: 0,
      totalStorageGb: 0,
      totalCost: 0,
      namespaces: {},
    };

    for (const [namespace, summary] of Object.entries(namespacesWithSharing)) {
      const normalizedSummary: NamespaceCostSummary = {
        totalPods: summary.totalPods,
        estimatedPodCount: summary.estimatedPodCount,
        totalCpuCores: round(summary.totalCpuCores),
        totalMemoryGb: round(summary.totalMemoryGb),
        totalStorageGb: round(summary.totalStorageGb),
        totalCost: round(summary.totalCost),
        pods: summary.pods.map((pod) => ({
          ...pod,
          cpuCores: round(pod.cpuCores),
          memoryGb: round(pod.memoryGb),
          storageGb: round(pod.storageGb),
          cpuCost: round(pod.cpuCost),
          memoryCost: round(pod.memoryCost),
          storageCost: round(pod.storageCost),
          totalCost: round(pod.totalCost),
        })),
      };

      clusterSummary.totalPods += normalizedSummary.totalPods;
      clusterSummary.estimatedPodCount += normalizedSummary.estimatedPodCount;
      clusterSummary.totalCpuCores += normalizedSummary.totalCpuCores;
      clusterSummary.totalMemoryGb += normalizedSummary.totalMemoryGb;
      clusterSummary.totalStorageGb += normalizedSummary.totalStorageGb;
      clusterSummary.totalCost += normalizedSummary.totalCost;
      clusterSummary.namespaces[namespace] = normalizedSummary;
    }

    grouped[clusterName] = {
      ...clusterSummary,
      totalCpuCores: round(clusterSummary.totalCpuCores),
      totalMemoryGb: round(clusterSummary.totalMemoryGb),
      totalStorageGb: round(clusterSummary.totalStorageGb),
      totalCost: round(clusterSummary.totalCost),
    };
  }

  const report = Object.values(grouped).reduce(
    (accumulator, cluster) => {
      accumulator.totalClusters += 1;
      accumulator.totalNamespaces += cluster.totalNamespaces;
      accumulator.totalPods += cluster.totalPods;
      accumulator.estimatedPodCount += cluster.estimatedPodCount;
      accumulator.totalCpuCores += cluster.totalCpuCores;
      accumulator.totalMemoryGb += cluster.totalMemoryGb;
      accumulator.totalStorageGb += cluster.totalStorageGb;
      accumulator.totalCost += cluster.totalCost;
      return accumulator;
    },
    {
      totalClusters: 0,
      totalNamespaces: 0,
      totalPods: 0,
      estimatedPodCount: 0,
      totalCpuCores: 0,
      totalMemoryGb: 0,
      totalStorageGb: 0,
      totalCost: 0,
    },
  );

  return {
    generatedAt: new Date().toISOString(),
    rates,
    totalClusters: report.totalClusters,
    totalNamespaces: report.totalNamespaces,
    totalPods: report.totalPods,
    estimatedPodCount: report.estimatedPodCount,
    totalCpuCores: round(report.totalCpuCores),
    totalMemoryGb: round(report.totalMemoryGb),
    totalStorageGb: round(report.totalStorageGb),
    totalCost: round(report.totalCost),
    clusters: grouped,
  };
}
