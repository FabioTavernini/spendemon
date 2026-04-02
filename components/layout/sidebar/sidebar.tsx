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
import { ChevronDown } from "lucide-react"
import { Separator } from "@/components/ui/separator"

export function AppSidebar() {
    return (
        <Sidebar>
            <SidebarHeader className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold truncate">My App</h2>

                <SidebarMenu>
                    <SidebarMenuItem>
                        <ModeToggle />
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <Separator className="my-4" />

            <SidebarMenu className="px-2">
                <SidebarMenuItem>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <SidebarMenuButton className="justify-between">
                                Select Cluster
                                <ChevronDown className="ml-2" />
                            </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem>
                                <span>Acme Inc</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </SidebarMenuItem>
            </SidebarMenu>
        </Sidebar>
    )
}