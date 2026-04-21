import { scryptSync, timingSafeEqual } from 'node:crypto'

import type { NextAuthOptions, Session } from 'next-auth'
import { getServerSession } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { OAuthConfig } from 'next-auth/providers/oauth'

import { parseOidcFromSettings, readSettingsFileSync, type OidcSettings } from '@/lib/settings'

export type AppRole = 'admin' | 'viewer'
export type AuthMode = 'none' | 'credentials' | 'oidc'

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

type OidcDebugSnapshot = {
  profileGroups: string[]
  profileRoles: string[]
  profileRealmRoles: string[]
  profileResourceRoles: Record<string, string[]>
  idTokenGroups: string[]
  idTokenRoles: string[]
  idTokenRealmRoles: string[]
  idTokenResourceRoles: Record<string, string[]>
  accessTokenGroups: string[]
  accessTokenRoles: string[]
  accessTokenRealmRoles: string[]
  accessTokenResourceRoles: Record<string, string[]>
  resolvedMemberships: string[]
}

type PasswordVerifier =
  | { type: 'plaintext'; value: string }
  | { type: 'scrypt'; salt: Buffer; hash: Buffer }

type LocalAccount = {
  username: string
  password: PasswordVerifier
  roles: AppRole[]
}

type AuthenticatedUser = {
  id: string
  name: string
  email: null
  image: null
  groups: string[]
  roles: AppRole[]
}

const AUTH_MODE_VALUES: AuthMode[] = ['none', 'credentials', 'oidc']

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((entry): entry is string => typeof entry === 'string')
}

function dedupe<T>(values: T[]): T[] {
  return Array.from(new Set(values))
}

function isAppRole(value: unknown): value is AppRole {
  return value === 'admin' || value === 'viewer'
}

function normalizeRoles(value: unknown): AppRole[] {
  const roles = Array.isArray(value) ? value.filter(isAppRole) : []

  if (roles.includes('admin') && !roles.includes('viewer')) {
    roles.push('viewer')
  }

  return dedupe(roles)
}

function normalizeRoleMap(value: unknown): Record<string, string[]> {
  if (typeof value !== 'object' || value === null) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, entry]) => {
      if (typeof entry !== 'object' || entry === null) {
        return []
      }

      return [[key, normalizeStringList((entry as { roles?: unknown }).roles)]]
    })
  )
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

