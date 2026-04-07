'use client'

import { startTransition, useState } from 'react'

type SettingsEditorProps = {
  initialContent: string
  initialPath: string
}

export function SettingsEditor({
  initialContent,
  initialPath,
}: SettingsEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function saveSettings() {
    setIsSaving(true)
    setStatus(null)
    setError(null)

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      })

      const payload = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to save settings.')
      }

      startTransition(() => {
        setStatus('Saved settings.yaml successfully.')
      })
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Failed to save settings.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-6 py-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Edit the raw YAML configuration used by the app.
        </p>
        <p className="font-mono text-xs text-muted-foreground">{initialPath}</p>
      </div>

      <textarea
        className="min-h-[28rem] w-full resize-y rounded-md border border-border bg-background p-4 font-mono text-sm outline-none"
        spellCheck={false}
        value={content}
        onChange={(event) => setContent(event.target.value)}
      />

      <div className="flex items-center gap-3">
        <button
          className="rounded-md bg-foreground px-4 py-2 text-sm text-background disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSaving}
          onClick={saveSettings}
          type="button"
        >
          {isSaving ? 'Saving...' : 'Save YAML'}
        </button>

        {status ? <p className="text-sm text-emerald-600">{status}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  )
}
