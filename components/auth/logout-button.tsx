'use client'

import { LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'

import { SidebarMenuButton } from '@/components/ui/sidebar'

export function LogoutButton() {
  return (
    <SidebarMenuButton
      onClick={() => signOut({ callbackUrl: '/login' })}
      type="button"
    >
      <LogOut className="h-4 w-4 shrink-0" />
      Sign out
    </SidebarMenuButton>
  )
}
