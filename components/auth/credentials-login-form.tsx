'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function CredentialsLoginForm({ callbackUrl = '/' }: { callbackUrl?: string }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const result = await signIn('credentials', {
        username,
        password,
        callbackUrl,
        redirect: false,
      })

      if (!result) {
        throw new Error('No response from the auth server.')
      }

      if (result.error) {
        setError('Invalid username or password.')
        return
      }

      globalThis.location.href = result.url ?? callbackUrl
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Sign in failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <label className="space-y-2">
        <span className="block text-sm font-medium">Username</span>
        <Input
          autoComplete="username"
          name="username"
          onChange={(event) => setUsername(event.target.value)}
          required
          type="text"
          value={username}
        />
      </label>

      <label className="space-y-2">
        <span className="block text-sm font-medium">Password</span>
        <Input
          autoComplete="current-password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button disabled={isSubmitting || !username || !password} type="submit">
        {isSubmitting ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  )
}
