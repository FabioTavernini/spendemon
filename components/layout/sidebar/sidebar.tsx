import {
    Sidebar,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarContent,
    SidebarMenuButton
} from "@/components/ui/sidebar"

import { ModeToggle } from "@/components/themeselector"
import { Separator } from "@/components/ui/separator"
import { ClusterSelect } from "@/components/clusterselect"
import { Search, Settings } from "lucide-react"

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="flex flex-col gap-4">
                <SidebarMenuButton className="justify-between">
                    <a href="/">
                        <div className="flex items-center gap-2">
                            <Search className="h-4 w-4 shrink-0" />
                            <h2 className="text-lg font-semibold truncate group-data-[collapsible=icon]:hidden">Spendemon</h2>
                        </div>
                    </a>
                </SidebarMenuButton>


                <SidebarMenu>
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
            </SidebarContent>

            <Separator className="my-4" />


            <SidebarContent className="px-2">
                <SidebarMenuButton className="justify-between">
                    <a href="/">
                        <div className="flex items-center gap-2">
                            <Settings className="h-4 w-4  shrink-0" />
                            <h2 className="text-lg font-semibold truncate group-data-[collapsible=icon]:hidden">Settings</h2>
                        </div>
                    </a>
                </SidebarMenuButton>
            </SidebarContent>

        </Sidebar>
    )
}
