export type Cluster = {
  name: string
  prometheusUrl: string
}

import { parseClustersFromSettings, readSettingsFile } from '@/lib/settings'

export async function getClusters(): Promise<Cluster[]> {
  const content = await readSettingsFile()
  return parseClustersFromSettings(content)
}
