"use client"

import { ColumnDef } from "@tanstack/react-table"

export type PodRow = {
  cluster: string
  namespace: string
  pod: string
  status: string
}

export const columns: ColumnDef<PodRow>[] = [
  {
    accessorKey: "cluster",
    header: "Cluster",
  },
  {
    accessorKey: "namespace",
    header: "Namespace",
  },
  {
    accessorKey: "pod",
    header: "Pod",
  },
  {
    accessorKey: "status",
    header: "Status",
  },
]
