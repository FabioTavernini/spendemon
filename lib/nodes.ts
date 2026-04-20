import { getClusters, type Cluster } from '@/lib/clusters'

type QueryOutcome<Result> = {
  success: boolean
  results: Result[]
}

type PrometheusResponse<Result> = {
  status?: string
  data?: {
    result?: Result[]
  }
}

type NodeMetric = {
  node?: string
  instance?: string
  internal_ip?: string
  os_image?: string
  kernel_version?: string
  kubelet_version?: string
  container_runtime_version?: string
  provider_id?: string
}

type NodeInfoResult = {
  metric: NodeMetric
}

type NodeReadyResult = {
  metric: {
    node?: string
    instance?: string
  }
}

type NodeRoleResult = {
  metric: {
    node?: string
    instance?: string
    role?: string
  }
}

export type NodeItem = {
  cluster: string
  node: string
  status: 'Ready' | 'NotReady' | 'Unknown'
  roles: string[]
  internalIp: string | null
  osImage: string | null
  kernelVersion: string | null
  kubeletVersion: string | null
  containerRuntimeVersion: string | null
  providerId: string | null
}

export type NodeReport = {
  totalClusters: number
  totalNodes: number
  nodes: NodeItem[]
}

const NODE_INFO_QUERY = 'kube_node_info == 1'
const NODE_READY_QUERY =
  'kube_node_status_condition{condition="Ready",status="true"} == 1'
const NODE_ROLE_QUERY = 'kube_node_role == 1'

function getNodeName(metric: { node?: string; instance?: string }) {
  const name = metric.node?.trim() || metric.instance?.trim()
  return name || null
}

function toNullableValue(value?: string) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function selectClusters(allClusters: Cluster[], clusterNames?: string[]) {
  if (!clusterNames?.length) {
    return allClusters
  }

  const requested = new Set(
    clusterNames.map((clusterName) => clusterName.trim()).filter(Boolean)
  )

  return allClusters.filter((cluster) => requested.has(cluster.name))
}

async function queryPrometheusVector<Result>(
  prometheusUrl: string,
  query: string
): Promise<QueryOutcome<Result>> {
  let requestUrl: string

  try {
    requestUrl = new URL(
      `/api/v1/query?query=${encodeURIComponent(query)}`,
      prometheusUrl
    ).toString()
  } catch (error) {
    console.warn(`[nodes] Invalid Prometheus URL "${prometheusUrl}":`, error)
    return { success: false, results: [] }
  }

  let response: Response

  try {
    response = await fetch(requestUrl, { cache: 'no-store' })
  } catch (error) {
    console.warn(
      `[nodes] Failed to query Prometheus at "${prometheusUrl}":`,
      error
    )
    return { success: false, results: [] }
  }

  let payload: PrometheusResponse<Result>

  try {
    payload = (await response.json()) as PrometheusResponse<Result>
  } catch (error) {
    console.warn(
      `[nodes] Invalid Prometheus response from "${prometheusUrl}":`,
      error
    )
    return { success: false, results: [] }
  }

  if (!response.ok || payload.status !== 'success') {
    return { success: false, results: [] }
  }

  return {
    success: true,
    results: payload.data?.result ?? [],
  }
}

async function listClusterNodes(cluster: Cluster): Promise<NodeItem[]> {
  const [infoOutcome, readyOutcome, roleOutcome] = await Promise.all([
    queryPrometheusVector<NodeInfoResult>(
      cluster.prometheusUrl,
      NODE_INFO_QUERY
    ),
    queryPrometheusVector<NodeReadyResult>(
      cluster.prometheusUrl,
      NODE_READY_QUERY
    ),
    queryPrometheusVector<NodeRoleResult>(
      cluster.prometheusUrl,
      NODE_ROLE_QUERY
    ),
  ])

  if (!infoOutcome.success) {
    return []
  }

  const readyNodes = new Set(
    readyOutcome.results.flatMap((item) => {
      const node = getNodeName(item.metric)
      return node ? [node] : []
    })
  )

  const rolesByNode = new Map<string, Set<string>>()

  for (const item of roleOutcome.results) {
    const node = getNodeName(item.metric)
    const role = item.metric.role?.trim()

    if (!node || !role) {
      continue
    }

    const roles = rolesByNode.get(node) ?? new Set<string>()
    roles.add(role)
    rolesByNode.set(node, roles)
  }

  const nodes = new Map<string, NodeItem>()

  for (const item of infoOutcome.results) {
    const nodeName = getNodeName(item.metric)

    if (!nodeName || nodes.has(nodeName)) {
      continue
    }

    nodes.set(nodeName, {
      cluster: cluster.name,
      node: nodeName,
      status: readyNodes.has(nodeName)
        ? 'Ready'
        : readyOutcome.success
          ? 'NotReady'
          : 'Unknown',
      roles: Array.from(rolesByNode.get(nodeName) ?? []).sort(),
      internalIp: toNullableValue(item.metric.internal_ip),
      osImage: toNullableValue(item.metric.os_image),
      kernelVersion: toNullableValue(item.metric.kernel_version),
      kubeletVersion: toNullableValue(item.metric.kubelet_version),
      containerRuntimeVersion: toNullableValue(
        item.metric.container_runtime_version
      ),
      providerId: toNullableValue(item.metric.provider_id),
    })
  }

  return Array.from(nodes.values())
}

export async function listNodes(clusterNames?: string[]): Promise<NodeReport> {
  const allClusters = await getClusters()
  const selectedClusters = selectClusters(allClusters, clusterNames)
  const nodes = (await Promise.all(selectedClusters.map(listClusterNodes)))
    .flat()
    .sort((left, right) => {
      if (left.cluster !== right.cluster) {
        return left.cluster.localeCompare(right.cluster)
      }

      return left.node.localeCompare(right.node)
    })

  return {
    totalClusters: new Set(nodes.map((node) => node.cluster)).size,
    totalNodes: nodes.length,
    nodes,
  }
}
