"use client"

import { ArrowUpDown, ArrowDown, ArrowUp } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PodHistoryDialog } from "@/components/k8s/pod-history-dialog"

function formatNumber(value: number) {
  if (value !== 0 && Math.abs(value) < 0.01) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    })
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function formatCost(value: number) {
  if (value !== 0 && Math.abs(value) < 0.01) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    })
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export type PodCostRow = {
  clusterName: string
  namespaceName: string
  pod: string
  status: string
  cpuCores: number
  memoryGb: number
  storageGb: number
  cpuCost: number
  memoryCost: number
  storageCost: number
  totalCost: number
  isEstimated: boolean
  estimatedResources: string[]
}

export type NamespaceCostRow = {
  clusterName: string
  namespaceName: string
  totalPods: number
  estimatedPodCount: number
  totalCpuCores: number
  totalMemoryGb: number
  totalStorageGb: number
  totalCost: number
  avgCpuCores?: number
  avgMemoryGb?: number
  avgCpuCost?: number
  avgMemoryCost?: number
  avgTotalCost?: number
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "running":
    case "completed":
    case "succeeded":
      return "text-green-500"
    case "pending":
      return "text-orange-500"
    case "failed":
      return "text-red-500"
    default:
      return "text-red-500"
  }
}

function SortableHeader({
  column,
  label,
}: {
  column: {
    getIsSorted: () => false | "asc" | "desc"
    toggleSorting: (desc?: boolean) => void
  }
  label: string
}) {
  const sorted = column.getIsSorted()
  const Icon =
    sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown

  return (
    <div className="text-right">
      <Button
        variant="ghost"
        size="sm"
        className="ml-auto"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        {label}
        <Icon />
      </Button>
    </div>
  )
}

export const podCostColumns: ColumnDef<PodCostRow>[] = [
  {
    accessorKey: "clusterName",
    header: "Cluster",
  },
  {
    accessorKey: "namespaceName",
    header: "Namespace",
  },
  {
    accessorKey: "pod",
    header: "Pod",
    cell: ({ row }) => (
      <PodHistoryDialog pod={row.original}>
        <button className="font-medium underline-offset-4 hover:underline cursor-pointer text-left">
          {row.original.pod}
        </button>
      </PodHistoryDialog>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <span className={getStatusColor(row.original.status)}>
        {row.original.status}
      </span>
    ),
  },
  {
    accessorKey: "isEstimated",
    header: "Estimate",
    cell: ({ row }) =>
      row.original.isEstimated ? (
        <Badge
          className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
          variant="outline"
        >
          {row.original.estimatedResources.join(", ")}
        </Badge>
      ) : (
        <span className="text-muted-foreground">No</span>
      ),
  },
  {
    accessorKey: "cpuCores",
    header: ({ column }) => <SortableHeader column={column} label="CPU" />,
    cell: ({ row }) => (
      <div className="text-right">{formatNumber(row.original.cpuCores)}</div>
    ),
  },
  {
    accessorKey: "memoryGb",
    header: ({ column }) => <SortableHeader column={column} label="RAM GB" />,
    cell: ({ row }) => (
      <div className="text-right">{formatNumber(row.original.memoryGb)}</div>
    ),
  },
  {
    accessorKey: "storageGb",
    header: ({ column }) => <SortableHeader column={column} label="Storage GB" />,
    cell: ({ row }) => (
      <div className="text-right">{formatNumber(row.original.storageGb)}</div>
    ),
  },
  {
    accessorKey: "cpuCost",
    header: () => <div className="text-right">CPU Cost</div>,
    cell: ({ row }) => (
      <div className="text-right">{formatCost(row.original.cpuCost)}</div>
    ),
  },
  {
    accessorKey: "memoryCost",
    header: () => <div className="text-right">RAM Cost</div>,
    cell: ({ row }) => (
      <div className="text-right">{formatCost(row.original.memoryCost)}</div>
    ),
  },
  {
    accessorKey: "storageCost",
    header: () => <div className="text-right">Storage Cost</div>,
    cell: ({ row }) => (
      <div className="text-right">{formatCost(row.original.storageCost)}</div>
    ),
  },
  {
    accessorKey: "totalCost",
    header: ({ column }) => <SortableHeader column={column} label="Cost" />,
    cell: ({ row }) => (
      <div className="text-right">{formatCost(row.original.totalCost)}</div>
    ),
  },
]

export const namespaceCostColumns: ColumnDef<NamespaceCostRow>[] = [
  {
    accessorKey: "clusterName",
    header: "Cluster",
  },
  {
    accessorKey: "namespaceName",
    header: "Namespace",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.namespaceName}</span>
    ),
  },
  {
    accessorKey: "totalPods",
    header: () => <div className="text-right">Pods</div>,
    cell: ({ row }) => (
      <div className="text-right">{formatNumber(row.original.totalPods)}</div>
    ),
  },
  {
    accessorKey: "totalCpuCores",
    header: ({ column }) => <SortableHeader column={column} label="CPU" />,
    cell: ({ row }) => (
      <div className="text-right">{formatNumber(row.original.totalCpuCores)}</div>
    ),
  },
  {
    accessorKey: "totalMemoryGb",
    header: ({ column }) => <SortableHeader column={column} label="RAM GB" />,
    cell: ({ row }) => (
      <div className="text-right">{formatNumber(row.original.totalMemoryGb)}</div>
    ),
  },
  {
    accessorKey: "totalStorageGb",
    header: ({ column }) => <SortableHeader column={column} label="Storage GB" />,
    cell: ({ row }) => (
      <div className="text-right">{formatNumber(row.original.totalStorageGb)}</div>
    ),
  },
  {
    accessorKey: "totalCost",
    header: ({ column }) => <SortableHeader column={column} label="Cost" />,
    cell: ({ row }) => (
      <div className="text-right">
        {formatCost(row.original.totalCost)}
        {row.original.estimatedPodCount > 0 ? (
          <div className="text-xs text-amber-700 dark:text-amber-400">
            Includes {row.original.estimatedPodCount} estimate
            {row.original.estimatedPodCount === 1 ? "" : "s"}
          </div>
        ) : null}
      </div>
    ),
  },
  {
    accessorKey: "avgCpuCost",
    header: ({ column }) => <SortableHeader column={column} label="Avg CPU Cost" />,
    cell: ({ row }) => (
      <div className="text-right text-muted-foreground">
        {row.original.avgCpuCost != null ? formatCost(row.original.avgCpuCost) : "—"}
      </div>
    ),
  },
  {
    accessorKey: "avgMemoryCost",
    header: ({ column }) => <SortableHeader column={column} label="Avg RAM Cost" />,
    cell: ({ row }) => (
      <div className="text-right text-muted-foreground">
        {row.original.avgMemoryCost != null ? formatCost(row.original.avgMemoryCost) : "—"}
      </div>
    ),
  },
  {
    accessorKey: "avgTotalCost",
    header: ({ column }) => <SortableHeader column={column} label="Avg Cost" />,
    cell: ({ row }) => (
      <div className="text-right text-muted-foreground">
        {row.original.avgTotalCost != null ? formatCost(row.original.avgTotalCost) : "—"}
      </div>
    ),
  },
]
