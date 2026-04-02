import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"

import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem
} from "@/components/ui/dropdown-menu"

import { ModeToggle } from "@/components/themeselector"

import { Separator } from "@/components/ui/separator"

import { ClusterSelect } from "@/components/clusterselect"

export function AppSidebar() {
    return (
        <Sidebar>
            <SidebarHeader className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold truncate">Spendemon</h2>

                <SidebarMenu>
                    <SidebarMenuItem>
                        <ModeToggle />
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <Separator className="my-4" />

            <SidebarMenu className="px-2">
                    <SidebarMenuItem>
                        <ClusterSelect />
                    </SidebarMenuItem>
            </SidebarMenu>
        </Sidebar>
    )
}