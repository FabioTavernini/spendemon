// Spendemon - K8s Cost monitoring
// Copyright (c) 2026 Fabio Tavernini

// This file is licensed under the Personal-Use Free License 1.0 for personal use.
// Commercial use requires a separate commercial license. See LICENSE and COMMERCIAL_LICENSE.md

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  namespaceCostColumns,
  podCostColumns,
  type NamespaceCostRow,
  type PodCostRow,
} from "@/components/k8s/cost-reporting-pods-table-columns";
import { DataTable } from "@/components/k8s/pods-table/data-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { getCostReport, type CostReport } from "@/lib/cost-reporting";
import {
  parseSharedNamespacesFromSettings,
  readSettingsFile,
} from "@/lib/settings";

function formatNumber(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatCost(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function SharedNamespacesNotice({
  sharedNamespaces,
}: {
  sharedNamespaces: string[];
}) {
  if (sharedNamespaces.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/40 p-4">
        <p className="text-sm font-medium">No shared namespaces configured</p>
        <p className="mt-1 text-xs text-muted-foreground">
          All namespaces are currently included directly in the report.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900 dark:bg-amber-950/30">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Shared namespaces are excluded from the direct namespace totals
          </p>
          <p className="text-xs text-amber-800/90 dark:text-amber-200/90">
            Their costs are redistributed evenly across the remaining namespaces
            in each cluster.
          </p>
        </div>
        <Badge
          className="w-fit border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/50 dark:text-amber-100"
          variant="outline"
        >
          {sharedNamespaces.length} excluded
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {sharedNamespaces.map((namespace) => (
          <Badge
            className="border-amber-300 bg-background/80 text-foreground dark:border-amber-800 dark:bg-background/20"
            key={namespace}
            variant="outline"
          >
            {namespace}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  description,
  value,
}: {
  title: string;
  description: string;
  value: string;
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
  );
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
              <TableCell className="text-right">
                {cluster.totalNamespaces}
              </TableCell>
              <TableCell className="text-right">{cluster.totalPods}</TableCell>
              <TableCell className="text-right">
                {formatNumber(cluster.totalCpuCores)}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(cluster.totalMemoryGb)}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(cluster.totalStorageGb)}
              </TableCell>
              <TableCell className="text-right">
                {formatCost(cluster.totalCost)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function NamespaceSummaryTable({ report }: { report: CostReport }) {
  const rows: NamespaceCostRow[] = Object.entries(report.clusters).flatMap(
    ([clusterName, cluster]) =>
      Object.entries(cluster.namespaces).map(([namespaceName, namespace]) => ({
        clusterName,
        namespaceName,
        ...namespace,
      })),
  );

  return (
    <div className="rounded-xl border bg-card p-4">
      <h2 className="text-xl font-semibold">Namespace Costs</h2>
      <Separator className="my-3" />
      <DataTable columns={namespaceCostColumns} data={rows} initialPageSize={10} />
    </div>
  );
}

function PodCostTable({ report }: { report: CostReport }) {
  const rows: PodCostRow[] = Object.entries(report.clusters).flatMap(
    ([clusterName, cluster]) =>
      Object.entries(cluster.namespaces).flatMap(([namespaceName, namespace]) =>
        namespace.pods.map((pod) => ({
          clusterName,
          namespaceName,
          ...pod,
        })),
      ),
  );

  return (
    <div className="rounded-xl border bg-card p-4">
      <h2 className="text-xl font-semibold">Pod Costs</h2>
      <Separator className="my-3" />
      <div className="max-h-[36rem] overflow-auto">
        <DataTable columns={podCostColumns} data={rows} initialPageSize={10} />
      </div>
    </div>
  );
}

export async function CostReporting({
  clusters,
  namespaces,
}: {
  clusters?: string;
  namespaces?: string;
}) {
  const report = await getCostReport(
    clusters
      ? clusters
          .split(",")
          .map((cluster) => cluster.trim())
          .filter(Boolean)
      : undefined,
    namespaces
      ? namespaces
          .split(",")
          .map((namespace) => namespace.trim())
          .filter(Boolean)
      : undefined,
  );

  const [settingsContent] = await Promise.all([readSettingsFile()]);
  const sharedNamespaces = new Set(
    parseSharedNamespacesFromSettings(settingsContent),
  );
  const excludedSharedNamespaces = Array.from(sharedNamespaces).sort((a, b) =>
    a.localeCompare(b),
  );

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Cost Reporting</h1>
        <p className="text-sm text-muted-foreground">
          Snapshot estimate based on configured pricing and current Prometheus
          resource requests.
        </p>
        <p className="text-xs text-muted-foreground">
          Rates: CPU {formatCost(report.rates.cpuCore)} / core, RAM{" "}
          {formatCost(report.rates.memoryGb)} / GB, Storage{" "}
          {formatCost(report.rates.storageGb)} / GB
        </p>
        <p className="text-xs text-muted-foreground">
          Costs from namespaces listed in <code>sharednamespaces</code> are
          redistributed evenly across the remaining namespaces in each cluster.
        </p>
      </section>

      <SharedNamespacesNotice sharedNamespaces={excludedSharedNamespaces} />

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
  );
}
