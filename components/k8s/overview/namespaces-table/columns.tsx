"use client"

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"

export type NamespaceRow = {
  cluster: string
  namespace: string
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

export const columns: ColumnDef<NamespaceRow>[] = [
  {
    accessorKey: "cluster",
    header: ({ column }) => <SortableHeader column={column} label="Cluster" />,
  },
  {
    accessorKey: "namespace",
    header: ({ column }) => (
      <SortableHeader column={column} label="Namespace" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.original.namespace}</span>
    ),
  },
]
