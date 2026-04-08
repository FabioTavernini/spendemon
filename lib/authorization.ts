import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'

import { authorizeRole, type AppRole } from '@/lib/auth'

export async function requirePageRole(role: AppRole) {
  const result = await authorizeRole(role)

  if (!result.ok && result.reason === 'disabled') {
    return null
  }

  if (!result.ok && result.reason === 'unauthenticated') {
    redirect('/login')
  }

  if (!result.ok) {
    redirect('/unauthorized')
  }

  return result.session
}

export async function requireApiRole(role: AppRole) {
  const result = await authorizeRole(role)

  if (!result.ok && result.reason === 'disabled') {
    return null
  }

  if (result.ok) {
    return result.session
  }

  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: result.reason === 'unauthenticated' ? 401 : 403 }
  )
}
