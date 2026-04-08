'use client'

import { SessionProvider } from 'next-auth/react'

export function AuthProvider({
  children,
  enabled,
}: {
  children: React.ReactNode
  enabled: boolean
}) {
  if (!enabled) {
    return <>{children}</>
  }

  return <SessionProvider>{children}</SessionProvider>
}
