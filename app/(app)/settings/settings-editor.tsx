'use client'

import { startTransition, useEffect, useState } from 'react'

import { Input } from '@/components/ui/input'
import {
  parseCostsFromSettings,
  type CostSettings,
  upsertCostsInSettings,
} from '@/lib/settings-config'

type SettingsEditorProps = {
  initialContent: string
  initialCosts: CostSettings
  initialPath: string
}

type CostField = keyof CostSettings

const COST_FIELDS: Array<{
  key: CostField
  label: string
  description: string
  step: string
}> = [
  {
    key: 'cpuCore',
    label: 'Cost per CPU core',
    description: 'Used against requested CPU cores per pod.',
    step: '0.01',
  },
  {
    key: 'memoryGb',
    label: 'Cost per GB RAM',
    description: 'Used against requested memory converted to GB.',
    step: '0.01',
  },
  {
    key: 'storageGb',
    label: 'Cost per GB storage',
    description: 'Used against requested ephemeral storage converted to GB.',
    step: '0.01',
  },
]

export function SettingsEditor({
  initialContent,
  initialCosts,
  initialPath,
}: SettingsEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [costs, setCosts] = useState<CostSettings>(initialCosts)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    try {
      setCosts(parseCostsFromSettings(content))
    } catch {
      // Ignore invalid intermediate YAML while the user is typing.
    }
  }, [content])

  function updateCostField(field: CostField, value: string) {
    const nextValue = value === '' ? 0 : Number(value)

    if (!Number.isFinite(nextValue) || nextValue < 0) {
      return
    }

    const nextCosts = {
      ...costs,
      [field]: nextValue,
    }

    setCosts(nextCosts)
    setContent((currentContent) => upsertCostsInSettings(currentContent, nextCosts))
    setStatus(null)
    setError(null)
  }

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
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure pricing inputs and edit the raw YAML used by the app.
        </p>
        <p className="text-sm text-muted-foreground">
          The optional <code>oidc:</code> block lets you enable or disable OIDC
          authorization for the app.
        </p>
        <p className="font-mono text-xs text-muted-foreground">{initialPath}</p>
      </div>

      <section className="rounded-xl border bg-card p-5">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Cost Inputs</h2>
          <p className="text-sm text-muted-foreground">
            These values are written into the top-level <code>costs:</code> block in
            <code> settings.yaml</code>.
          </p>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {COST_FIELDS.map((field) => (
            <label className="space-y-2" key={field.key}>
              <span className="block text-sm font-medium">{field.label}</span>
              <Input
                min="0"
                step={field.step}
                type="number"
                value={costs[field.key]}
                onChange={(event) => updateCostField(field.key, event.target.value)}
              />
              <span className="block text-xs text-muted-foreground">
                {field.description}
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Raw YAML</h2>
          <p className="text-sm text-muted-foreground">
            Manual edits are still supported. When the YAML remains valid, the pricing
            fields above will refresh automatically.
          </p>
        </div>

        <textarea
          className="min-h-[28rem] w-full resize-y rounded-md border border-border bg-background p-4 font-mono text-sm outline-none"
          spellCheck={false}
          value={content}
          onChange={(event) => {
            setContent(event.target.value)
            setStatus(null)
            setError(null)
          }}
        />
      </section>

      <div className="flex items-center gap-3">
        <button
          className="rounded-md bg-foreground px-4 py-2 text-sm text-background disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSaving}
          onClick={saveSettings}
          type="button"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>

        {status ? <p className="text-sm text-emerald-600">{status}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  )
}
