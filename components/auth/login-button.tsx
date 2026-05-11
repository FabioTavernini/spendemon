'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'

import { Button } from '@/components/ui/button'

export function OidcLoginButton({ callbackUrl = '/' }: { callbackUrl?: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <Button
      disabled={isSubmitting}
      onClick={async () => {
        if (isSubmitting) {
          return
        }

        setIsSubmitting(true)
        await signIn('oidc', { callbackUrl })
      }}
      type="button"
    >
      {isSubmitting ? 'Redirecting...' : 'Sign in with OIDC'}
    </Button>
  )
}
