# Spendemon

Spendemon is a small Next.js dashboard for exploring Kubernetes footprint and estimating workload cost from Prometheus metrics.

It connects to one or more Prometheus endpoints, discovers clusters, namespaces, and pods, then layers in simple pricing inputs so you can get a fast cost snapshot by cluster, namespace, and pod.

## What It Does

- Shows an overview of connected clusters, namespaces, and pod counts
- Lets you filter data by cluster and namespace from the sidebar
- Builds cost estimates from requested CPU, memory, and ephemeral storage
- Breaks cost reporting down by cluster, namespace, and individual pod
- Stores app configuration in a local `settings.yaml` file
- Includes a settings screen for editing pricing and raw YAML in the browser

## Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui-style components
- Prometheus HTTP API as the data source

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- One or more reachable Prometheus endpoints exposing Kubernetes metrics

### Install

```bash
npm install
```

### Run the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Configuration

Spendemon reads configuration from `settings.yaml` in the project root.

If the file does not exist yet, the app creates it automatically with starter values the first time settings are read.

Example:

```yaml
clusters:
  - name: prod-eu
    prometheusUrl: http://prometheus-prod-eu:9090
  - name: staging-us
    prometheusUrl: http://prometheus-staging-us:9090

costs:
  cpuCore: 12.5
  memoryGb: 1.8
  storageGb: 0.12
```

### Settings fields

- `clusters[].name`: Display name used throughout the UI
- `clusters[].prometheusUrl`: Base URL for that cluster's Prometheus instance
- `costs.cpuCore`: Price applied to requested CPU cores
- `costs.memoryGb`: Price applied to requested memory in GB
- `costs.storageGb`: Price applied to requested ephemeral storage in GB

You can edit these values either:

- In the UI at `/settings`
- Directly in `settings.yaml`

## Prometheus Metrics Used

Spendemon currently builds its views from standard Kubernetes metrics exposed to Prometheus, including:

- `kube_namespace_created`
- `kube_pod_status_phase`
- `kube_pod_container_resource_requests{resource="cpu",unit="core"}`
- `kube_pod_container_resource_requests{resource="memory",unit="byte"}`
- Ephemeral storage request metrics, with a few query fallbacks

If a cluster cannot be queried, the app logs the error and continues rendering what it can from the remaining clusters.

## App Routes

- `/`: Overview dashboard with summary cards, namespaces, and pods
- `/costreporting`: Estimated cost rollups and per-pod cost table
- `/settings`: Pricing inputs and raw YAML editor

## API Routes

- `/api/clusters`: Returns configured clusters
- `/api/namespaces`: Returns discovered namespaces, optionally filtered
- `/api/pods`: Returns discovered pods, optionally filtered
- `/api/settings`: Reads and updates `settings.yaml`

## Environment Notes

- The dashboard cards fetch internal API routes using `BASE_URL` when it is set
- For local development, the app falls back to `http://localhost:3000`
- Server-rendered pages are configured as dynamic so they always fetch fresh data

## Project Structure

```text
app/
  api/                 Next.js route handlers
  costreporting/       Cost reporting page
  settings/            Settings UI and editor
components/
  k8s/                 Kubernetes-specific tables and reporting UI
  layout/              Sidebar and shared layout pieces
lib/
  clusters.ts          Cluster loading from settings
  cost-reporting.ts    Prometheus queries and cost aggregation
  settings.ts          settings.yaml file IO
  settings-config.ts   YAML parsing and update helpers
dev/
  *.yaml               Local manifests and test fixtures
```

## Current Assumptions

- Cost estimates are based on requested resources, not real billing data
- Pricing is a simple flat-rate model for CPU, memory, and storage
- Each cluster is represented by a Prometheus base URL in `settings.yaml`
- The app expects Kubernetes metrics to already be available in Prometheus

## Development

Want to develop the app further, just apply the manifests under `dev/manifests.yaml` in a minikube cluster (or other options).

Then run `npm i` and then `npm run dev` to start the development server.
If you want to simulate a failing or pending pod, just apply `dev/failing-pod.yaml` or `dev/pending-pod.yaml`


## License

[GNU Affero General Public License](./LICENSE)
