export type ClusterSettings = {
  name: string
  prometheusUrl: string
}

export type CostSettings = {
  cpuCore: number
  memoryGb: number
  storageGb: number
}

export type ParsedSettings = {
  clusters: ClusterSettings[]
  costs: CostSettings
  oidc: OidcSettings
}

export type OidcSettings = {
  enabled: boolean
  issuer: string
  clientId: string
  clientSecret: string
  adminGroup: string
  viewerGroup: string
}

type ParsedProperty = {
  key: string
  value: string
}

function isClusterKey(key: string): key is keyof ClusterSettings {
  return key === 'name' || key === 'prometheusUrl'
}

function isCostKey(key: string): key is keyof CostSettings {
  return key === 'cpuCore' || key === 'memoryGb' || key === 'storageGb'
}

function isOidcKey(key: string): key is keyof OidcSettings {
  return (
    key === 'enabled' ||
    key === 'issuer' ||
    key === 'clientId' ||
    key === 'clientSecret' ||
    key === 'adminGroup' ||
    key === 'viewerGroup'
  )
}

function normalizeScalar(value: string): string {
  const trimmed = value.trim()

  if (!trimmed) {
    return ''
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }

  return trimmed
}

function getIndentation(line: string): number {
  return line.length - line.trimStart().length
}

function parseProperty(text: string): ParsedProperty | null {
  const separatorIndex = text.indexOf(':')

  if (separatorIndex === -1) {
    return null
  }

  const key = text.slice(0, separatorIndex).trim()
  const value = text.slice(separatorIndex + 1).trim()

  if (!key) {
    return null
  }

  return {
    key,
    value: normalizeScalar(value),
  }
}

function findTopLevelSectionIndex(lines: string[], sectionName: string): number {
  return lines.findIndex((line) => line.trim() === `${sectionName}:`)
}

function parseNonNegativeNumber(value: string, key: string): number {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`"${key}" must be a non-negative number.`)
  }

  return parsed
}

function parseBoolean(value: string, key: string): boolean {
  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  throw new Error(`"${key}" must be either true or false.`)
}

export function parseClustersFromSettings(content: string): ClusterSettings[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const clustersIndex = findTopLevelSectionIndex(lines, 'clusters')

  if (clustersIndex === -1) {
    throw new Error('Expected a top-level "clusters:" section in settings.yaml.')
  }

  const clustersIndent = getIndentation(lines[clustersIndex])
  const clusters: ClusterSettings[] = []
  let currentCluster: Partial<ClusterSettings> | null = null
  let currentItemIndent: number | null = null

  for (let index = clustersIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const indentation = getIndentation(line)

    if (indentation <= clustersIndent && !trimmed.startsWith('- ')) {
      break
    }

    const itemMatch = line.match(/^(\s*)-\s*(.*)$/)

    if (itemMatch) {
      if (currentCluster) {
        if (!currentCluster.name || !currentCluster.prometheusUrl) {
          throw new Error(
            `Cluster entry ${clusters.length + 1} must include "name" and "prometheusUrl".`
          )
        }

        clusters.push(currentCluster as ClusterSettings)
      }

      currentItemIndent = itemMatch[1].length
      currentCluster = {}

      if (currentItemIndent <= clustersIndent) {
        throw new Error('Cluster list items must be indented under "clusters:".')
      }

      if (itemMatch[2].trim()) {
        const property = parseProperty(itemMatch[2].trim())

        if (!property) {
          throw new Error(`Invalid cluster property on line ${index + 1}.`)
        }

        if (!isClusterKey(property.key)) {
          throw new Error(`Unknown cluster property "${property.key}" on line ${index + 1}.`)
        }

        currentCluster[property.key] = property.value
      }

      continue
    }

    if (!currentCluster || currentItemIndent === null) {
      throw new Error(`Unexpected content in clusters section on line ${index + 1}.`)
    }

    if (indentation <= currentItemIndent) {
      throw new Error(`Invalid indentation for cluster entry on line ${index + 1}.`)
    }

    const property = parseProperty(trimmed)

    if (!property) {
      throw new Error(`Invalid cluster property on line ${index + 1}.`)
    }

    if (!isClusterKey(property.key)) {
      throw new Error(`Unknown cluster property "${property.key}" on line ${index + 1}.`)
    }

    currentCluster[property.key] = property.value
  }

  if (currentCluster) {
    if (!currentCluster.name || !currentCluster.prometheusUrl) {
      throw new Error(
        `Cluster entry ${clusters.length + 1} must include "name" and "prometheusUrl".`
      )
    }

    clusters.push(currentCluster as ClusterSettings)
  }

  if (clusters.length === 0) {
    throw new Error('settings.yaml must define at least one cluster.')
  }

  return clusters
}

