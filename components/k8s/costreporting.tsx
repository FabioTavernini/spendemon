import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { getCostReport, type CostReport } from '@/lib/cost-reporting'

function formatNumber(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function formatCost(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function SummaryCard({
  title,
  description,
  value,
}: {
  title: string
  description: string
  value: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{description}</CardDescription>
        <CardTitle className="text-2xl font-semibold">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  )
}

function ClusterSummaryTable({ report }: { report: CostReport }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h2 className="text-xl font-semibold">Cluster Costs</h2>
      <Separator className="my-3" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cluster</TableHead>
            <TableHead className="text-right">Namespaces</TableHead>
            <TableHead className="text-right">Pods</TableHead>
            <TableHead className="text-right">CPU</TableHead>
            <TableHead className="text-right">RAM GB</TableHead>
            <TableHead className="text-right">Storage GB</TableHead>
            <TableHead className="text-right">Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(report.clusters).map(([clusterName, cluster]) => (
            <TableRow key={clusterName}>
              <TableCell className="font-medium">{clusterName}</TableCell>
              <TableCell className="text-right">{cluster.totalNamespaces}</TableCell>
              <TableCell className="text-right">{cluster.totalPods}</TableCell>
              <TableCell className="text-right">{formatNumber(cluster.totalCpuCores)}</TableCell>
              <TableCell className="text-right">{formatNumber(cluster.totalMemoryGb)}</TableCell>
              <TableCell className="text-right">{formatNumber(cluster.totalStorageGb)}</TableCell>
              <TableCell className="text-right">{formatCost(cluster.totalCost)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function NamespaceSummaryTable({ report }: { report: CostReport }) {
  const rows = Object.entries(report.clusters).flatMap(([clusterName, cluster]) =>
    Object.entries(cluster.namespaces).map(([namespaceName, namespace]) => ({
      clusterName,
      namespaceName,
      ...namespace,
    }))
  )

  return (
    <div className="rounded-xl border bg-card p-4">
      <h2 className="text-xl font-semibold">Namespace Costs</h2>
      <Separator className="my-3" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cluster</TableHead>
            <TableHead>Namespace</TableHead>
            <TableHead className="text-right">Pods</TableHead>
            <TableHead className="text-right">CPU</TableHead>
            <TableHead className="text-right">RAM GB</TableHead>
            <TableHead className="text-right">Storage GB</TableHead>
            <TableHead className="text-right">Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={`${row.clusterName}:${row.namespaceName}`}>
              <TableCell>{row.clusterName}</TableCell>
              <TableCell className="font-medium">{row.namespaceName}</TableCell>
              <TableCell className="text-right">{row.totalPods}</TableCell>
              <TableCell className="text-right">{formatNumber(row.totalCpuCores)}</TableCell>
              <TableCell className="text-right">{formatNumber(row.totalMemoryGb)}</TableCell>
              <TableCell className="text-right">{formatNumber(row.totalStorageGb)}</TableCell>
              <TableCell className="text-right">{formatCost(row.totalCost)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function PodCostTable({ report }: { report: CostReport }) {
  const rows = Object.entries(report.clusters).flatMap(([clusterName, cluster]) =>
    Object.entries(cluster.namespaces).flatMap(([namespaceName, namespace]) =>
      namespace.pods.map((pod) => ({
        clusterName,
        namespaceName,
        ...pod,
      }))
    )
  )

  return (
    <div className="rounded-xl border bg-card p-4">
      <h2 className="text-xl font-semibold">Pod Costs</h2>
      <Separator className="my-3" />
      <div className="max-h-[36rem] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cluster</TableHead>
              <TableHead>Namespace</TableHead>
              <TableHead>Pod</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">CPU</TableHead>
              <TableHead className="text-right">RAM GB</TableHead>
              <TableHead className="text-right">Storage GB</TableHead>
              <TableHead className="text-right">CPU Cost</TableHead>
              <TableHead className="text-right">RAM Cost</TableHead>
              <TableHead className="text-right">Storage Cost</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={`${row.clusterName}:${row.namespaceName}:${row.pod}`}>
                <TableCell>{row.clusterName}</TableCell>
                <TableCell>{row.namespaceName}</TableCell>
                <TableCell className="font-medium">{row.pod}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell className="text-right">{formatNumber(row.cpuCores)}</TableCell>
                <TableCell className="text-right">{formatNumber(row.memoryGb)}</TableCell>
                <TableCell className="text-right">{formatNumber(row.storageGb)}</TableCell>
                <TableCell className="text-right">{formatCost(row.cpuCost)}</TableCell>
                <TableCell className="text-right">{formatCost(row.memoryCost)}</TableCell>
                <TableCell className="text-right">{formatCost(row.storageCost)}</TableCell>
                <TableCell className="text-right">{formatCost(row.totalCost)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export async function CostReporting({ clusters }: { clusters?: string }) {
  const report = await getCostReport(
    clusters
      ? clusters
          .split(',')
          .map((cluster) => cluster.trim())
          .filter(Boolean)
      : undefined
  )

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Cost Reporting</h1>
        <p className="text-sm text-muted-foreground">
          Snapshot estimate based on configured pricing and current Prometheus resource
          requests.
        </p>
        <p className="text-xs text-muted-foreground">
          Rates: CPU {formatCost(report.rates.cpuCore)} / core, RAM{' '}
          {formatCost(report.rates.memoryGb)} / GB, Storage{' '}
          {formatCost(report.rates.storageGb)} / GB
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          description="Estimated total cost"
          title="Aggregated across the selected clusters"
          value={formatCost(report.totalCost)}
        />
        <SummaryCard
          description="Tracked pods"
          title="Pods included in the current snapshot"
          value={String(report.totalPods)}
        />
        <SummaryCard
          description="Requested CPU and RAM"
          title={`${formatNumber(report.totalCpuCores)} cores / ${formatNumber(report.totalMemoryGb)} GB`}
          value={String(report.totalClusters)}
        />
        <SummaryCard
          description="Requested storage"
          title={`${report.totalNamespaces} namespaces in scope`}
          value={`${formatNumber(report.totalStorageGb)} GB`}
        />
      </div>

      <ClusterSummaryTable report={report} />
      <NamespaceSummaryTable report={report} />
      <PodCostTable report={report} />
    </div>
  )
}
