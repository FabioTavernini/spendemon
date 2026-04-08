import type { NextAuthOptions, Session } from 'next-auth'
import { getServerSession } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import type { OAuthConfig } from 'next-auth/providers/oauth'

import { parseOidcFromSettings, readSettingsFileSync, type OidcSettings } from '@/lib/settings'

export type AppRole = 'admin' | 'viewer'

type AuthGuardResult =
  | { ok: true; session: Session }
  | { ok: false; reason: 'disabled' | 'unauthenticated' | 'unauthorized' }

type OidcProfile = {
  sub?: string
  name?: string
  email?: string
  preferred_username?: string
  picture?: string
  groups?: unknown
  roles?: unknown
  realm_access?: {
    roles?: unknown
  }
  resource_access?: Record<string, { roles?: unknown }>
}

type JwtPayload = Record<string, unknown>

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((entry): entry is string => typeof entry === 'string')
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values))
}

function stripLeadingSlash(value: string): string {
  return value.startsWith('/') ? value.slice(1) : value
}

function normalizeMemberships(values: string[]): string[] {
  return dedupe(
    values.flatMap((value) => {
      const normalized = value.trim()

      if (!normalized) {
        return []
      }

      const withoutSlash = stripLeadingSlash(normalized)
      return normalized === withoutSlash ? [normalized] : [normalized, withoutSlash]
    })
  )
}

function parseJwtPayload(token: string | undefined): JwtPayload | null {
  if (!token) {
    return null
  }

  const segments = token.split('.')

  if (segments.length < 2) {
    return null
  }

  try {
    const payload = segments[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padding = '='.repeat((4 - (base64.length % 4)) % 4)
    const decoded = Buffer.from(`${base64}${padding}`, 'base64').toString('utf8')
    return JSON.parse(decoded) as JwtPayload
  } catch {
    return null
  }
}

function extractMembershipsFromClaims(
  claims: Partial<OidcProfile> | JwtPayload | null | undefined,
  clientId: string
): string[] {
  if (!claims) {
    return []
  }

  const directGroups = normalizeStringList(claims.groups)
  const directRoles = normalizeStringList(claims.roles)

  const realmAccess = claims.realm_access
  const realmRoles =
    typeof realmAccess === 'object' && realmAccess !== null
      ? normalizeStringList((realmAccess as { roles?: unknown }).roles)
      : []

  const resourceAccess = claims.resource_access
  const resourceRoles =
    typeof resourceAccess === 'object' && resourceAccess !== null
      ? Object.values(resourceAccess as Record<string, { roles?: unknown }>).flatMap((entry) =>
          normalizeStringList(entry.roles)
        )
      : []

  const clientRoles =
    typeof resourceAccess === 'object' &&
    resourceAccess !== null &&
    clientId in (resourceAccess as Record<string, { roles?: unknown }>)
      ? normalizeStringList(
          (resourceAccess as Record<string, { roles?: unknown }>)[clientId]?.roles
        )
      : []

  return normalizeMemberships([
    ...directGroups,
    ...directRoles,
    ...realmRoles,
    ...resourceRoles,
    ...clientRoles,
  ])
}

function userHasMembership(memberships: string[], target: string): boolean {
  const normalizedTarget = stripLeadingSlash(target.trim())

  return memberships.some((membership) => stripLeadingSlash(membership) === normalizedTarget)
}

function getMembershipsFromAuthContext(params: {
  token: JWT
  profile?: OidcProfile
  account?: { id_token?: string | null; access_token?: string | null } | null
  clientId: string
}): string[] {
  const fromToken = normalizeMemberships(normalizeStringList(params.token.groups))
  const fromProfile = extractMembershipsFromClaims(params.profile, params.clientId)
  const fromIdToken = extractMembershipsFromClaims(
    parseJwtPayload(params.account?.id_token ?? undefined),
    params.clientId
  )
  const fromAccessToken = extractMembershipsFromClaims(
    parseJwtPayload(params.account?.access_token ?? undefined),
    params.clientId
  )

  return dedupe([...fromToken, ...fromProfile, ...fromIdToken, ...fromAccessToken])
}

function getAuthSecret(): string | undefined {
  if (process.env.NEXTAUTH_SECRET) {
    return process.env.NEXTAUTH_SECRET
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'spendemon-dev-nextauth-secret-change-me'
  }

  return undefined
}

export function getOidcSettings(): OidcSettings {
  return parseOidcFromSettings(readSettingsFileSync())
}

export function isOidcEnabled(): boolean {
  return getOidcSettings().enabled
}

function createOidcProvider(oidc: OidcSettings): OAuthConfig<OidcProfile> {
  return {
    id: 'oidc',
    name: 'OIDC',
    wellKnown: `${oidc.issuer}/.well-known/openid-configuration`,
    type: 'oauth',
    authorization: { params: { scope: 'openid email profile' } },
    checks: ['pkce', 'state'],
    idToken: true,
    issuer: oidc.issuer,
    clientId: oidc.clientId,
    clientSecret: oidc.clientSecret,
    profile(profile) {
      return {
        id: profile.sub ?? '',
        name: profile.name ?? profile.preferred_username ?? profile.email ?? profile.sub ?? 'User',
        email: profile.email ?? null,
        image: profile.picture ?? null,
      }
    },
  }
}

export function getNextAuthOptions(): NextAuthOptions {
  const oidc = getOidcSettings()

  if (!oidc.enabled) {
    return {
      secret: getAuthSecret(),
      providers: [],
      session: {
        strategy: 'jwt',
      },
      pages: {
        signIn: '/login',
      },
    }
  }

  return {
    secret: getAuthSecret(),
    providers: [
      createOidcProvider(oidc),
    ],
    session: {
      strategy: 'jwt',
    },
    pages: {
      signIn: '/login',
    },
    callbacks: {
      async jwt({ token, profile, account }) {
        const memberships = getMembershipsFromAuthContext({
          token,
          profile: profile as OidcProfile | undefined,
          account: account
            ? {
                id_token: typeof account.id_token === 'string' ? account.id_token : null,
                access_token:
                  typeof account.access_token === 'string' ? account.access_token : null,
              }
            : null,
          clientId: oidc.clientId,
        })

        token.groups = memberships

        if (process.env.NODE_ENV !== 'production' && memberships.length > 0) {
          console.log('Resolved OIDC memberships:', memberships)
        }

        return token
      },
      async session({ session, token }) {
        const groups = normalizeMemberships(normalizeStringList(token.groups))
        const currentOidc = getOidcSettings()
        const roles: AppRole[] = []

        if (userHasMembership(groups, currentOidc.viewerGroup)) {
          roles.push('viewer')
        }

        if (userHasMembership(groups, currentOidc.adminGroup)) {
          roles.push('admin')
          if (!roles.includes('viewer')) {
            roles.push('viewer')
          }
        }

        session.user.groups = groups
        session.user.roles = roles

        return session
      },
    },
  }
}

export async function auth(): Promise<Session | null> {
  if (!isOidcEnabled()) {
    return null
  }

  try {
    return await getServerSession(getNextAuthOptions())
  } catch (error) {
    console.error('Failed to read auth session:', error)
    return null
  }
}

export async function authorizeRole(role: AppRole): Promise<AuthGuardResult> {
  if (!isOidcEnabled()) {
    return { ok: false, reason: 'disabled' }
  }

  const session = await auth()

  if (!session?.user) {
    return { ok: false, reason: 'unauthenticated' }
  }

  const roles = session.user.roles ?? []

  if (!roles.includes(role)) {
    return { ok: false, reason: 'unauthorized' }
  }

  return { ok: true, session }
}
