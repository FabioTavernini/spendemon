import { columns } from "@/components/k8s/pods-table/columns"
import { DataTable } from "@/components/k8s/pods-table/data-table"


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


async function getData({ clusters }: { clusters?: string }) {

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

    const url = clusters
        ? `${baseUrl}/api/pods?clusters=${clusters}`
        : `${baseUrl}/api/pods`

    const res = await fetch(url, { cache: "no-store" })
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

    return pods

}

export default async function DemoPage({ clusters }: { clusters?: string }) {
    
    const data = await getData({ clusters:clusters })

    return (
        <div className="container mx-auto py-10">
            <DataTable columns={columns} data={data} />
        </div>
    )
}