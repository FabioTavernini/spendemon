"use client"

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type NodeRow = {
  cluster: string
  node: string
  status: "Ready" | "NotReady" | "Unknown"
  roles: string[]
  internalIp: string | null
  kubeletVersion: string | null
  containerRuntimeVersion: string | null
  osImage: string | null
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

function getStatusClasses(status: NodeRow["status"]) {
  switch (status) {
    case "Ready":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
    case "NotReady":
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
    default:
      return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
  }
}

function renderNullableValue(value: string | null, className?: string) {
  if (!value) {
    return <span className="text-muted-foreground">N/A</span>
  }

  return (
    <span className={className} title={value}>
      {value}
    </span>
  )
}

export const columns: ColumnDef<NodeRow>[] = [
  {
    accessorKey: "cluster",
    header: ({ column }) => <SortableHeader column={column} label="Cluster" />,
  },
  {
    accessorKey: "node",
    header: ({ column }) => <SortableHeader column={column} label="Node" />,
    cell: ({ row }) => (
      <span className="block max-w-[18rem] truncate font-medium" title={row.original.node}>
        {row.original.node}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader column={column} label="Status" />,
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={cn("font-medium", getStatusClasses(row.original.status))}
      >
        {row.original.status}
      </Badge>
    ),
  },
  {
    id: "roles",
    accessorFn: (row) => row.roles.join(", "),
    header: ({ column }) => <SortableHeader column={column} label="Roles" />,
    cell: ({ row }) =>
      row.original.roles.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {row.original.roles.map((role) => (
            <Badge key={role} variant="secondary">
              {role}
            </Badge>
          ))}
        </div>
      ) : (
        <span className="text-muted-foreground">Unassigned</span>
      ),
  },
  {
    accessorKey: "internalIp",
    header: ({ column }) => (
      <SortableHeader column={column} label="Internal IP" />
    ),
    cell: ({ row }) => renderNullableValue(row.original.internalIp),
  },
  {
    accessorKey: "kubeletVersion",
    header: ({ column }) => (
      <SortableHeader column={column} label="Kubelet" />
    ),
    cell: ({ row }) => renderNullableValue(row.original.kubeletVersion),
  },
  {
    accessorKey: "containerRuntimeVersion",
    header: ({ column }) => (
      <SortableHeader column={column} label="Runtime" />
    ),
    cell: ({ row }) =>
      renderNullableValue(
        row.original.containerRuntimeVersion,
        "block max-w-[16rem] truncate"
      ),
  },
  {
    accessorKey: "osImage",
    header: ({ column }) => <SortableHeader column={column} label="OS Image" />,
    cell: ({ row }) =>
      renderNullableValue(row.original.osImage, "block max-w-[18rem] truncate"),
  },
]
