import { NextResponse } from 'next/server'
import NextAuth from 'next-auth'

import { getNextAuthOptions, isOidcEnabled } from '@/lib/auth'

async function authHandler(request: Request, context: unknown) {
  if (!isOidcEnabled()) {
    return NextResponse.json({ error: 'OIDC is disabled.' }, { status: 404 })
  }

  const handler = NextAuth(getNextAuthOptions())
  return handler(request, context)
}

export { authHandler as GET, authHandler as POST }
