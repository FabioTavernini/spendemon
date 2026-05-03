"use client"

import * as React from "react"
import Modal from "react-modal"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { X } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import type { PodCostRow } from "@/components/k8s/cost-reporting/pods-table/columns"
import type { PodHistoryPoint } from "@/app/api/pod-history/route"

if (typeof window !== "undefined") {
  Modal.setAppElement("body")
}

const chartConfig = {
  cpuCores: {
    label: "CPU Cores",
    color: "var(--chart-1)",
  },
  memoryGb: {
    label: "RAM GB",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

type ActiveMetric = "cpuCores" | "memoryGb"

function formatValue(value: number, metric: ActiveMetric) {
  if (metric === "memoryGb") {
    return (
      value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " GB"
    )
  }
  return (
    value.toLocaleString(undefined, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }) + " cores"
  )
}

function PodHistoryChart({ pod }: { pod: PodCostRow }) {
  const [activeMetric, setActiveMetric] = React.useState<ActiveMetric>("cpuCores")
  const [history, setHistory] = React.useState<PodHistoryPoint[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({
      cluster: pod.clusterName,
      namespace: pod.namespaceName,
      pod: pod.pod,
    })

    fetch(`/api/pod-history?${params.toString()}`)
      .then((res) => res.json())
      .then((data: { history?: PodHistoryPoint[]; error?: string }) => {
        if (data.error) {
          setError(data.error)
        } else {
          setHistory(data.history ?? [])
        }
      })
      .catch(() => setError("Failed to fetch pod history"))
      .finally(() => setLoading(false))
  }, [pod.clusterName, pod.namespaceName, pod.pod])

  const totals = React.useMemo(
    () => ({
      cpuCores:
        history.reduce((acc, p) => acc + (p.cpuCores ?? 0), 0) /
        Math.max(history.length, 1),
      memoryGb:
        history.reduce((acc, p) => acc + (p.memoryGb ?? 0), 0) /
        Math.max(history.length, 1),
    }),
    [history],
  )

  return (
    <Card className="border-0 shadow-none py-4 sm:py-0">
      <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pb-3 sm:pb-0">
          <CardTitle>Resource History</CardTitle>
          <CardDescription>Last 24 hours — 5-minute intervals</CardDescription>
        </div>
        <div className="flex">
          {(["cpuCores", "memoryGb"] as ActiveMetric[]).map((key) => (
            <button
              key={key}
              data-active={activeMetric === key}
              className="hover:cursor-pointer flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
              onClick={() => setActiveMetric(key)}
            >
              <span className="text-xs text-muted-foreground">
                {chartConfig[key].label}
              </span>
              <span className="text-lg leading-none font-bold sm:text-2xl">
                {formatValue(totals[key], key)}
              </span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        {loading && (
          <div className="flex h-62.5 items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        )}
        {!loading && error && (
          <div className="flex h-62.5 items-center justify-center text-sm text-destructive">
            {error}
          </div>
        )}
        {!loading && !error && history.length === 0 && (
          <div className="flex h-62.5 items-center justify-center text-sm text-muted-foreground">
            No data available
          </div>
        )}
        {!loading && !error && history.length > 0 && (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-62.5 w-full"
          >
            <LineChart
              accessibilityLayer
              data={history}
              margin={{ left: 12, right: 12 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={48}
                tickFormatter={(value: number) =>
                  new Date(value).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })
                }
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={60}
                tickFormatter={(value: number) =>
                  activeMetric === "memoryGb"
                    ? value.toFixed(2)
                    : value.toFixed(4)
                }
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="w-45"
                    nameKey={activeMetric}
                    labelFormatter={(_value, payload) =>
                      new Date(Number(payload?.[0]?.payload?.timestamp)).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    }
                  />
                }
              />
              <Line
                dataKey={activeMetric}
                type="monotone"
                stroke={`var(--color-${activeMetric})`}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

export function PodHistoryDialog({
  pod,
  children,
}: {
  pod: PodCostRow
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <span
        onClick={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpen(true) }}
        role="button"
        tabIndex={0}
        className="contents"
      >
        {children}
      </span>
      <Modal
        isOpen={open}
        onRequestClose={() => setOpen(false)}
        overlayClassName="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        className="relative bg-background text-foreground rounded-xl shadow-xl w-full max-w-3xl outline-none p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold truncate">{pod.pod}</h2>
            <p className="text-sm text-muted-foreground">
              {pod.clusterName} / {pod.namespaceName}
            </p>
          </div>
          <Button
            variant="ghost"
            size="lg"
            className="shrink-0"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {open && <PodHistoryChart pod={pod} />}
      </Modal>
    </>
  )
}