export function parseCostsFromSettings(content: string): CostSettings {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const costsIndex = findTopLevelSectionIndex(lines, 'costs')

  if (costsIndex === -1) {
    return {
      cpuCore: 0,
      memoryGb: 0,
      storageGb: 0,
    }
  }

  const costsIndent = getIndentation(lines[costsIndex])
  const parsedCosts: Partial<CostSettings> = {}

  for (let index = costsIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const indentation = getIndentation(line)

    if (indentation <= costsIndent) {
      break
    }

    const property = parseProperty(trimmed)

    if (!property) {
      throw new Error(`Invalid cost property on line ${index + 1}.`)
    }

    if (!isCostKey(property.key)) {
      throw new Error(`Unknown cost property "${property.key}" on line ${index + 1}.`)
    }

    parsedCosts[property.key] = parseNonNegativeNumber(property.value, property.key)
  }

  return {
    cpuCore: parsedCosts.cpuCore ?? 0,
    memoryGb: parsedCosts.memoryGb ?? 0,
    storageGb: parsedCosts.storageGb ?? 0,
  }
}

export function parseSettings(content: string): ParsedSettings {
  return {
    clusters: parseClustersFromSettings(content),
    costs: parseCostsFromSettings(content),
    oidc: parseOidcFromSettings(content),
  }
}

export function parseOidcFromSettings(content: string): OidcSettings {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const oidcIndex = findTopLevelSectionIndex(lines, 'oidc')

  if (oidcIndex === -1) {
    return {
      enabled: false,
      issuer: '',
      clientId: '',
      clientSecret: '',
      adminGroup: 'admin',
      viewerGroup: 'viewer',
    }
  }

  const oidcIndent = getIndentation(lines[oidcIndex])
  const parsedOidc: Partial<OidcSettings> = {}

  for (let index = oidcIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const indentation = getIndentation(line)

    if (indentation <= oidcIndent) {
      break
    }

    const property = parseProperty(trimmed)

    if (!property) {
      throw new Error(`Invalid OIDC property on line ${index + 1}.`)
    }

    if (!isOidcKey(property.key)) {
      throw new Error(`Unknown OIDC property "${property.key}" on line ${index + 1}.`)
    }

    if (property.key === 'enabled') {
      parsedOidc.enabled = parseBoolean(property.value, property.key)
      continue
    }

    parsedOidc[property.key] = property.value
  }

  const oidc = {
    enabled: parsedOidc.enabled ?? false,
    issuer: parsedOidc.issuer ?? '',
    clientId: parsedOidc.clientId ?? '',
    clientSecret: parsedOidc.clientSecret ?? '',
    adminGroup: parsedOidc.adminGroup ?? 'admin',
    viewerGroup: parsedOidc.viewerGroup ?? 'viewer',
  }

  if (oidc.enabled) {
    const missing = [
      !oidc.issuer && 'issuer',
      !oidc.clientId && 'clientId',
      !oidc.clientSecret && 'clientSecret',
      !oidc.adminGroup && 'adminGroup',
      !oidc.viewerGroup && 'viewerGroup',
    ].filter(Boolean)

    if (missing.length > 0) {
      throw new Error(
        `OIDC is enabled but these settings are missing: ${missing.join(', ')}.`
      )
    }
  }

  return oidc
}

export function stringifyCostsSection(costs: CostSettings): string {
  return `costs:
  cpuCore: ${costs.cpuCore}
  memoryGb: ${costs.memoryGb}
  storageGb: ${costs.storageGb}
`
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

  let sectionEnd = lines.length

  for (let index = costsIndex + 1; index < lines.length; index += 1) {
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

  const updatedLines = [
    ...lines.slice(0, costsIndex),
    ...costLines,
    ...lines.slice(sectionEnd),
  ]

  return `${updatedLines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`
}
