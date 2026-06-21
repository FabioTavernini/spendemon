import { getClusters, type Cluster } from '@/lib/clusters'
import { queryPrometheusVector } from '@/lib/prometheus'

const BYTES_PER_GB = 1024 * 1024 * 1024

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

type NodeResourceMetric = {
  node?: string
  instance?: string
  resource?: string
  unit?: string
}

type NodeResourceResult = {
  metric: NodeResourceMetric
  value: [number | string, string]
}

type NodeResourceFields = {
  cpuCapacityCores: number | null
  cpuAllocatableCores: number | null
  memoryCapacityGb: number | null
  memoryAllocatableGb: number | null
  storageCapacityGb: number | null
  storageAllocatableGb: number | null
  podCapacity: number | null
  podAllocatable: number | null
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
} & NodeResourceFields

export type NodeReport = {
  totalClusters: number
  totalNodes: number
  nodes: NodeItem[]
}

const NODE_INFO_QUERY = 'kube_node_info == 1'
const NODE_READY_QUERY =
  'kube_node_status_condition{condition="Ready",status="true"} == 1'
const NODE_ROLE_QUERY = 'kube_node_role == 1'
const NODE_CAPACITY_QUERY =
  'kube_node_status_capacity{resource=~"cpu|memory|pods|ephemeral-storage|ephemeral_storage"}'
const NODE_ALLOCATABLE_QUERY =
  'kube_node_status_allocatable{resource=~"cpu|memory|pods|ephemeral-storage|ephemeral_storage"}'

function getNodeName(metric: { node?: string; instance?: string }) {
  const name = metric.node?.trim() || metric.instance?.trim()
  return name || null
}

function toNullableValue(value?: string) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function roundMetricValue(value: number) {
  return Number(value.toFixed(4))
}

function createEmptyNodeResources(): NodeResourceFields {
  return {
    cpuCapacityCores: null,
    cpuAllocatableCores: null,
    memoryCapacityGb: null,
    memoryAllocatableGb: null,
    storageCapacityGb: null,
    storageAllocatableGb: null,
    podCapacity: null,
    podAllocatable: null,
  }
}

function getOrCreateNodeResources(
  resourcesByNode: Map<string, NodeResourceFields>,
  nodeName: string
) {
  const existing = resourcesByNode.get(nodeName)

  if (existing) {
    return existing
  }

  const next = createEmptyNodeResources()
  resourcesByNode.set(nodeName, next)
  return next
}

function normalizeResourceName(resource?: string) {
  const trimmed = resource?.trim()

  if (!trimmed) {
    return null
  }

  if (trimmed === 'ephemeral-storage') {
    return 'ephemeral_storage'
  }

  return trimmed
}

function parseNodeResourceValue(resource: string, rawValue: number) {
  switch (resource) {
    case 'cpu':
      return roundMetricValue(rawValue)
    case 'memory':
    case 'ephemeral_storage':
      return roundMetricValue(rawValue / BYTES_PER_GB)
    case 'pods':
      return Math.round(rawValue)
    default:
      return null
  }
}

function assignNodeResourceValue(
  resources: NodeResourceFields,
  resource: string,
  value: number,
  kind: 'capacity' | 'allocatable'
) {
  switch (resource) {
    case 'cpu':
      if (kind === 'capacity') {
        resources.cpuCapacityCores = value
      } else {
        resources.cpuAllocatableCores = value
      }
      return
    case 'memory':
      if (kind === 'capacity') {
        resources.memoryCapacityGb = value
      } else {
        resources.memoryAllocatableGb = value
      }
      return
    case 'ephemeral_storage':
      if (kind === 'capacity') {
        resources.storageCapacityGb = value
      } else {
        resources.storageAllocatableGb = value
      }
      return
    case 'pods':
      if (kind === 'capacity') {
        resources.podCapacity = value
      } else {
        resources.podAllocatable = value
      }
    default:
      return
  }
}

function buildNodeResourcesByNode(
  results: NodeResourceResult[],
  kind: 'capacity' | 'allocatable'
) {
  const resourcesByNode = new Map<string, NodeResourceFields>()

  for (const item of results) {
    const nodeName = getNodeName(item.metric)
    const resource = normalizeResourceName(item.metric.resource)
    const rawValue = Number(item.value?.[1] ?? Number.NaN)

    if (!nodeName || !resource || !Number.isFinite(rawValue)) {
      continue
    }

    const parsedValue = parseNodeResourceValue(resource, rawValue)

    if (parsedValue === null) {
      continue
    }

    assignNodeResourceValue(
      getOrCreateNodeResources(resourcesByNode, nodeName),
      resource,
      parsedValue,
      kind
    )
  }

  return resourcesByNode
}

function mergeNodeResources(
  nodeName: string,
  capacityByNode: Map<string, NodeResourceFields>,
  allocatableByNode: Map<string, NodeResourceFields>
) {
  return {
    ...createEmptyNodeResources(),
    ...(capacityByNode.get(nodeName) ?? {}),
    ...(allocatableByNode.get(nodeName) ?? {}),
  }
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

async function listClusterNodes(cluster: Cluster): Promise<NodeItem[]> {
  const [
    infoOutcome,
    readyOutcome,
    roleOutcome,
    capacityOutcome,
    allocatableOutcome,
  ] = await Promise.all([
    queryPrometheusVector<NodeInfoResult>(
      cluster.prometheusUrl,
      NODE_INFO_QUERY,
      { logPrefix: 'nodes' }
    ),
    queryPrometheusVector<NodeReadyResult>(
      cluster.prometheusUrl,
      NODE_READY_QUERY,
      { logPrefix: 'nodes' }
    ),
    queryPrometheusVector<NodeRoleResult>(
      cluster.prometheusUrl,
      NODE_ROLE_QUERY,
      { logPrefix: 'nodes' }
    ),
    queryPrometheusVector<NodeResourceResult>(
      cluster.prometheusUrl,
      NODE_CAPACITY_QUERY,
      { logPrefix: 'nodes' }
    ),
    queryPrometheusVector<NodeResourceResult>(
      cluster.prometheusUrl,
      NODE_ALLOCATABLE_QUERY,
      { logPrefix: 'nodes' }
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
  const capacityByNode = buildNodeResourcesByNode(
    capacityOutcome.results,
    'capacity'
  )
  const allocatableByNode = buildNodeResourcesByNode(
    allocatableOutcome.results,
    'allocatable'
  )

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

    let nodeStatus: 'Ready' | 'NotReady' | 'Unknown'
    if (readyNodes.has(nodeName)) {
      nodeStatus = 'Ready'
    } else if (readyOutcome.success) {
      nodeStatus = 'NotReady'
    } else {
      nodeStatus = 'Unknown'
    }
    nodes.set(nodeName, {
      cluster: cluster.name,
      node: nodeName,
      status: nodeStatus,
      roles: Array.from(rolesByNode.get(nodeName) ?? []).sort((left, right) =>
        left.localeCompare(right)
      ),
      internalIp: toNullableValue(item.metric.internal_ip),
      osImage: toNullableValue(item.metric.os_image),
      kernelVersion: toNullableValue(item.metric.kernel_version),
      kubeletVersion: toNullableValue(item.metric.kubelet_version),
      containerRuntimeVersion: toNullableValue(
        item.metric.container_runtime_version
      ),
      providerId: toNullableValue(item.metric.provider_id),
      ...mergeNodeResources(nodeName, capacityByNode, allocatableByNode),
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
