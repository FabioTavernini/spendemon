import { getSettingsFilePath, readSettingsFile } from '@/lib/settings'

import { SettingsEditor } from './settings-editor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const initialContent = await readSettingsFile()
  const initialPath = getSettingsFilePath()

  return (
    <SettingsEditor
      initialContent={initialContent}
      initialPath={initialPath}
    />
  )
}
