"use client"

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"

export type PodRow = {
  cluster: string
  namespace: string
  pod: string
  status: string
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
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {label}
      <Icon />
    </Button>
  )
}

export const columns: ColumnDef<PodRow>[] = [
  {
    accessorKey: "cluster",
    header: ({ column }) => <SortableHeader column={column} label="Cluster" />,
  },
  {
    accessorKey: "namespace",
    header: ({ column }) => (
      <SortableHeader column={column} label="Namespace" />
    ),
  },
  {
    accessorKey: "pod",
    header: ({ column }) => <SortableHeader column={column} label="Pod" />,
    cell: ({ row }) => <span className="font-medium">{row.original.pod}</span>,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader column={column} label="Status" />,
    cell: ({ row }) => (
      <span className={getStatusColor(row.original.status)}>
        {row.original.status}
      </span>
    ),
  },
]
