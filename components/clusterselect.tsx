"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { ChevronDown, Check, Grid2X2 } from "lucide-react"
import { Popover } from "radix-ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SidebarMenuButton } from "./ui/sidebar"

type Cluster = {
  name: string
  prometheusUrl: string
}

type ClustersResponse = {
  totalClusters: number
  clusters: Cluster[]
}

export function ClusterSelect() {
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const selectedParam = searchParams.get("clusters")

  const selected = selectedParam
    ? selectedParam
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : []

  useEffect(() => {
    fetch("/api/clusters")
      .then((res) => res.json())
      .then((data: ClustersResponse) => {
        const nextClusters = [...(data.clusters ?? [])].sort((a, b) =>
          a.name.localeCompare(b.name)
        )

        setClusters(nextClusters)
      })
  }, [])

  const filteredClusters = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()

    if (!normalizedQuery) {
      return clusters
    }

    return clusters.filter((cluster) =>
      cluster.name.toLocaleLowerCase().includes(normalizedQuery)
    )
  }, [clusters, query])

  function updateClusters(newSelection: string[]) {
    const params = new URLSearchParams(searchParams.toString())

    if (newSelection.length === 0) {
      params.delete("clusters")
    } else {
      params.set("clusters", newSelection.join(","))
    }

    router.push(`${pathname}?${params.toString()}`)
  }

  function toggleCluster(name: string) {
    let newSelection: string[]

    if (selected.includes(name)) {
      newSelection = selected.filter(c => c !== name)
    } else {
      newSelection = [...selected, name]
    }

    updateClusters(newSelection)
  }

  function isSelected(name: string) {
    return selected.includes(name)
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
            <Grid2X2 className="h-4 w-4 shrink-0" />
            <span>
              {selected.length === 0
                ? "All Clusters"
                : `${selected.length} selected`}
            </span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4" />
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
                placeholder="Search clusters..."
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
                updateClusters([])
                setOpen(false)
              }}
            >
              All Clusters
            </Button>
            {filteredClusters.length === 0 ? (
              <div className="px-2 py-4 text-sm text-muted-foreground">
                No clusters found.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto" role="listbox">
                {filteredClusters.map((cluster) => (
                  <button
                    key={cluster.name}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
                    type="button"
                    onClick={() => toggleCluster(cluster.name)}
                  >
                    <Check
                      className={
                        isSelected(cluster.name)
                          ? "h-4 w-4 shrink-0 text-muted-foreground opacity-100"
                          : "h-4 w-4 shrink-0 text-muted-foreground opacity-0"
                      }
                    />
                    <span className="truncate">{cluster.name}</span>
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
