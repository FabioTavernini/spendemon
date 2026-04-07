import { access, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export type ClusterSettings = {
  name: string
  prometheusUrl: string
}

const SETTINGS_FILE = path.join(process.cwd(), 'settings.yaml')
const DEFAULT_SETTINGS = `clusters:
  - name: cluster-1
    prometheusUrl: http://localhost:9090
  - name: cluster-2
    prometheusUrl: http://localhost:9090
`

type ParsedProperty = {
  key: string
  value: string
}

function isClusterKey(key: string): key is keyof ClusterSettings {
  return key === 'name' || key === 'prometheusUrl'
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

export function parseClustersFromSettings(content: string): ClusterSettings[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const clustersIndex = lines.findIndex((line) => line.trim() === 'clusters:')

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

export async function ensureSettingsFile(): Promise<void> {
  try {
    await access(SETTINGS_FILE)
  } catch {
    await writeFile(SETTINGS_FILE, DEFAULT_SETTINGS, 'utf8')
  }
}

export async function readSettingsFile(): Promise<string> {
  await ensureSettingsFile()
  return readFile(SETTINGS_FILE, 'utf8')
}

export async function writeSettingsFile(content: string): Promise<void> {
  parseClustersFromSettings(content)
  await writeFile(SETTINGS_FILE, content, 'utf8')
}

export function getSettingsFilePath(): string {
  return SETTINGS_FILE
}
