// components/layout/sidebar/ClusterSelect.tsx
import { ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenuButton } from "./ui/sidebar"

// If this is server-side, fetch the full URL
export async function ClusterSelect() {
  // Use absolute URL for server-side fetch
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const clusters = await fetch(`${baseUrl}/api/clusters`).then(res => res.json());

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton className="justify-between">
          Select Cluster
          <ChevronDown className="ml-2" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
<DropdownMenuContent>
  {clusters.map((cluster: string) => (
    <DropdownMenuItem key={cluster}>
      <span>{cluster}</span>
    </DropdownMenuItem>
  ))}
</DropdownMenuContent>
    </DropdownMenu>
  )
}