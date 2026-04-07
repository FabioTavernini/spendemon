"use client"

import { ArrowUpDown, ArrowDown, ArrowUp } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"

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
    cell: ({ row }) => <span className="font-medium">{row.original.pod}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
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