function getTrimmedEnv(name: string): string | undefined {
  const value = process.env[name]

  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function getPasswordEnv(name: string): string | undefined {
  const value = process.env[name]

  if (typeof value !== 'string') {
    return undefined
  }

  return value.length > 0 ? value : undefined
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

async function loadUserInfoClaims(params: {
  client: {
    userinfo: (token: string) => Promise<unknown>
  }
  tokens: { access_token?: string | null; claims: () => JwtPayload }
}): Promise<JwtPayload> {
  const idTokenClaims = params.tokens.claims()
  const accessToken = params.tokens.access_token

  if (!accessToken) {
    return idTokenClaims
  }

  try {
    const userInfo = await params.client.userinfo(accessToken)

    if (typeof userInfo !== 'object' || userInfo === null) {
      return idTokenClaims
    }

    return {
      ...idTokenClaims,
      ...(userInfo as JwtPayload),
    }
  } catch {
    return idTokenClaims
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

function getDebugSnapshot(params: {
  profile?: OidcProfile
  account?: { id_token?: string | null; access_token?: string | null } | null
  memberships: string[]
}): OidcDebugSnapshot {
  const idTokenClaims = parseJwtPayload(params.account?.id_token ?? undefined)
  const accessTokenClaims = parseJwtPayload(params.account?.access_token ?? undefined)

  return {
    profileGroups: normalizeStringList(params.profile?.groups),
    profileRoles: normalizeStringList(params.profile?.roles),
    profileRealmRoles: normalizeStringList(params.profile?.realm_access?.roles),
    profileResourceRoles: normalizeRoleMap(params.profile?.resource_access),
    idTokenGroups: normalizeStringList(idTokenClaims?.groups),
    idTokenRoles: normalizeStringList(idTokenClaims?.roles),
    idTokenRealmRoles:
      typeof idTokenClaims?.realm_access === 'object' && idTokenClaims.realm_access !== null
        ? normalizeStringList((idTokenClaims.realm_access as { roles?: unknown }).roles)
        : [],
    idTokenResourceRoles: normalizeRoleMap(idTokenClaims?.resource_access),
    accessTokenGroups: normalizeStringList(accessTokenClaims?.groups),
    accessTokenRoles: normalizeStringList(accessTokenClaims?.roles),
    accessTokenRealmRoles:
      typeof accessTokenClaims?.realm_access === 'object' &&
      accessTokenClaims.realm_access !== null
        ? normalizeStringList((accessTokenClaims.realm_access as { roles?: unknown }).roles)
        : [],
    accessTokenResourceRoles: normalizeRoleMap(accessTokenClaims?.resource_access),
    resolvedMemberships: params.memberships,
  }
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

function getAuthSecret(authMode: AuthMode): string | undefined {
  if (process.env.NEXTAUTH_SECRET) {
    return process.env.NEXTAUTH_SECRET
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'spendemon-dev-nextauth-secret-change-me'
  }

  if (authMode !== 'none') {
    throw new Error('NEXTAUTH_SECRET must be set when authentication is enabled in production.')
  }

  return undefined
}

function getConfiguredAuthMode(): AuthMode | null {
  const value = getTrimmedEnv('AUTH_MODE')

  if (!value) {
    return null
  }

  if (!AUTH_MODE_VALUES.includes(value as AuthMode)) {
    throw new Error(`AUTH_MODE must be one of: ${AUTH_MODE_VALUES.join(', ')}.`)
  }

  return value as AuthMode
}

export function getOidcSettings(): OidcSettings {
  return parseOidcFromSettings(readSettingsFileSync())
}

export function getAuthMode(): AuthMode {
  const configuredMode = getConfiguredAuthMode()

  if (configuredMode) {
    return configuredMode
  }

  return getOidcSettings().enabled ? 'oidc' : 'none'
}

export function isAuthEnabled(): boolean {
  return getAuthMode() !== 'none'
}

export function isOidcEnabled(): boolean {
  return getAuthMode() === 'oidc'
}

export function isCredentialsAuthEnabled(): boolean {
  return getAuthMode() === 'credentials'
}

function resolveOidcRuntimeSettings(oidc: OidcSettings): OidcSettings {
  if (!oidc.enabled) {
    return oidc
  }

  const resolved = {
    ...oidc,
    issuer: oidc.issuer
      ? oidc.issuer.replace(/\$\{([A-Z0-9_]+)\}/gi, (_match, envKey: string) => {
          const envValue = process.env[envKey]

          if (typeof envValue !== 'string') {
            throw new Error(`Environment variable "${envKey}" is not set.`)
          }

          return envValue
        })
      : '',
    clientId: oidc.clientId
      ? oidc.clientId.replace(/\$\{([A-Z0-9_]+)\}/gi, (_match, envKey: string) => {
          const envValue = process.env[envKey]

          if (typeof envValue !== 'string') {
            throw new Error(`Environment variable "${envKey}" is not set.`)
          }

          return envValue
        })
      : '',
    clientSecret: oidc.clientSecret
      ? oidc.clientSecret.replace(/\$\{([A-Z0-9_]+)\}/gi, (_match, envKey: string) => {
          const envValue = process.env[envKey]

          if (typeof envValue !== 'string') {
            throw new Error(`Environment variable "${envKey}" is not set.`)
          }

          return envValue
        })
      : '',
    adminGroup: oidc.adminGroup
      ? oidc.adminGroup.replace(/\$\{([A-Z0-9_]+)\}/gi, (_match, envKey: string) => {
          const envValue = process.env[envKey]

          if (typeof envValue !== 'string') {
            throw new Error(`Environment variable "${envKey}" is not set.`)
          }

          return envValue
        })
      : '',
    viewerGroup: oidc.viewerGroup
      ? oidc.viewerGroup.replace(/\$\{([A-Z0-9_]+)\}/gi, (_match, envKey: string) => {
          const envValue = process.env[envKey]

          if (typeof envValue !== 'string') {
            throw new Error(`Environment variable "${envKey}" is not set.`)
          }

          return envValue
        })
      : '',
  }

  const missing = [
    !resolved.issuer && 'issuer',
    !resolved.clientId && 'clientId',
    !resolved.clientSecret && 'clientSecret',
    !resolved.adminGroup && 'adminGroup',
    !resolved.viewerGroup && 'viewerGroup',
  ].filter(Boolean)

  if (missing.length > 0) {
    throw new Error(`OIDC is enabled but these settings are missing: ${missing.join(', ')}.`)
  }

  return resolved
}

function buildOidcScope(extraScopes: string[]): string {
  return Array.from(new Set(['openid', 'email', 'profile', ...extraScopes])).join(' ')
}

function getRolesFromMemberships(memberships: string[], oidc: OidcSettings): AppRole[] {
  const roles: AppRole[] = []

  if (userHasMembership(memberships, oidc.viewerGroup)) {
    roles.push('viewer')
  }

  if (userHasMembership(memberships, oidc.adminGroup)) {
    roles.push('admin')
  }

  return normalizeRoles(roles)
}

function parsePasswordHash(value: string, envName: string): PasswordVerifier {
  const [algorithm, saltHex, hashHex] = value.split(':')
  const hexPattern = /^[0-9a-f]+$/i

  if (
    algorithm !== 'scrypt' ||
    !saltHex ||
    !hashHex ||
    !hexPattern.test(saltHex) ||
    !hexPattern.test(hashHex)
  ) {
    throw new Error(`${envName} must use the format "scrypt:<saltHex>:<hashHex>".`)
  }

  return {
    type: 'scrypt',
    salt: Buffer.from(saltHex, 'hex'),
    hash: Buffer.from(hashHex, 'hex'),
  }
}

function getPasswordVerifier(prefix: 'LOCAL_ADMIN' | 'LOCAL_VIEWER'): PasswordVerifier | null {
  const plaintext = getPasswordEnv(`${prefix}_PASSWORD`)
  const hashed = getTrimmedEnv(`${prefix}_PASSWORD_HASH`)

  if (!plaintext && !hashed) {
    return null
  }

  if (plaintext && hashed) {
    throw new Error(`Set either ${prefix}_PASSWORD or ${prefix}_PASSWORD_HASH, not both.`)
  }

  if (plaintext) {
    return {
      type: 'plaintext',
      value: plaintext,
    }
  }

  return parsePasswordHash(hashed as string, `${prefix}_PASSWORD_HASH`)
}

function buildLocalAccount(role: AppRole): LocalAccount | null {
  const prefix = role === 'admin' ? 'LOCAL_ADMIN' : 'LOCAL_VIEWER'
  const username = getTrimmedEnv(`${prefix}_USERNAME`)
  const password = getPasswordVerifier(prefix)

  if (!username && !password) {
    return null
  }

  if (!username) {
    throw new Error(
      `${prefix}_USERNAME must be set when ${prefix}_PASSWORD or ${prefix}_PASSWORD_HASH is configured.`
    )
  }

  if (!password) {
    throw new Error(
      `Set ${prefix}_PASSWORD or ${prefix}_PASSWORD_HASH when ${prefix}_USERNAME is configured.`
    )
  }

  return {
    username,
    password,
    roles: normalizeRoles(role === 'admin' ? ['admin'] : ['viewer']),
  }
}

function getCredentialsAccounts(): LocalAccount[] {
  const accounts = [buildLocalAccount('admin'), buildLocalAccount('viewer')].flatMap((account) =>
    account ? [account] : []
  )

  if (accounts.length === 0) {
    throw new Error(
      'AUTH_MODE=credentials requires at least one LOCAL_ADMIN_* or LOCAL_VIEWER_* account.'
    )
  }

  const seenUsernames = new Set<string>()

  for (const account of accounts) {
    const normalizedUsername = account.username.toLowerCase()

    if (seenUsernames.has(normalizedUsername)) {
      throw new Error('LOCAL_ADMIN_USERNAME and LOCAL_VIEWER_USERNAME must be different.')
    }

    seenUsernames.add(normalizedUsername)
  }

  return accounts
}

function verifyPlaintextPassword(candidate: string, expected: string): boolean {
  const candidateBuffer = Buffer.from(candidate)
  const expectedBuffer = Buffer.from(expected)

  return (
    candidateBuffer.length === expectedBuffer.length &&
    timingSafeEqual(candidateBuffer, expectedBuffer)
  )
}

function verifyPassword(candidate: string, verifier: PasswordVerifier): boolean {
  if (verifier.type === 'plaintext') {
    return verifyPlaintextPassword(candidate, verifier.value)
  }

  const derived = scryptSync(candidate, verifier.salt, verifier.hash.length)
  return timingSafeEqual(derived, verifier.hash)
}

function createLocalUser(account: LocalAccount): AuthenticatedUser {
  return {
    id: account.username,
    name: account.username,
    email: null,
    image: null,
    groups: [...account.roles],
    roles: [...account.roles],
  }
}

function isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  return (
    typeof (value as { id?: unknown }).id === 'string' &&
    typeof (value as { name?: unknown }).name === 'string' &&
    Array.isArray((value as { groups?: unknown }).groups) &&
    Array.isArray((value as { roles?: unknown }).roles)
  )
}

function createOidcProvider(oidc: OidcSettings): OAuthConfig<OidcProfile> {
  return {
    id: 'oidc',
    name: 'OIDC',
    wellKnown: `${oidc.issuer}/.well-known/openid-configuration`,
    type: 'oauth',
    authorization: { params: { scope: buildOidcScope(oidc.extraScopes) } },
    checks: ['pkce', 'state'],
    idToken: true,
    issuer: oidc.issuer,
    clientId: oidc.clientId,
    clientSecret: oidc.clientSecret,
    userinfo: {
      async request({ client, tokens }) {
        return (await loadUserInfoClaims({
          client: client as { userinfo: (token: string) => Promise<unknown> },
          tokens: tokens as { access_token?: string | null; claims: () => JwtPayload },
        })) as OidcProfile
      },
    },
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

function createCredentialsProvider() {
  return CredentialsProvider({
    id: 'credentials',
    name: 'Credentials',
    credentials: {
      username: {
        label: 'Username',
        type: 'text',
      },
      password: {
        label: 'Password',
        type: 'password',
      },
    },
    async authorize(credentials) {
      const username =
        typeof credentials?.username === 'string' ? credentials.username.trim() : ''
      const password = typeof credentials?.password === 'string' ? credentials.password : ''

      if (!username || !password) {
        return null
      }

      const account = getCredentialsAccounts().find((entry) => entry.username === username)

      if (!account) {
        return null
      }

      if (!verifyPassword(password, account.password)) {
        return null
      }

      return createLocalUser(account)
    },
  })
}

function buildSessionCallback() {
  return async function sessionCallback({ session, token }: { session: Session; token: JWT }) {
    const groups = normalizeMemberships(normalizeStringList(token.groups))
    const roles = normalizeRoles(token.roles)

    session.user = {
      ...session.user,
      groups,
      roles,
    }

    return session
  }
}

function createCredentialsAuthOptions(): NextAuthOptions {
  return {
    secret: getAuthSecret('credentials'),
    providers: [createCredentialsProvider()],
    session: {
      strategy: 'jwt',
    },
    pages: {
      signIn: '/login',
    },
    callbacks: {
      async jwt({ token, user }) {
        if (isAuthenticatedUser(user)) {
          token.groups = user.groups
          token.roles = user.roles
        } else {
          token.groups = normalizeMemberships(normalizeStringList(token.groups))
          token.roles = normalizeRoles(token.roles)
        }

        return token
      },
      session: buildSessionCallback(),
    },
  }
}

function createOidcAuthOptions(oidc: OidcSettings): NextAuthOptions {
  return {
    secret: getAuthSecret('oidc'),
    providers: [createOidcProvider(oidc)],
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
        token.roles = getRolesFromMemberships(memberships, oidc)

        if (oidc.debug) {
          console.log(
            'OIDC membership debug:',
            getDebugSnapshot({
              profile: profile as OidcProfile | undefined,
              account: account
                ? {
                    id_token: typeof account.id_token === 'string' ? account.id_token : null,
                    access_token:
                      typeof account.access_token === 'string' ? account.access_token : null,
                  }
                : null,
              memberships,
            })
          )
        }

        return token
      },
      session: buildSessionCallback(),
    },
  }
}

export function getNextAuthOptions(): NextAuthOptions {
  const authMode = getAuthMode()

  if (authMode === 'none') {
    return {
      secret: getAuthSecret('none'),
      providers: [],
      session: {
        strategy: 'jwt',
      },
      pages: {
        signIn: '/login',
      },
    }
  }

  if (authMode === 'credentials') {
    return createCredentialsAuthOptions()
  }

  const oidc = resolveOidcRuntimeSettings(getOidcSettings())

  if (!oidc.enabled) {
    throw new Error('AUTH_MODE=oidc requires oidc.enabled: true in settings.yaml.')
  }

  return createOidcAuthOptions(oidc)
}

export async function auth(): Promise<Session | null> {
  if (!isAuthEnabled()) {
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
  if (!isAuthEnabled()) {
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
