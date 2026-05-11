import yaml from 'js-yaml'

export type ClusterSettings = {
  name: string
  prometheusUrl: string
}

export type CostSettings = {
  cpuCore: number
  memoryGb: number
  storageGb: number
}

export type BrandingSettings = {
  companyName: string
  logoUrl: string
}

export type ParsedSettings = {
  clusters: ClusterSettings[]
  costs: CostSettings
  sharedNamespaces: string[]
  oidc: OidcSettings
  branding: BrandingSettings | null
}

export type OidcSettings = {
  enabled: boolean
  issuer: string
  clientId: string
  clientSecret: string
  adminGroup: string
  viewerGroup: string
  debug: boolean
  extraScopes: string[]
}

function resolveEnvReferences(value: string): string {
  return value.replace(/\$\{([A-Z0-9_]+)\}/gi, (_match, envKey: string) => {
    const envValue = process.env[envKey]

    if (typeof envValue !== 'string') {
      throw new TypeError(`Environment variable "${envKey}" is not set.`)
    }

    return envValue
  })
}

function parseScopeList(value: unknown): string[] {
  let parts: string[]
  if (Array.isArray(value)) {
    parts = value.filter((v): v is string => typeof v === 'string')
  } else if (typeof value === 'string') {
    parts = value.split(/[,\s]+/)
  } else {
    parts = []
  }

  return Array.from(new Set(parts.map((s) => s.trim()).filter(Boolean)))
}

function parseRawYaml(content: string): Record<string, unknown> {
  let parsed: unknown

  try {
    parsed = yaml.load(content)
  } catch (e) {
    throw new Error(`Invalid YAML: ${e instanceof Error ? e.message : String(e)}`)
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('settings.yaml must be a YAML mapping object.')
  }

  return parsed as Record<string, unknown>
}

function parseNonNegativeNumber(value: unknown, key: string): number {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`"${key}" must be a non-negative number.`)
  }

  return parsed
}

function validatePrometheusUrl(url: string, entryNumber: number): void {
  let parsed: URL

  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`Cluster entry ${entryNumber}: "prometheusUrl" is not a valid URL.`)
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `Cluster entry ${entryNumber}: "prometheusUrl" must use http or https (got "${parsed.protocol}").`,
    )
  }
}

function getIndentation(line: string): number {
  return line.length - line.trimStart().length
}

function findTopLevelSectionIndex(lines: string[], sectionName: string): number {
  return lines.findIndex((line) => line.trim() === `${sectionName}:`)
}

function findTopLevelSectionEndIndex(lines: string[], sectionIndex: number): number {
  let sectionEnd = lines.length

  for (let index = sectionIndex + 1; index < lines.length; index++) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    if (getIndentation(line) === 0) {
      sectionEnd = index
      break
    }
  }

  return sectionEnd
}

export function parseClustersFromSettings(content: string): ClusterSettings[] {
  const raw = parseRawYaml(content)

  if (!('clusters' in raw)) {
    throw new Error('Expected a top-level "clusters:" section in settings.yaml.')
  }

  const list = raw.clusters

  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('settings.yaml must define at least one cluster.')
  }

  return list.map((entry, i) => {
    if (typeof entry !== 'object' || entry === null) {
      throw new Error(`Cluster entry ${i + 1} must be an object.`)
    }

    const cluster = entry as Record<string, unknown>

    if (typeof cluster.name !== 'string' || !cluster.name.trim()) {
      throw new Error(`Cluster entry ${i + 1} must include "name".`)
    }

    if (typeof cluster.prometheusUrl !== 'string' || !cluster.prometheusUrl.trim()) {
      throw new Error(`Cluster entry ${i + 1} must include "prometheusUrl".`)
    }

    const resolved = {
      name: resolveEnvReferences(cluster.name),
      prometheusUrl: resolveEnvReferences(cluster.prometheusUrl),
    }

    validatePrometheusUrl(resolved.prometheusUrl, i + 1)

    return resolved
  })
}

export function parseCostsFromSettings(content: string): CostSettings {
  const raw = parseRawYaml(content)

  if (!('costs' in raw)) {
    return { cpuCore: 0, memoryGb: 0, storageGb: 0 }
  }

  const costs = (raw.costs ?? {}) as Record<string, unknown>

  return {
    cpuCore: parseNonNegativeNumber(costs.cpuCore ?? 0, 'cpuCore'),
    memoryGb: parseNonNegativeNumber(costs.memoryGb ?? 0, 'memoryGb'),
    storageGb: parseNonNegativeNumber(costs.storageGb ?? 0, 'storageGb'),
  }
}

