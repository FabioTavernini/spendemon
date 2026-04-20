import { columns, type NodeRow } from "@/components/k8s/nodes-table-columns"
import { DataTable } from "@/components/k8s/pods-table/data-table"
import { Separator } from "@/components/ui/separator"
import { fetchInternalApi } from "@/lib/internal-api"
import { type NodeItem } from "@/lib/nodes"

type NodesApiResponse = {
  totalClusters: number
  totalNodes: number
  nodes?: NodeItem[]
}

export async function NodesTable({
  clusters,
}: {
  clusters?: string
}) {
  const params = new URLSearchParams()

  if (clusters) {
    params.set("clusters", clusters)
  }

  const queryString = params.toString()
  const url = queryString ? `/api/nodes?${queryString}` : `/api/nodes`

  const res = await fetchInternalApi(url, { cache: "no-store" })
  const data = (await res.json()) as NodesApiResponse

  const rows: NodeRow[] = (data.nodes ?? []).map((node) => ({
    cluster: node.cluster,
    node: node.node,
    status: node.status,
    roles: node.roles,
    internalIp: node.internalIp,
    kubeletVersion: node.kubeletVersion,
    containerRuntimeVersion: node.containerRuntimeVersion,
    osImage: node.osImage,
  }))

  return (
    <>
      <h2 className="my-2 text-2xl">Nodes</h2>
      <Separator className="my-2" />
      <DataTable columns={columns} data={rows} initialPageSize={10} />
    </>
  )
}
