'use client'

import { signIn } from 'next-auth/react'

import { Button } from '@/components/ui/button'

export function LoginButton() {
  return (
    <Button onClick={() => signIn('keycloak', { callbackUrl: '/' })} type="button">
      Sign in with Keycloak
    </Button>
  )
}
