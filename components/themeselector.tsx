"use client"
import * as React from "react"
import { ChevronDown, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenuButton } from "./ui/sidebar"


export function ModeToggle() {


    const { setTheme } = useTheme()
    return (
        <DropdownMenu>

            <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                    Select Theme
                    <ChevronDown className="ml-auto" />
                </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                    {"light"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                    {"dark"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                    {"system"}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}