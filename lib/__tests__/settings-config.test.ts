import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  parseClustersFromSettings,
  parseCostsFromSettings,
  parseOidcFromSettings,
  parseSettings,
  parseSharedNamespacesFromSettings,
  upsertCostsInSettings,
  upsertSharedNamespacesInSettings,
} from '../settings-config'

// Minimal valid YAML used as a base across tests.
const MINIMAL = `\
clusters:
  - name: cluster-1
    prometheusUrl: http://localhost:9090
`

afterEach(() => {
  vi.unstubAllEnvs()
})

// ---------------------------------------------------------------------------
// parseClustersFromSettings
// ---------------------------------------------------------------------------

describe('parseClustersFromSettings', () => {
  it('parses a single cluster', () => {
    expect(parseClustersFromSettings(MINIMAL)).toEqual([
      { name: 'cluster-1', prometheusUrl: 'http://localhost:9090' },
    ])
  })

  it('parses multiple clusters', () => {
    const content = `\
clusters:
  - name: prod
    prometheusUrl: http://prod:9090
  - name: staging
    prometheusUrl: http://staging:9090
`
    const result = parseClustersFromSettings(content)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('prod')
    expect(result[1].name).toBe('staging')
  })

  it('throws when the clusters section is absent', () => {
    expect(() => parseClustersFromSettings('costs:\n  cpuCore: 0\n')).toThrow('"clusters:"')
  })

  it('throws when clusters is an empty list', () => {
    expect(() => parseClustersFromSettings('clusters:\n')).toThrow('at least one cluster')
  })

  it('throws when name is missing from a cluster entry', () => {
    const content = `\
clusters:
  - prometheusUrl: http://localhost:9090
`
    expect(() => parseClustersFromSettings(content)).toThrow('"name"')
  })

  it('throws when prometheusUrl is missing from a cluster entry', () => {
    const content = `\
clusters:
  - name: cluster-1
`
    expect(() => parseClustersFromSettings(content)).toThrow('"prometheusUrl"')
  })

  it('resolves env var references in prometheusUrl', () => {
    vi.stubEnv('PROM_URL', 'https://resolved:9090')
    const content = `\
clusters:
  - name: cluster-1
    prometheusUrl: \${PROM_URL}
`
    expect(parseClustersFromSettings(content)).toEqual([
      { name: 'cluster-1', prometheusUrl: 'https://resolved:9090' },
    ])
  })

  it('resolves env var references in name', () => {
    vi.stubEnv('CLUSTER_NAME', 'my-cluster')
    const content = `\
clusters:
  - name: \${CLUSTER_NAME}
    prometheusUrl: http://localhost:9090
`
    expect(parseClustersFromSettings(content)[0].name).toBe('my-cluster')
  })

  it('throws when a referenced env var is not set', () => {
    delete process.env['UNSET_VAR']
    const content = `\
clusters:
  - name: cluster-1
    prometheusUrl: \${UNSET_VAR}
`
    expect(() => parseClustersFromSettings(content)).toThrow('UNSET_VAR')
  })

  it('throws on invalid YAML', () => {
    expect(() => parseClustersFromSettings('clusters: [\n  bad: yaml')).toThrow('Invalid YAML')
  })

  it('throws when prometheusUrl is not a valid URL', () => {
    const content = `\
clusters:
  - name: cluster-1
    prometheusUrl: not-a-url
`
    expect(() => parseClustersFromSettings(content)).toThrow('not a valid URL')
  })

  it('throws when prometheusUrl uses a non-http scheme', () => {
    const content = `\
clusters:
  - name: cluster-1
    prometheusUrl: file:///etc/passwd
`
    expect(() => parseClustersFromSettings(content)).toThrow('http or https')
  })

  it('throws when prometheusUrl uses ftp scheme', () => {
    const content = `\
clusters:
  - name: cluster-1
    prometheusUrl: ftp://prometheus:9090
`
    expect(() => parseClustersFromSettings(content)).toThrow('http or https')
  })
})

// ---------------------------------------------------------------------------
// parseCostsFromSettings
// ---------------------------------------------------------------------------

