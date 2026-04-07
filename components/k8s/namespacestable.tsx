import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"

type NamespaceRow = {
  cluster: string
  namespace: string
}

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
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  const params = new URLSearchParams()

  if (clusters) {
    params.set("clusters", clusters)
  }

  if (namespaceFilter) {
    params.set("namespaces", namespaceFilter)
  }

  const queryString = params.toString()
  const url = queryString
    ? `${baseUrl}/api/namespaces?${queryString}`
    : `${baseUrl}/api/namespaces`

  const res = await fetch(url, { cache: "no-store" })
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
      <Table className="w-full">
        <TableHeader className="">
          <TableRow>
            <TableHead className="px-4 py-2">Cluster</TableHead>
            <TableHead className="px-4 py-2">Namespace</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map((ns, i) => (
            <TableRow
              key={`${ns.cluster}-${ns.namespace}-${i}`}
              className="mb-3 block overflow-hidden rounded-lg border last:mb-0 md:mb-0 md:table-row md:rounded-none md:border-x-0 md:border-t-0"
            >
              <TableCell className="flex items-start justify-between gap-4 border-b px-4 py-3 whitespace-normal md:table-cell md:border-b-0 md:px-4 md:py-2 md:whitespace-nowrap">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground md:hidden">
                  Cluster
                </span>
                <span className="min-w-0 break-words text-right md:text-left">
                  {ns.cluster}
                </span>
              </TableCell>
              <TableCell className="flex items-start justify-between gap-4 px-4 py-3 whitespace-normal md:table-cell md:px-4 md:py-2 md:whitespace-nowrap">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground md:hidden">
                  Namespace
                </span>
                <span className="min-w-0 break-words text-right md:text-left">
                  {ns.namespace}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}
