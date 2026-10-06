import type { CostSettings } from "@/lib/settings-config";

type SettingsViewerProps = {
  initialContent: string;
  initialCosts: CostSettings;
  initialSharedNamespaces: string[];
  initialPath: string;
};

const COST_ROWS: Array<{ key: keyof CostSettings; label: string }> = [
  { key: "cpuCore", label: "Cost per CPU core" },
  { key: "memoryGb", label: "Cost per GB RAM" },
  { key: "storageGb", label: "Cost per GB storage" },
];

export function SettingsViewer({
  initialContent,
  initialCosts,
  initialSharedNamespaces,
  initialPath,
}: Readonly<SettingsViewerProps>) {
  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Read-only view of the configuration loaded by the app. To change it,
          update your Helm values or ConfigMap and roll out the deployment.
        </p>
        <p className="font-mono text-xs text-muted-foreground">{initialPath}</p>
      </div>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-lg font-semibold">Cost Inputs</h2>
        <dl className="mt-4 grid gap-4 md:grid-cols-3">
          {COST_ROWS.map((row) => (
            <div key={row.key}>
              <dt className="text-sm text-muted-foreground">{row.label}</dt>
              <dd className="text-lg font-medium">{initialCosts[row.key]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-lg font-semibold">Shared Namespaces</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Costs of these namespaces are split evenly across the remaining
          namespaces in the same cluster.
        </p>
        {initialSharedNamespaces.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {initialSharedNamespaces.map((namespace) => (
              <li
                className="rounded-md border bg-muted/40 px-2 py-1 font-mono text-xs"
                key={namespace}
              >
                {namespace}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">None configured.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">settings.yaml</h2>
        <pre className="min-h-64 overflow-x-auto rounded-md border border-border bg-background p-4 font-mono text-sm">
          {initialContent}
        </pre>
      </section>

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