describe('parseCostsFromSettings', () => {
  it('parses all three cost fields', () => {
    const content = `\
${MINIMAL}
costs:
  cpuCore: 10
  memoryGb: 20
  storageGb: 5
`
    expect(parseCostsFromSettings(content)).toEqual({ cpuCore: 10, memoryGb: 20, storageGb: 5 })
  })

  it('returns zeros when the costs section is absent', () => {
    expect(parseCostsFromSettings(MINIMAL)).toEqual({ cpuCore: 0, memoryGb: 0, storageGb: 0 })
  })

  it('defaults missing individual fields to zero', () => {
    const content = `\
${MINIMAL}
costs:
  cpuCore: 7
`
    const result = parseCostsFromSettings(content)
    expect(result.cpuCore).toBe(7)
    expect(result.memoryGb).toBe(0)
    expect(result.storageGb).toBe(0)
  })

  it('accepts decimal values', () => {
    const content = `\
${MINIMAL}
costs:
  cpuCore: 0.05
  memoryGb: 0.01
  storageGb: 0.005
`
    const result = parseCostsFromSettings(content)
    expect(result.cpuCore).toBeCloseTo(0.05)
    expect(result.memoryGb).toBeCloseTo(0.01)
    expect(result.storageGb).toBeCloseTo(0.005)
  })

  it('throws on a negative cost value', () => {
    const content = `\
${MINIMAL}
costs:
  cpuCore: -1
  memoryGb: 0
  storageGb: 0
`
    expect(() => parseCostsFromSettings(content)).toThrow('non-negative')
  })

  it('throws on a non-numeric cost value', () => {
    const content = `\
${MINIMAL}
costs:
  cpuCore: not-a-number
`
    expect(() => parseCostsFromSettings(content)).toThrow('"cpuCore"')
  })
})

// ---------------------------------------------------------------------------
// parseSharedNamespacesFromSettings
// ---------------------------------------------------------------------------

describe('parseSharedNamespacesFromSettings', () => {
  it('parses a list of namespace names', () => {
    const content = `\
${MINIMAL}
sharednamespaces:
  - kube-system
  - prometheus
`
    expect(parseSharedNamespacesFromSettings(content)).toEqual(['kube-system', 'prometheus'])
  })

  it('returns an empty array when the section is absent', () => {
    expect(parseSharedNamespacesFromSettings(MINIMAL)).toEqual([])
  })

  it('returns an empty array for an empty section', () => {
    const content = `\
${MINIMAL}
sharednamespaces:
`
    expect(parseSharedNamespacesFromSettings(content)).toEqual([])
  })

  it('filters out blank entries', () => {
    const content = `\
${MINIMAL}
sharednamespaces:
  - kube-system
  - '   '
  - prometheus
`
    expect(parseSharedNamespacesFromSettings(content)).toEqual(['kube-system', 'prometheus'])
  })
})

// ---------------------------------------------------------------------------
// parseOidcFromSettings
// ---------------------------------------------------------------------------

