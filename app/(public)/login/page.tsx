import Link from 'next/link'
import { redirect } from 'next/navigation'

import { LoginButton } from '@/components/auth/login-button'
import { Button } from '@/components/ui/button'
import { auth, isOidcEnabled } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  if (!isOidcEnabled()) {
    redirect('/')
  }

  const session = await auth()

  if (session?.user?.roles?.includes('viewer')) {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Use your Keycloak account to access Spendemon.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <LoginButton />
          <Button asChild variant="ghost">
            <Link href="/unauthorized">Why am I blocked?</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
