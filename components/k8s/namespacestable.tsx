import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type NamespaceRow = {
    cluster: string
    namespace: string
}

export async function NamespacesTable({ clusters }: { clusters?: string }) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

    const url = clusters
        ? `${baseUrl}/api/namespaces?clusters=${clusters}`
        : `${baseUrl}/api/namespaces`


    const res = await fetch(url, { cache: "no-store" })
    const data = await res.json()

    const namespaces: NamespaceRow[] = data?.clusters
        ? Object.entries(data.clusters).flatMap(([cluster, value]: [string, any]) =>
            (value.namespaces || []).map((namespace: string) => ({
                cluster,
                namespace,
            }))
        )
        : []

    return (
        <Table className="w-full">
            <TableHeader className="bg-muted/80">
                <TableRow>
                    <TableHead className="px-4 py-2">Cluster</TableHead>
                    <TableHead className="px-4 py-2">Namespace</TableHead>
                </TableRow>
            </TableHeader>

            <TableBody>
                {namespaces.map((ns, i) => (
                    <TableRow key={`${ns.cluster}-${ns.namespace}-${i}`}>
                        <TableCell className="px-4 py-2">{ns.cluster}</TableCell>
                        <TableCell className="px-4 py-2">{ns.namespace}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}