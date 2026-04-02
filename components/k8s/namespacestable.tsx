import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Namespace = {
    cluster: string
    namespace: string
    job?: string
    instance?: string
}

export async function NamespacesTable({ clusters }: { clusters?: string }) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

    const url = clusters
        ? `${baseUrl}/api/namespaces?clusters=${clusters}`
        : `${baseUrl}/api/namespaces`

    const res = await fetch(url, { cache: "no-store" }) // 👈 important
    const data = await res.json()

    const namespaces = Array.isArray(data.namespaces) ? data.namespaces : []

    return (
        <Table className="w-full">
            <TableHeader className="bg-muted/80">
                <TableRow>
                    <TableHead className="px-4 py-2">Cluster</TableHead>
                    <TableHead className="px-4 py-2">Namespace</TableHead>
                    <TableHead className="px-4 py-2">Job</TableHead>
                    <TableHead className="px-4 py-2">Instance</TableHead>
                </TableRow>
            </TableHeader>

            <TableBody>
                {namespaces.map((ns: Namespace, i: number) => (
                    <TableRow key={i}>
                        <TableCell className="px-4 py-2">{ns.cluster}</TableCell>
                        <TableCell className="px-4 py-2">{ns.namespace}</TableCell>
                        <TableCell className="px-4 py-2">{ns.job}</TableCell>
                        <TableCell className="px-4 py-2">{ns.instance}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}