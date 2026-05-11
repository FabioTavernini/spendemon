"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Popover } from "radix-ui"
import { Check, ChevronDown, FolderKanban } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SidebarMenuButton } from "./ui/sidebar"

type NamespaceGroup = {
  totalNamespaces: number
  namespaces: string[]
}

type NamespacesResponse = {
  totalNamespaces: number
  totalClusters: number
  clusters: Record<string, NamespaceGroup>
}

export function NamespaceSelect() {
  const [namespaceGroups, setNamespaceGroups] = useState<
    Array<{ cluster: string; namespaces: string[] }>
  >([])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const selectedClustersParam = searchParams.get("clusters") ?? ""
  const selectedNamespacesParam = searchParams.get("namespaces") ?? ""

  const selectedNamespaces = selectedNamespacesParam
    ? selectedNamespacesParam
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : []

  useEffect(() => {
    const params = new URLSearchParams()

    if (selectedClustersParam) {
      params.set("clusters", selectedClustersParam)
    }

    const queryString = params.toString()
    const url = queryString ? `/api/namespaces?${queryString}` : "/api/namespaces"

    fetch(url)
      .then((res) => res.json())
      .then((data: NamespacesResponse) => {
        const nextGroups = Object.entries(data.clusters ?? {}).map(
          ([cluster, value]) => ({
            cluster,
            namespaces: [...(value.namespaces ?? [])].sort((a, b) =>
              a.localeCompare(b)
            ),
          })
        )

        nextGroups.sort((a, b) => a.cluster.localeCompare(b.cluster))
        setNamespaceGroups(nextGroups)
      })
  }, [selectedClustersParam])

  function updateNamespaces(newSelection: string[]) {
    const params = new URLSearchParams(searchParams.toString())

    if (newSelection.length === 0) {
      params.delete("namespaces")
    } else {
      params.set("namespaces", newSelection.join(","))
    }

    router.push(`${pathname}?${params.toString()}`)
  }

  const namespaceItems = useMemo(
    () =>
      namespaceGroups.flatMap((group) =>
        group.namespaces.map((namespace) => ({
          cluster: group.cluster,
          label: namespace,
          value: `${group.cluster}:${namespace}`,
        }))
      ),
    [namespaceGroups]
  )

  const filteredNamespaceItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()

    if (!normalizedQuery) {
      return namespaceItems
    }

    return namespaceItems.filter((item) =>
      `${item.label} ${item.cluster}`.toLocaleLowerCase().includes(normalizedQuery)
    )
  }, [namespaceItems, query])

  function toggleNamespace(value: string) {
    if (selectedNamespaces.includes(value)) {
      updateNamespaces(selectedNamespaces.filter((item) => item !== value))
      return
    }

    updateNamespaces([...selectedNamespaces, value])
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)

        if (!nextOpen) {
          setQuery("")
        }
      }}
    >
      <Popover.Trigger asChild>
        <SidebarMenuButton className="justify-between">
          <div className="flex items-center gap-2 hover:cursor-pointer">
            <FolderKanban className="h-4 w-4 shrink-0" />
            <span>
              {selectedNamespaces.length === 0
                ? "All Namespaces"
                : `${selectedNamespaces.length} selected`}
            </span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
        </SidebarMenuButton>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          className="z-50 w-(--radix-popover-trigger-width) min-w-56 rounded-lg border bg-popover p-2 text-popover-foreground shadow-md outline-hidden"
          sideOffset={4}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
          }}
        >
        <div className="space-y-2">
          <div className="relative">
            <Input
              aria-expanded={open}
              aria-haspopup="listbox"
              autoFocus
              className="pr-8"
              placeholder="Search namespaces..."
              role="combobox"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <Button
            className="w-full justify-start"
            size="sm"
            type="button"
            variant="ghost"
            onClick={() => {
              updateNamespaces([])
              setOpen(false)
            }}
          >
            All Namespaces
          </Button>
          {filteredNamespaceItems.length === 0 ? (
            <div className="px-2 py-4 text-sm text-muted-foreground">
              No namespaces found.
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              {filteredNamespaceItems.map((item) => (
                <button
                  key={item.value}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
                  type="button"
                  onClick={() => toggleNamespace(item.value)}
                >
                  <Check
                    className={
                      selectedNamespaces.includes(item.value)
                        ? "h-4 w-4 shrink-0 text-muted-foreground opacity-100"
                        : "h-4 w-4 shrink-0 text-muted-foreground opacity-0"
                    }
                  />
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="truncate">{item.label}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {item.cluster}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
