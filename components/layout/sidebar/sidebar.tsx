import {
    Sidebar,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarContent,
} from "@/components/ui/sidebar"

import { ModeToggle } from "@/components/themeselector"
import { Separator } from "@/components/ui/separator"
import { ClusterSelect } from "@/components/clusterselect"
import { Glasses } from "lucide-react"

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <Glasses className="" />
                    <h2 className="text-lg font-semibold truncate">Spendemon</h2>
                </div>

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
        </Sidebar>
    )
}