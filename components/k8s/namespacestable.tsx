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
            <TableHeader className="hidden bg-muted/80 md:table-header-group">
                <TableRow>
                    <TableHead className="px-4 py-2">Cluster</TableHead>
                    <TableHead className="px-4 py-2">Namespace</TableHead>
                </TableRow>
            </TableHeader>

            <TableBody>
                {namespaces.map((ns, i) => (
                    <TableRow
                        key={`${ns.cluster}-${ns.namespace}-${i}`}
                        className="mb-3 block rounded-lg border md:mb-0 md:table-row md:rounded-none md:border-b"
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
    )
}
