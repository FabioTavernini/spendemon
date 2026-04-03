"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { ChevronDown, Check } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenuButton } from "./ui/sidebar"

type Cluster = {
  name: string;
  prometheusUrl: string;
};

export function ClusterSelect() {
  const [clusters, setClusters] = useState<Cluster[]>([])
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const selectedParam = searchParams.get("clusters")

  const selected = selectedParam
    ? selectedParam.split(",")
    : [] // empty = ALL

  type ClustersResponse = {
    totalClusters: number
    clusters: Cluster[]
  }

  useEffect(() => {
    fetch("/api/clusters")
      .then((res) => res.json())
      .then((data: ClustersResponse) => {
        setClusters(data.clusters ?? [])
      })
  }, [])

  function updateClusters(newSelection: string[]) {
    const params = new URLSearchParams(searchParams.toString())

    if (newSelection.length === 0) {
      params.delete("clusters") // 👉 means ALL
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton className="justify-between">
          {selected.length === 0
            ? "All Clusters"
            : `${selected.length} selected`}
          <ChevronDown className="ml-2" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        {/* ALL option */}
        <DropdownMenuItem onClick={() => updateClusters([])}>
          {selected.length === 0 && <Check className="mr-2 h-4 w-4" />}
          All Clusters
        </DropdownMenuItem>

        {clusters.map((cluster) => (
          <DropdownMenuItem
            key={cluster.name}
            onClick={() => toggleCluster(cluster.name)}
          >
            {isSelected(cluster.name) && (
              <Check className="mr-2 h-4 w-4" />
            )}
            {cluster.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}