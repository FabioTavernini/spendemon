import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { auth, getAuthMode } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function UnauthorizedPage() {
  const authMode = getAuthMode()
  const session = await auth()

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-8 shadow-sm">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold">Unauthorized</h1>
          <p className="text-sm text-muted-foreground">
            You do not have the required access to use this page.
          </p>
          {authMode === 'oidc' ? (
            <p className="text-sm text-muted-foreground">
              Viewers can access the app, and admins can also manage{' '}
              <code>/settings</code>.
            </p>
          ) : authMode === 'credentials' ? (
            <p className="text-sm text-muted-foreground">
              Use a locally configured viewer or admin account to sign in.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Authentication is currently disabled for this deployment.
            </p>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <Button asChild variant="outline">
            <Link href="/">Back to app</Link>
          </Button>
          <Button asChild>
            <Link href={session ? '/' : '/login'}>{session ? 'Try again' : 'Go to login'}</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
