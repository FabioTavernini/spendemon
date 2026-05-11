"use client";

import { startTransition, useCallback, useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  parseCostsFromSettings,
  parseSharedNamespacesFromSettings,
  type CostSettings,
  upsertCostsInSettings,
  upsertSharedNamespacesInSettings,
} from "@/lib/settings-config";

type SettingsEditorProps = {
  initialContent: string;
  initialCosts: CostSettings;
  initialSharedNamespaces: string[];
  initialPath: string;
};

type CostField = keyof CostSettings;

const COST_FIELDS: Array<{
  key: CostField;
  label: string;
  description: string;
  step: string;
}> = [
  {
    key: "cpuCore",
    label: "Cost per CPU core",
    description: "Used against requested CPU cores per pod.",
    step: "0.01",
  },
  {
    key: "memoryGb",
    label: "Cost per GB RAM",
    description: "Used against requested memory converted to GB.",
    step: "0.01",
  },
  {
    key: "storageGb",
    label: "Cost per GB storage",
    description: "Used against requested ephemeral storage converted to GB.",
    step: "0.01",
  },
];

export function SettingsEditor({
  initialContent,
  initialCosts,
  initialSharedNamespaces,
  initialPath,
}: Readonly<SettingsEditorProps>) {
  const [content, setContent] = useState(initialContent);
  const [costs, setCosts] = useState<CostSettings>(initialCosts);
  const [sharedNamespacesInput, setSharedNamespacesInput] = useState(
    initialSharedNamespaces.join("\n"),
  );
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function updateCostField(field: CostField, value: string) {
    const nextValue = value === "" ? 0 : Number(value);

    if (!Number.isFinite(nextValue) || nextValue < 0) {
      return;
    }

    const nextCosts = {
      ...costs,
      [field]: nextValue,
    };

    setCosts(nextCosts);
    setContent((currentContent) =>
      upsertCostsInSettings(currentContent, nextCosts),
    );
    setStatus(null);
    setError(null);
  }

  function updateSharedNamespaces(value: string) {
    setSharedNamespacesInput(value);

    const nextSharedNamespaces = value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    setContent((currentContent) =>
      upsertSharedNamespacesInSettings(currentContent, nextSharedNamespaces),
    );
    setStatus(null);
    setError(null);
  }

  const saveSettings = useCallback(async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setStatus(null);
    setError(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save settings.");
      }

      startTransition(() => {
        setStatus("Saved settings.yaml successfully.");
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save settings.",
      );
    } finally {
      setIsSaving(false);
    }
  }, [content, isSaving]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === "s" &&
        (event.metaKey || event.ctrlKey) &&
        !event.altKey
      ) {
        event.preventDefault();
        void saveSettings();
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [saveSettings]);

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure pricing inputs and edit the raw YAML used by the app.
        </p>
        <p className="text-sm text-muted-foreground">
          The optional <code>oidc:</code> block lets you enable or disable OIDC
          authorization for the app.
        </p>
        <p className="text-sm text-muted-foreground">
          Namespaces listed in <code>sharednamespaces:</code> have their costs
          split evenly across the remaining namespaces in the same cluster.
        </p>
        <p className="font-mono text-xs text-muted-foreground">{initialPath}</p>
      </div>

      <section className="rounded-xl border bg-card p-5">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Cost Inputs</h2>
          <p className="text-sm text-muted-foreground">
            These values are written into the top-level <code>costs:</code>{" "}
            block in <code>settings.yaml</code>.
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
                onChange={(event) =>
                  updateCostField(field.key, event.target.value)
                }
              />
              <span className="block text-xs text-muted-foreground">
                {field.description}
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Shared Namespaces</h2>
          <p className="text-sm text-muted-foreground">
            Enter one namespace name per line. Matching namespaces are treated
            as shared overhead and redistributed evenly to the other namespaces
            in the same cluster.
          </p>
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs font-medium text-foreground">
              Syntax reference
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Type plain namespace names here, one per line.
            </p>
            <pre className="mt-2 overflow-x-auto rounded-md bg-background p-3 font-mono text-xs text-foreground">
              {`kube-system
prometheus
kube-public
`}
            </pre>
          </div>
        </div>

        <textarea
          className="mt-4 min-h-40 w-full resize-y rounded-md border border-border bg-background p-4 font-mono text-sm outline-none"
          placeholder={`kube-system\ntest`}
          spellCheck={false}
          value={sharedNamespacesInput}
          onChange={(event) => updateSharedNamespaces(event.target.value)}
        />
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Raw YAML</h2>
          <p className="text-sm text-muted-foreground">
            Manual edits are still supported. When the YAML remains valid, the
            structured fields above will refresh automatically.
          </p>
        </div>

        <textarea
          className="min-h-112 w-full resize-y rounded-md border border-border bg-background p-4 font-mono text-sm outline-none"
          spellCheck={false}
          value={content}
          onChange={(event) => {
            const nextContent = event.target.value;

            setContent(nextContent);
            setStatus(null);
            setError(null);

            try {
              setCosts(parseCostsFromSettings(nextContent));

              const nextSharedNamespaces =
                parseSharedNamespacesFromSettings(nextContent);

              setSharedNamespacesInput(nextSharedNamespaces.join("\n"));
            } catch {
              // Ignore invalid intermediate YAML while the user is typing.
            }
          }}
        />
      </section>

      <div className="flex items-center gap-3">
        <button
          className="rounded-md bg-foreground px-4 py-2 text-sm text-background disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSaving}
          onClick={saveSettings}
          title="Save settings (Ctrl+S / Cmd+S)"
          type="button"
        >
          {isSaving ? "Saving..." : "Save Settings"}
        </button>

        {status ? <p className="text-sm text-emerald-600">{status}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>

      <p className="text-xs text-muted-foreground">
        Spendemon is free for personal and non-commercial use.{" "}
        <a
          className="underline underline-offset-2"
          href="https://spendemon.com/contact"
          rel="noopener noreferrer"
          target="_blank"
        >
          Commercial use requires a license.
        </a>
      </p>
    </div>
  );
}
