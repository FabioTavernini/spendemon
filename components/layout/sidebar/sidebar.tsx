import Link from "next/link"
import { Coins, Search, Settings } from "lucide-react"

import { ClusterSelect } from "@/components/clusterselect"
import { ModeToggle } from "@/components/themeselector"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/">
                <Search className="h-4 w-4 shrink-0" />
                <span className="truncate text-lg font-semibold">Spendemon</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <Separator className="my-4" />
          <SidebarMenuItem>
            <ModeToggle />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <Separator className="my-4" />

      <SidebarContent>
        <SidebarMenu className="px-2">
          <SidebarMenuItem>
            <ClusterSelect />
          </SidebarMenuItem>
        </SidebarMenu>

        <Separator className="my-4" />

        <SidebarMenu className="px-2">
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/">
                <Settings className="h-4 w-4 shrink-0" />
                <span className="truncate">Overview</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/costreporting">
                <Coins className="h-4 w-4 shrink-0" />
                <span className="truncate">Cost Reporting</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu className="px-2">
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/settings">
                <Settings className="h-4 w-4 shrink-0" />
                <span className="truncate">Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
