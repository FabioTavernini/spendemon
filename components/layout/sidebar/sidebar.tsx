
import { Coins, Search, Settings } from "lucide-react"
import { Suspense } from "react"
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
  SidebarTrigger
} from "@/components/ui/sidebar"
import { SpendemonLogo } from "@/components/logo"

import Link from "next/link"
import { NamespaceSelect } from "@/components/namespaceselect"

export function AppSidebar() {
  return (
    <>

      <Sidebar collapsible="icon">
        <SidebarHeader >
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/">
                  {/* <Search className="h-4 w-4 shrink-0" /> */}
                  <SpendemonLogo className="h-4 w-4 shrink-0" />
                  <span className="truncate text-lg font-semibold">Spendemon</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

          </SidebarMenu>
        </SidebarHeader>

        <Separator className="my-4" />

        <SidebarContent>
          <SidebarMenu className="px-2">
            <SidebarMenuItem>
              <Suspense fallback={null}>
                <ClusterSelect />
              </Suspense>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Suspense fallback={null}>
                <NamespaceSelect />
              </Suspense>
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
          <SidebarMenu>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/settings">
                  <Settings className="h-4 w-4 shrink-0" />
                  <span className="truncate">Settings</span>
                </Link>
              </SidebarMenuButton>

            </SidebarMenuItem>
            <SidebarMenuItem>
              <ModeToggle />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarTrigger className="sticky top-1 z-50 ml-1" />


    </>
  )
}
