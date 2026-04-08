import { Coins, Settings } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

import { LogoutButton } from '@/components/auth/logout-button'
import { ClusterSelect } from '@/components/clusterselect'
import { SpendemonLogo } from '@/components/logo'
import { NamespaceSelect } from '@/components/namespaceselect'
import { ModeToggle } from '@/components/themeselector'
import { Separator } from '@/components/ui/separator'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { auth } from '@/lib/auth'

export async function AppSidebar() {
  const session = await auth()
  const canManageSettings = session?.user?.roles?.includes('admin') ?? true
  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/">
                  <SpendemonLogo className="h-4 w-4 shrink-0" />
                  <span className="text-lg font-semibold">Spendemon</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <Separator className="my-4" />

        <SidebarContent>
          <SidebarMenu className="mt-2 px-2">
            <SidebarMenuItem className="mt-2">
              <Suspense fallback={null}>
                <ClusterSelect />
              </Suspense>
            </SidebarMenuItem>
            <SidebarMenuItem className="mt-2">
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
                  <span className="">Overview</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/costreporting">
                  <Coins className="h-4 w-4 shrink-0" />
                  <span className="">Cost Reporting</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            {canManageSettings ? (
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/settings">
                    <Settings className="h-4 w-4 shrink-0" />
                    <span className="truncate">Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ) : null}
            <SidebarMenuItem>
              <ModeToggle />
            </SidebarMenuItem>

            {session ? (
              <SidebarMenuItem>
                <LogoutButton />
              </SidebarMenuItem>
            ) : null}

          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarTrigger className="sticky top-1 z-50 ml-1" />
    </>
  )
}
