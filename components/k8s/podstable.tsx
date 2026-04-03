import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type PodRow = {
  cluster: string
  namespace: string
  pod: string
}

type ClusterPods = {
  totalPods: number
  namespaces: Record<string, string[]>
}

type PodsApiResponse = {
  totalPods: number
  totalClusters: number
  clusters: Record<string, ClusterPods>
}

export async function PodsTable({ clusters }: { clusters?: string }) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

  const url = clusters
    ? `${baseUrl}/api/pods?clusters=${clusters}`
    : `${baseUrl}/api/pods`

  const res = await fetch(url, { cache: "no-store" })
  const data: PodsApiResponse = await res.json()

  const pods: PodRow[] = data?.clusters
    ? Object.entries(data.clusters).flatMap(([cluster, value]) =>
        Object.entries(value.namespaces).flatMap(([namespace, podList]) =>
          podList.map((pod) => ({
            cluster,
            namespace,
            pod,
          }))
        )
      )
    : []

  return (
    <Table className="w-full">
      <TableHeader className="bg-muted/80">
        <TableRow>
          <TableHead className="px-4 py-2">Cluster</TableHead>
          <TableHead className="px-4 py-2">Namespace</TableHead>
          <TableHead className="px-4 py-2">Pod</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {pods.map((p, i) => (
          <TableRow key={`${p.cluster}-${p.namespace}-${p.pod}-${i}`}>
            <TableCell className="px-4 py-2">{p.cluster}</TableCell>
            <TableCell className="px-4 py-2">{p.namespace}</TableCell>
            <TableCell className="px-4 py-2">{p.pod}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}