"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { ChevronDown, FolderKanban } from "lucide-react"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox"
import { Button } from "@/components/ui/button"
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

  return (
    <Combobox
      items={namespaceItems}
      itemToStringValue={(item) => `${item.label} ${item.cluster}`}
      multiple
      open={open}
      value={namespaceItems.filter((item) => selectedNamespaces.includes(item.value))}
      onOpenChange={setOpen}
      onValueChange={(value) => {
        const nextValue = Array.isArray(value)
          ? value.map((item) => item.value)
          : []

        updateNamespaces(nextValue)
      }}
    >
      <ComboboxTrigger asChild>
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
      </ComboboxTrigger>

      <ComboboxContent className="p-2">
        <div className="space-y-2">
          <ComboboxInput autoFocus placeholder="Search namespaces..." />
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
          <ComboboxEmpty>No namespaces found.</ComboboxEmpty>
          <ComboboxList>
            {(item: { cluster: string; label: string; value: string }) => (
              <ComboboxItem key={item.value} value={item}>
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span className="truncate">{item.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {item.cluster}
                  </span>
                </div>
              </ComboboxItem>
            )}
          </ComboboxList>
        </div>
      </ComboboxContent>
    </Combobox>
  )
}
