import {
  columns,
  type NamespaceRow,
} from "@/components/k8s/namespaces-table-columns"
import { DataTable } from "@/components/k8s/pods-table/data-table"
import { Separator } from "@/components/ui/separator"
import { fetchInternalApi } from "@/lib/internal-api"

type NamespaceApiCluster = {
  namespaces?: string[]
}

type NamespaceApiResponse = {
  clusters?: Record<string, NamespaceApiCluster>
}

export async function NamespacesTable({
  clusters,
  namespaces: namespaceFilter,
}: {
  clusters?: string
  namespaces?: string
}) {
  const params = new URLSearchParams()

  if (clusters) {
    params.set("clusters", clusters)
  }

  if (namespaceFilter) {
    params.set("namespaces", namespaceFilter)
  }

  const queryString = params.toString()
  const url = queryString
    ? `/api/namespaces?${queryString}`
    : `/api/namespaces`

  const res = await fetchInternalApi(url, { cache: "no-store" })
  const data = (await res.json()) as NamespaceApiResponse

  const rows: NamespaceRow[] = data?.clusters
    ? Object.entries(data.clusters).flatMap(
        ([cluster, value]) =>
          (value.namespaces ?? []).map((namespace) => ({
            cluster,
            namespace,
          }))
      )
    : []

  return (
    <>
      <h2 className="my-2 text-2xl">Namespaces</h2>
      <Separator className="my-2" />
      <DataTable columns={columns} data={rows} initialPageSize={10} />
    </>
  )
}
