import { getClusters } from "@/lib/clusters";
import {
  parseCostsFromSettings,
  parseSharedNamespacesFromSettings,
  readSettingsFile,
  type CostSettings,
} from "@/lib/settings";

const BYTES_PER_GB = 1024 * 1024 * 1024;

type QueryResult = {
  metric: {
    namespace?: string;
    pod?: string;
    phase?: string;
  };
  value: [number | string, string];
};

type PrometheusResponse = {
  status?: string;
  data?: {
    result?: QueryResult[];
  };
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
};

export type NamespaceCostSummary = {
  totalPods: number;
  totalCpuCores: number;
  totalMemoryGb: number;
  totalStorageGb: number;
  totalCost: number;
  pods: PodCost[];
};

export type ClusterCostSummary = {
  totalPods: number;
  totalNamespaces: number;
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
  totalCpuCores: number;
  totalMemoryGb: number;
  totalStorageGb: number;
  totalCost: number;
  clusters: Record<string, ClusterCostSummary>;
};

type MutablePodCost = PodCost;
type MutableNamespaceCostSummary = NamespaceCostSummary;

type ClusterPodState = {
  cluster: string;
  namespace: string;
  pod: string;
  status: string;
  cpuCores: number;
  memoryGb: number;
  storageGb: number;
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
  let requestUrl: string;

  try {
    requestUrl = new URL(
      `/api/v1/query?query=${encodeURIComponent(query)}`,
      prometheusUrl,
    ).toString();
  } catch (error) {
    console.warn(
      `[cost-reporting] Invalid Prometheus URL "${prometheusUrl}":`,
      error,
    );
    return [];
  }

  let response: Response;

  try {
    response = await fetch(requestUrl, { cache: "no-store" });
  } catch (error) {
    console.warn(
      `[cost-reporting] Failed to query Prometheus at "${prometheusUrl}":`,
      error,
    );
    return [];
  }

  let payload: PrometheusResponse;

  try {
    payload = (await response.json()) as PrometheusResponse;
  } catch (error) {
    console.warn(
      `[cost-reporting] Invalid Prometheus response from "${prometheusUrl}":`,
      error,
    );
    return [];
  }

  if (!response.ok || payload.status !== "success") {
    return [];
  }

  return payload.data?.result ?? [];
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
  };

  podMap.set(key, next);
  return next;
}

async function queryFirstAvailableMetric(
  prometheusUrl: string,
  queries: string[],
  transformer?: (value: number) => number,
): Promise<MetricValue[]> {
  for (const query of queries) {
    const results = await queryPrometheusVector(prometheusUrl, query);

    if (results.length > 0) {
      return parseMetricValues(results, transformer);
    }
  }

  return [];
}

async function queryStorageMetrics(
  prometheusUrl: string,
): Promise<MetricValue[]> {
  return queryFirstAvailableMetric(prometheusUrl, [
    'sum by (namespace, pod) (kube_pod_container_resource_requests{resource="ephemeral_storage",unit="byte"})',
    'sum by (namespace, pod) (kube_pod_container_resource_requests{resource="ephemeral-storage",unit="byte"})',
    "sum by (namespace, pod) (kube_pod_ephemeral_storage_request_bytes)",
  ], (value) => value / BYTES_PER_GB);
}

