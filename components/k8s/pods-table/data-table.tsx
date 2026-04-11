"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Columns3, Download } from "lucide-react"

import {
  Column,
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  useReactTable,
} from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  initialPageSize?: number
  enablePagination?: boolean
}

type VisibilityState = Record<string, boolean>

export function DataTable<TData, TValue>({
  columns,
  data,
  initialPageSize = 10,
  enablePagination = true,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  })

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: getSortedRowModel(),
    state: {
      columnVisibility,
      pagination,
      sorting,
    },
  })

  function getColumnLabel(column: Column<TData, unknown>) {
    const header = column.columnDef.header

    if (typeof header === "string") {
      return header
    }

    return column.id
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  }

  function escapeCsvValue(value: unknown) {
    const stringValue = String(value ?? "")
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  function handleExport() {
    const visibleColumns = table
      .getVisibleLeafColumns()
      .filter((column) => typeof column.accessorFn !== "undefined")

    const headerRow = visibleColumns
      .map((column) => escapeCsvValue(getColumnLabel(column)))
      .join(",")

    const dataRows = table.getSortedRowModel().rows.map((row) =>
      visibleColumns
        .map((column) => escapeCsvValue(row.getValue(column.id)))
        .join(",")
    )

    const csvContent = [headerRow, ...dataRows].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    const date = new Date().getFullYear() + "-" + String(new Date().getMonth() + 1).padStart(2, "0") + "-" + String(new Date().getDate()).padStart(2, "0")

    link.href = url
    link.download = `table-export-${date}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const currentPage = table.getState().pagination.pageIndex + 1
  const pageCount = Math.max(table.getPageCount(), 1)
  const pageSizes = Array.from(new Set([initialPageSize, 10, 20, 50])).sort(
    (a, b) => a - b
  )
  const visibleRows = enablePagination
    ? table.getRowModel().rows
    : table.getSortedRowModel().rows

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="flex items-center justify-end gap-2 border-b px-4 py-3">
        <Button variant="outline" size="lg" className="w-fit" onClick={handleExport}>
          <Download />
          Export
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="lg" className="w-fit">
              <Columns3 />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-fit">
            {table
              .getAllColumns()
              .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="max-h-[40rem]">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {visibleRows.length ? (
              visibleRows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {enablePagination ? (
        <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="text-muted-foreground">
            Showing {table.getRowModel().rows.length} of {table.getSortedRowModel().rows.length} rows
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-muted-foreground">
              <span>Rows per page</span>
              <select
                className="rounded-md border bg-background px-2 py-1 text-foreground"
                value={table.getState().pagination.pageSize}
                onChange={(event) => table.setPageSize(Number(event.target.value))}
              >
                {pageSizes.map((pageSize) => (
                  <option key={pageSize} value={pageSize}>
                    {pageSize}
                  </option>
                ))}
              </select>
            </label>
            <div className="text-muted-foreground">
              Page {currentPage} of {pageCount}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
                <ChevronRight />
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
