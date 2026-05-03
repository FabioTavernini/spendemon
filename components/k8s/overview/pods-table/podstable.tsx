import { columns, type PodRow } from "@/components/k8s/overview/pods-table/columns"
import { DataTable } from "@/components/k8s/data-table"
import { Separator } from "@/components/ui/separator"
import { fetchInternalApi } from "@/lib/internal-api"

type ClusterPods = {
  totalPods: number
  namespaces: Record<string, { pod: string; status: string }[]>
}

type PodsApiResponse = {
  totalPods: number
  totalClusters: number
  clusters: Record<string, ClusterPods>
}

export async function PodsTable({
  clusters,
  namespaces,
}: {
  clusters?: string
  namespaces?: string
}) {
  const params = new URLSearchParams()

  if (clusters) {
    params.set("clusters", clusters)
  }

  if (namespaces) {
    params.set("namespaces", namespaces)
  }

  const queryString = params.toString()
  const url = queryString
    ? `/api/pods?${queryString}`
    : `/api/pods`

  const res = await fetchInternalApi(url, { cache: "no-store" })
  const data: PodsApiResponse = await res.json()

  const pods: PodRow[] = data?.clusters
    ? Object.entries(data.clusters).flatMap(([cluster, value]) =>
      Object.entries(value.namespaces).flatMap(([namespace, podList]) =>
        podList.map((podItem) => ({
          cluster,
          namespace,
          pod: podItem.pod,
          status: podItem.status,
        }))
      )
    )
    : []

  return (
    <>
      <h2 className="my-2 text-2xl">Pods</h2>
      <Separator className="my-2" />
      <DataTable columns={columns} data={pods} initialPageSize={10} />
    </>
  )
}
