import Link from 'next/link'
import { redirect } from 'next/navigation'

import { CredentialsLoginForm } from '@/components/auth/credentials-login-form'
import { OidcLoginButton } from '@/components/auth/login-button'
import { Button } from '@/components/ui/button'
import { auth, getAuthMode } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const authMode = getAuthMode()

  if (authMode === 'none') {
    redirect('/')
  }

  const params = await searchParams
  const session = await auth()
  const callbackUrl =
    typeof params.callbackUrl === 'string' && params.callbackUrl ? params.callbackUrl : '/'

  if (session?.user?.roles?.includes('viewer')) {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          {authMode === 'oidc' ? (
            <p className="text-sm text-muted-foreground">
              Use your OIDC account to access Spendemon.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Use the locally configured username and password to access Spendemon.
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {authMode === 'oidc' ? (
            <OidcLoginButton callbackUrl={callbackUrl} />
          ) : (
            <CredentialsLoginForm callbackUrl={callbackUrl} />
          )}
          <Button asChild variant="ghost">
            <Link href="/unauthorized">Why am I blocked?</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
