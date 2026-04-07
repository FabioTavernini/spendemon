import { access, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { parseSettings } from '@/lib/settings-config'

export * from '@/lib/settings-config'

const SETTINGS_FILE = path.join(process.cwd(), 'settings.yaml')
const DEFAULT_SETTINGS = `clusters:
  - name: cluster-1
    prometheusUrl: http://localhost:9090
  - name: cluster-2
    prometheusUrl: http://localhost:9090

costs:
  cpuCore: 0
  memoryGb: 0
  storageGb: 0
`

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
  parseSettings(content)
  await writeFile(SETTINGS_FILE, content, 'utf8')
}

export function getSettingsFilePath(): string {
  return SETTINGS_FILE
}
