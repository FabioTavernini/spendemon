"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { ChevronDown, Check, FolderKanban } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

  function toggleNamespace(cluster: string, namespace: string) {
    const value = `${cluster}:${namespace}`

    if (selectedNamespaces.includes(value)) {
      updateNamespaces(selectedNamespaces.filter((item) => item !== value))
      return
    }

    updateNamespaces([...selectedNamespaces, value])
  }

  function isSelected(cluster: string, namespace: string) {
    return selectedNamespaces.includes(`${cluster}:${namespace}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton className="justify-between">
          <div className="flex items-center gap-2 hover:cursor-pointer">
            <FolderKanban className="h-4 w-4 shrink-0" />
            <span>
              {selectedNamespaces.length === 0
                ? "All Namespaces"
                : `${selectedNamespaces.length} selected`}
            </span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => updateNamespaces([])}>
          {selectedNamespaces.length === 0 && <Check className="mr-2 h-4 w-4" />}
          All Namespaces
        </DropdownMenuItem>

        {namespaceGroups.length > 0 && <DropdownMenuSeparator />}

        {namespaceGroups.map((group, index) => (
          <div key={group.cluster}>
            <DropdownMenuLabel>{group.cluster}</DropdownMenuLabel>
            {group.namespaces.map((namespace) => (
              <DropdownMenuItem
                key={`${group.cluster}:${namespace}`}
                onClick={() => toggleNamespace(group.cluster, namespace)}
              >
                {isSelected(group.cluster, namespace) && (
                  <Check className="mr-2 h-4 w-4" />
                )}
                {namespace}
              </DropdownMenuItem>
            ))}
            {index < namespaceGroups.length - 1 && <DropdownMenuSeparator />}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
