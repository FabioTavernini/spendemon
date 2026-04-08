import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "../ui/separator"
import { fetchInternalApi } from "@/lib/internal-api"

type PodRow = {
  cluster: string
  namespace: string
  pod: string
  status: string
}

type ClusterPods = {
  totalPods: number
  namespaces: Record<string, { pod: string; status: string }[]>
}

type PodsApiResponse = {
  totalPods: number
  totalClusters: number
  clusters: Record<string, ClusterPods>
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'running':
    case 'completed':
      return 'text-green-500';
    case 'pending':
      return 'text-orange-500';
    default:
      return 'text-red-500';
  }
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
    <div className="max-h-96 overflow-y-auto">
      <h2 className="my-2 text-2xl">Pods</h2>
      <Separator className="my-2" />
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="px-4 py-2">Cluster</TableHead>
            <TableHead className="px-4 py-2">Namespace</TableHead>
            <TableHead className="px-4 py-2">Pod</TableHead>
            <TableHead className="px-4 py-2">Status</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {pods.map((p, i) => (
            <TableRow key={`${p.cluster}-${p.namespace}-${p.pod}-${i}`}>
              <TableCell className="px-4 py-2">{p.cluster}</TableCell>
              <TableCell className="px-4 py-2">{p.namespace}</TableCell>
              <TableCell className="px-4 py-2">{p.pod}</TableCell>
              <TableCell className={`px-4 py-2 ${getStatusColor(p.status)}`}>
                {p.status}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