describe('parseOidcFromSettings', () => {
  it('returns disabled defaults when the oidc section is absent', () => {
    const result = parseOidcFromSettings(MINIMAL)
    expect(result).toEqual({
      enabled: false,
      issuer: '',
      clientId: '',
      clientSecret: '',
      adminGroup: 'admin',
      viewerGroup: 'viewer',
      debug: false,
      extraScopes: [],
    })
  })

  it('parses a fully configured enabled OIDC block', () => {
    const content = `\
${MINIMAL}
oidc:
  enabled: true
  issuer: https://auth.example.com
  clientId: my-client
  clientSecret: my-secret
  adminGroup: admins
  viewerGroup: viewers
  debug: false
  extraScopes: 'groups'
`
    const result = parseOidcFromSettings(content)
    expect(result.enabled).toBe(true)
    expect(result.issuer).toBe('https://auth.example.com')
    expect(result.clientId).toBe('my-client')
    expect(result.clientSecret).toBe('my-secret')
    expect(result.adminGroup).toBe('admins')
    expect(result.viewerGroup).toBe('viewers')
    expect(result.extraScopes).toEqual(['groups'])
  })

  it('throws when enabled but required fields are missing', () => {
    const content = `\
${MINIMAL}
oidc:
  enabled: true
  issuer: https://auth.example.com
`
    expect(() => parseOidcFromSettings(content)).toThrow('missing')
  })

  it('preserves ${VAR} templates without resolving them', () => {
    const content = `\
${MINIMAL}
oidc:
  enabled: false
  issuer: \${OIDC_ISSUER}
  clientId: \${OIDC_CLIENT_ID}
  clientSecret: \${OIDC_CLIENT_SECRET}
  adminGroup: admin
  viewerGroup: viewer
`
    // env vars are intentionally not set — OIDC fields must not be resolved at parse time
    const result = parseOidcFromSettings(content)
    expect(result.issuer).toBe('${OIDC_ISSUER}')
    expect(result.clientId).toBe('${OIDC_CLIENT_ID}')
    expect(result.clientSecret).toBe('${OIDC_CLIENT_SECRET}')
  })

  it('parses extraScopes from a space/comma-separated string', () => {
    const content = `\
${MINIMAL}
oidc:
  enabled: true
  issuer: https://auth.example.com
  clientId: c
  clientSecret: s
  adminGroup: admin
  viewerGroup: viewer
  extraScopes: 'groups, email profile'
`
    const result = parseOidcFromSettings(content)
    expect(result.extraScopes).toEqual(expect.arrayContaining(['groups', 'email', 'profile']))
    expect(result.extraScopes).toHaveLength(3)
  })

  it('parses extraScopes from a YAML list', () => {
    const content = `\
${MINIMAL}
oidc:
  enabled: true
  issuer: https://auth.example.com
  clientId: c
  clientSecret: s
  adminGroup: admin
  viewerGroup: viewer
  extraScopes:
    - groups
    - email
`
    const result = parseOidcFromSettings(content)
    expect(result.extraScopes).toEqual(expect.arrayContaining(['groups', 'email']))
    expect(result.extraScopes).toHaveLength(2)
  })

  it('deduplicates extraScopes', () => {
    const content = `\
${MINIMAL}
oidc:
  enabled: false
  extraScopes: 'groups groups email'
`
    const { extraScopes } = parseOidcFromSettings(content)
    expect(extraScopes.filter((s) => s === 'groups')).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// parseSettings (integration)
// ---------------------------------------------------------------------------

describe('parseSettings', () => {
  it('assembles all sections into a single result', () => {
    const content = `\
clusters:
  - name: cluster-1
    prometheusUrl: http://localhost:9090

costs:
  cpuCore: 10
  memoryGb: 20
  storageGb: 5

sharednamespaces:
  - kube-system

oidc:
  enabled: false
  issuer: ''
  clientId: ''
  clientSecret: ''
  adminGroup: admin
  viewerGroup: viewer
`
    const result = parseSettings(content)
    expect(result.clusters).toHaveLength(1)
    expect(result.costs.cpuCore).toBe(10)
    expect(result.sharedNamespaces).toEqual(['kube-system'])
    expect(result.oidc.enabled).toBe(false)
    expect(result.branding).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// upsertCostsInSettings
// ---------------------------------------------------------------------------

describe('upsertCostsInSettings', () => {
  const BASE = `\
clusters:
  - name: cluster-1
    prometheusUrl: http://localhost:9090

costs:
  cpuCore: 1
  memoryGb: 2
  storageGb: 3
`
  const NEW_COSTS = { cpuCore: 10, memoryGb: 20, storageGb: 5 }

  it('replaces the costs section with new values', () => {
    const result = upsertCostsInSettings(BASE, NEW_COSTS)
    expect(parseCostsFromSettings(result)).toEqual(NEW_COSTS)
  })

  it('leaves the clusters section intact', () => {
    const result = upsertCostsInSettings(BASE, NEW_COSTS)
    expect(parseClustersFromSettings(result)[0].name).toBe('cluster-1')
  })

  it('appends a costs section when none exists', () => {
    const result = upsertCostsInSettings(MINIMAL, NEW_COSTS)
    expect(parseCostsFromSettings(result)).toEqual(NEW_COSTS)
  })

  it('preserves comments outside the costs section', () => {
    const withComment = `\
# infrastructure cost model
clusters:
  - name: c
    prometheusUrl: http://localhost:9090
costs:
  cpuCore: 1
  memoryGb: 2
  storageGb: 3
`
    const result = upsertCostsInSettings(withComment, NEW_COSTS)
    expect(result).toContain('# infrastructure cost model')
    expect(parseCostsFromSettings(result)).toEqual(NEW_COSTS)
  })

  it('leaves sections after costs intact', () => {
    const content = `\
clusters:
  - name: c
    prometheusUrl: http://localhost:9090
costs:
  cpuCore: 1
  memoryGb: 2
  storageGb: 3
sharednamespaces:
  - kube-system
`
    const result = upsertCostsInSettings(content, NEW_COSTS)
    expect(parseSharedNamespacesFromSettings(result)).toEqual(['kube-system'])
  })
})

// ---------------------------------------------------------------------------
// upsertSharedNamespacesInSettings
// ---------------------------------------------------------------------------

describe('upsertSharedNamespacesInSettings', () => {
  const BASE = `\
clusters:
  - name: cluster-1
    prometheusUrl: http://localhost:9090

sharednamespaces:
  - kube-system
`

  it('replaces the sharednamespaces section', () => {
    const result = upsertSharedNamespacesInSettings(BASE, ['kube-system', 'prometheus'])
    expect(parseSharedNamespacesFromSettings(result)).toEqual(['kube-system', 'prometheus'])
  })

  it('writes an empty section when given an empty list', () => {
    const result = upsertSharedNamespacesInSettings(BASE, [])
    expect(parseSharedNamespacesFromSettings(result)).toEqual([])
  })

  it('appends the section when none exists', () => {
    const result = upsertSharedNamespacesInSettings(MINIMAL, ['prometheus'])
    expect(parseSharedNamespacesFromSettings(result)).toEqual(['prometheus'])
  })

  it('leaves the clusters section intact', () => {
    const result = upsertSharedNamespacesInSettings(BASE, ['kube-system'])
    expect(parseClustersFromSettings(result)[0].name).toBe('cluster-1')
  })
})