async function buildClusterPodStates(cluster: {
  name: string;
  prometheusUrl: string;
}) {
  const podStatusQuery = "kube_pod_status_phase == 1";
  const cpuQuery =
    'sum by (namespace, pod) (kube_pod_container_resource_requests{resource="cpu",unit="core"})';
  const memoryQuery =
    'sum by (namespace, pod) (kube_pod_container_resource_requests{resource="memory",unit="byte"})';
  const cpuUsageQueries = [
    'sum by (namespace, pod) (rate(container_cpu_usage_seconds_total{container!="",container!="POD"}[5m]))',
    'sum by (namespace, pod) (rate(container_cpu_usage_seconds_total{image!="",pod!=""}[5m]))',
    'sum by (namespace, pod) (label_replace(rate(container_cpu_usage_seconds_total{container_name!="",container_name!="POD",pod_name!=""}[5m]), "pod", "$1", "pod_name", "(.*)"))',
  ];
  const memoryUsageQueries = [
    'sum by (namespace, pod) (container_memory_working_set_bytes{container!="",container!="POD"})',
    'sum by (namespace, pod) (container_memory_working_set_bytes{image!="",pod!=""})',
    'sum by (namespace, pod) (label_replace(container_memory_working_set_bytes{container_name!="",container_name!="POD",pod_name!=""}, "pod", "$1", "pod_name", "(.*)"))',
    'sum by (namespace, pod) (container_memory_usage_bytes{container!="",container!="POD"})',
    'sum by (namespace, pod) (container_memory_usage_bytes{image!="",pod!=""})',
    'sum by (namespace, pod) (label_replace(container_memory_usage_bytes{container_name!="",container_name!="POD",pod_name!=""}, "pod", "$1", "pod_name", "(.*)"))',
    'sum by (namespace, pod) (container_memory_rss{container!="",container!="POD"})',
    'sum by (namespace, pod) (container_memory_rss{image!="",pod!=""})',
    'sum by (namespace, pod) (label_replace(container_memory_rss{container_name!="",container_name!="POD",pod_name!=""}, "pod", "$1", "pod_name", "(.*)"))',
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
      queryFirstAvailableMetric(cluster.prometheusUrl, cpuUsageQueries),
      queryFirstAvailableMetric(
        cluster.prometheusUrl,
        memoryUsageQueries,
        (value) => value / BYTES_PER_GB,
      ),
      queryStorageMetrics(cluster.prometheusUrl),
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

  for (const item of parseMetricValues(cpuResults)) {
    const podState = upsertPodState(
      podMap,
      cluster.name,
      item.namespace,
      item.pod,
    );
    podState.cpuCores = item.value;
  }

  for (const item of parseMetricValues(
    memoryResults,
    (value) => value / BYTES_PER_GB,
  )) {
    const podState = upsertPodState(
      podMap,
      cluster.name,
      item.namespace,
      item.pod,
    );
    podState.memoryGb = item.value;
  }

  for (const item of cpuUsageResults) {
    const podState = upsertPodState(
      podMap,
      cluster.name,
      item.namespace,
      item.pod,
    );

    if (podState.cpuCores <= 0) {
      podState.cpuCores = item.value;
    }
  }

  for (const item of memoryUsageResults) {
    const podState = upsertPodState(
      podMap,
      cluster.name,
      item.namespace,
      item.pod,
    );

    if (podState.memoryGb <= 0) {
      podState.memoryGb = item.value;
    }
  }

  for (const item of storageResults) {
    const podState = upsertPodState(
      podMap,
      cluster.name,
      item.namespace,
      item.pod,
    );
    podState.storageGb = item.value;
  }

  return Array.from(podMap.values());
}

function round(value: number): number {
  return Number(value.toFixed(4));
}

function clonePodCost(pod: PodCost): MutablePodCost {
  return { ...pod };
}

function cloneNamespaceCostSummary(
  summary: NamespaceCostSummary,
): MutableNamespaceCostSummary {
  return {
    totalPods: summary.totalPods,
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

export async function getCostReport(
  clusterFilter?: string[],
  namespaceFilter?: string[],
): Promise<CostReport> {
  const [clusters, settingsContent] = await Promise.all([
    getClusters(),
    readSettingsFile(),
  ]);
  const rates = parseCostsFromSettings(settingsContent);
  const sharedNamespaces = new Set(
    parseSharedNamespacesFromSettings(settingsContent),
  );

  const selectedClusters =
    clusterFilter && clusterFilter.length > 0
      ? clusters.filter((cluster) => clusterFilter.includes(cluster.name))
      : clusters;

  const clusterStates = await Promise.all(
    selectedClusters.map(async (cluster) => {
      try {
        const podStates = await buildClusterPodStates(cluster);
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
      };

      if (!namespaces[podState.namespace]) {
        namespaces[podState.namespace] = {
          totalPods: 0,
          totalCpuCores: 0,
          totalMemoryGb: 0,
          totalStorageGb: 0,
          totalCost: 0,
          pods: [],
        };
      }

      const namespaceSummary = namespaces[podState.namespace];
      namespaceSummary.totalPods += 1;
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
      totalCpuCores: 0,
      totalMemoryGb: 0,
      totalStorageGb: 0,
      totalCost: 0,
      namespaces: {},
    };

    for (const [namespace, summary] of Object.entries(namespacesWithSharing)) {
      const normalizedSummary: NamespaceCostSummary = {
        totalPods: summary.totalPods,
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
    totalCpuCores: round(report.totalCpuCores),
    totalMemoryGb: round(report.totalMemoryGb),
    totalStorageGb: round(report.totalStorageGb),
    totalCost: round(report.totalCost),
    clusters: grouped,
  };
}