export function parseSharedNamespacesFromSettings(content: string): string[] {
  const raw = parseRawYaml(content)

  if (!('sharednamespaces' in raw)) {
    return []
  }

  const list = raw.sharednamespaces

  if (!Array.isArray(list)) {
    return []
  }

  return list
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function parseOidcFromSettings(content: string): OidcSettings {
  const raw = parseRawYaml(content)

  if (!('oidc' in raw)) {
    return {
      enabled: false,
      issuer: '',
      clientId: '',
      clientSecret: '',
      adminGroup: 'admin',
      viewerGroup: 'viewer',
      debug: false,
      extraScopes: [],
    }
  }

  const oidc = (raw.oidc ?? {}) as Record<string, unknown>

  const enabled = Boolean(oidc.enabled)
  const issuer = String(oidc.issuer ?? '')
  const clientId = String(oidc.clientId ?? '')
  const clientSecret = String(oidc.clientSecret ?? '')
  const adminGroup = String(oidc.adminGroup ?? 'admin')
  const viewerGroup = String(oidc.viewerGroup ?? 'viewer')
  const debug = Boolean(oidc.debug)
  const extraScopes = parseScopeList(oidc.extraScopes)

  const result: OidcSettings = {
    enabled,
    issuer,
    clientId,
    clientSecret,
    adminGroup,
    viewerGroup,
    debug,
    extraScopes,
  }

  if (enabled) {
    const missing = [
      !issuer && 'issuer',
      !clientId && 'clientId',
      !clientSecret && 'clientSecret',
      !adminGroup && 'adminGroup',
      !viewerGroup && 'viewerGroup',
    ].filter(Boolean)

    if (missing.length > 0) {
      throw new Error(`OIDC is enabled but these settings are missing: ${missing.join(', ')}.`)
    }
  }

  return result
}

export function parseBrandingFromSettings(content: string): BrandingSettings | null {
  const raw = parseRawYaml(content)

  if (!('branding' in raw) || raw.branding === null || typeof raw.branding !== 'object') {
    return null
  }

  const branding = raw.branding as Record<string, unknown>
  const companyName = typeof branding.companyName === 'string' ? branding.companyName.trim() : ''
  const logoUrl = typeof branding.logoUrl === 'string' ? branding.logoUrl.trim() : ''

  if (!companyName) return null

  return { companyName, logoUrl }
}

export function parseSettings(content: string): ParsedSettings {
  return {
    clusters: parseClustersFromSettings(content),
    costs: parseCostsFromSettings(content),
    sharedNamespaces: parseSharedNamespacesFromSettings(content),
    oidc: parseOidcFromSettings(content),
    branding: parseBrandingFromSettings(content),
  }
}

function stringifyCostsSection(costs: CostSettings): string {
  return yaml.dump({ costs })
}

function stringifySharedNamespacesSection(sharedNamespaces: string[]): string {
  if (sharedNamespaces.length === 0) {
    return 'sharednamespaces:\n'
  }

  return yaml.dump({ sharednamespaces: sharedNamespaces })
}

export function upsertCostsInSettings(content: string, costs: CostSettings): string {
  parseClustersFromSettings(content)

  const normalizedContent = content.replace(/\r\n/g, '\n')
  const lines = normalizedContent.split('\n')
  const costsIndex = findTopLevelSectionIndex(lines, 'costs')
  const costLines = stringifyCostsSection(costs).trimEnd().split('\n')

  if (costsIndex === -1) {
    const trimmed = normalizedContent.trimEnd()
    return trimmed ? `${trimmed}\n\n${stringifyCostsSection(costs)}` : stringifyCostsSection(costs)
  }

  const updatedLines = [
    ...lines.slice(0, costsIndex),
    ...costLines,
    ...lines.slice(findTopLevelSectionEndIndex(lines, costsIndex)),
  ]

  return `${updatedLines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`
}

export function upsertSharedNamespacesInSettings(
  content: string,
  sharedNamespaces: string[],
): string {
  parseClustersFromSettings(content)

  const normalizedContent = content.replace(/\r\n/g, '\n')
  const lines = normalizedContent.split('\n')
  const sectionIndex = findTopLevelSectionIndex(lines, 'sharednamespaces')
  const sectionLines = stringifySharedNamespacesSection(sharedNamespaces).trimEnd().split('\n')

  if (sectionIndex === -1) {
    const trimmed = normalizedContent.trimEnd()
    return trimmed
      ? `${trimmed}\n\n${stringifySharedNamespacesSection(sharedNamespaces)}`
      : stringifySharedNamespacesSection(sharedNamespaces)
  }

  const updatedLines = [
    ...lines.slice(0, sectionIndex),
    ...sectionLines,
    ...lines.slice(findTopLevelSectionEndIndex(lines, sectionIndex)),
  ]

  return `${updatedLines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`
}
