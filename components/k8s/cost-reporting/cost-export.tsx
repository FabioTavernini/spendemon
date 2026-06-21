"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PodCostRow } from "@/components/k8s/cost-reporting/pods-table/columns";
import type { CostSettings } from "@/lib/settings";

type CostExportProps = {
  rows: PodCostRow[];
  range: string;
  rates: CostSettings;
  generatedAt: string;
};

// Column order for the CSV — raw numeric values (not locale-formatted) so the
// output stays machine-readable.
const CSV_COLUMNS = [
  ["cluster", (r: PodCostRow) => r.clusterName],
  ["namespace", (r: PodCostRow) => r.namespaceName],
  ["pod", (r: PodCostRow) => r.pod],
  ["status", (r: PodCostRow) => r.status],
  ["estimated", (r: PodCostRow) => (r.isEstimated ? "true" : "false")],
  ["estimatedResources", (r: PodCostRow) => r.estimatedResources.join(";")],
  ["cpuCores", (r: PodCostRow) => r.cpuCores],
  ["memoryGb", (r: PodCostRow) => r.memoryGb],
  ["storageGb", (r: PodCostRow) => r.storageGb],
  ["cpuCost", (r: PodCostRow) => r.cpuCost],
  ["memoryCost", (r: PodCostRow) => r.memoryCost],
  ["storageCost", (r: PodCostRow) => r.storageCost],
  ["totalCost", (r: PodCostRow) => r.totalCost],
] as const;

function escapeCsv(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows: PodCostRow[]): string {
  const header = CSV_COLUMNS.map(([name]) => name).join(",");
  const lines = rows.map((row) =>
    CSV_COLUMNS.map(([, accessor]) => escapeCsv(accessor(row))).join(","),
  );
  return [header, ...lines].join("\n");
}

function toJson(props: CostExportProps): string {
  return JSON.stringify(
    {
      generatedAt: props.generatedAt,
      range: props.range,
      rates: props.rates,
      pods: props.rows,
    },
    null,
    2,
  );
}

function download(filename: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function CostExport(props: Readonly<CostExportProps>) {
  const stamp = new Date().toISOString().slice(0, 10);
  const baseName = `spendemon-cost-${props.range}-${stamp}`;
  const disabled = props.rows.length === 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="gap-2"
          disabled={disabled}
          size="sm"
          type="button"
          variant="outline"
        >
          <Download className="h-4 w-4 shrink-0" />
          <span>Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuItem
          onSelect={() =>
            download(`${baseName}.csv`, "text/csv;charset=utf-8", toCsv(props.rows))
          }
        >
          Download CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            download(
              `${baseName}.json`,
              "application/json",
              toJson(props),
            )
          }
        >
          Download JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
