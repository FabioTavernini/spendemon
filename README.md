

[![SonarQube Cloud](https://sonarcloud.io/images/project_badges/sonarcloud-light.svg)](https://sonarcloud.io/summary/new_code?id=FabioTavernini_spendemon)

[![Netlify Status](https://api.netlify.com/api/v1/badges/c717f0fe-3d28-49c9-aeca-bbfaa3aaee15/deploy-status)](https://app.netlify.com/projects/spendemon/deploys)


[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=FabioTavernini_spendemon&metric=alert_status&token=3c79d836826de6f39f0a1d39cf02550fe96414f4)](https://sonarcloud.io/summary/new_code?id=FabioTavernini_spendemon)

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=FabioTavernini_spendemon&metric=security_rating&token=3c79d836826de6f39f0a1d39cf02550fe96414f4)](https://sonarcloud.io/summary/new_code?id=FabioTavernini_spendemon)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=FabioTavernini_spendemon&metric=vulnerabilities&token=3c79d836826de6f39f0a1d39cf02550fe96414f4)](https://sonarcloud.io/summary/new_code?id=FabioTavernini_spendemon)



# Spendemon

Spendemon is a small Next.js dashboard for exploring Kubernetes footprint and estimating workload cost from Prometheus metrics.

It connects to one or more Prometheus endpoints, discovers clusters, namespaces, and pods, then layers in simple pricing inputs so you can get a fast cost snapshot by cluster, namespace, and pod.

## Table of Contents

- [What It Does](#what-it-does)
- [Stack](#stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Install](#install)
  - [Run the app](#run-the-app)
- [Configuration](#configuration)
  - [Settings fields](#settings-fields)
  - [Authentication](#authentication)
- [Prometheus Metrics Used](#prometheus-metrics-used)
- [App Routes](#app-routes)
- [API Routes](#api-routes)
- [Environment Notes](#environment-notes)
- [Project Structure](#project-structure)
- [Current Assumptions](#current-assumptions)
- [Development](#development)
- [Kubernetes Install With Helm](#kubernetes-install-with-helm)
- [Kubernetes Install Without Helm](#kubernetes-install-without-helm)
- [License](#license)
- [Notes](#notes)

## What It Does

- Shows an overview of connected clusters, namespaces, and pod counts
- Lets you filter data by cluster and namespace from the sidebar
- Builds cost estimates from requested CPU, memory, and ephemeral storage
- Breaks cost reporting down by cluster, namespace, and individual pod
- Stores app configuration in a local `settings.yaml` file, or on a PVC in Kubernetes
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

You can override that path with `SETTINGS_FILE_PATH`. The Kubernetes manifests in this repo use that to store settings on a persistent volume at `/data/settings.yaml`.

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

Replica count is deployment-level config. When you install with Helm, use `ha.enabled` in chart values instead of `settings.yaml`.

### Authentication

Spendemon supports two optional auth modes:

- Local credentials through env vars such as `AUTH_MODE=credentials`, `NEXTAUTH_SECRET`, and `LOCAL_*`
- OIDC through the `oidc:` block in `settings.yaml` plus the referenced `OIDC_*` and `NEXTAUTH_*` env vars

Local credentials are env-only and are not stored in `settings.yaml`.

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
- `/api/pod-history`: Returns 24-hour resource history for a pod at 5-minute intervals
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

## Kubernetes Install With Helm

The chart is published as an OCI artifact to the GitHub Container Registry. Full chart documentation is in [`charts/spendemon/README.md`](./charts/spendemon/README.md).

Install the latest release into a dedicated namespace:

```sh
helm install spendemon oci://ghcr.io/fabiotavernini/charts/spendemon \
  --namespace spendemon --create-namespace \
  --version 1.0.4
```

To customise values, pull the default values file first and edit it:

```sh
helm show values oci://ghcr.io/fabiotavernini/charts/spendemon --version 1.0.4 > values.yaml
# edit values.yaml, then:
helm install spendemon oci://ghcr.io/fabiotavernini/charts/spendemon \
  --namespace spendemon --create-namespace \
  --version 1.0.4 \
  -f values.yaml
```

To upgrade an existing installation:

```sh
helm upgrade spendemon oci://ghcr.io/fabiotavernini/charts/spendemon \
  --namespace spendemon \
  --version 1.0.4 \
  -f values.yaml
```

> **GitOps tip:** set `persistence.forceOverwrite: true` in your values file so that your Helm values are always the source of truth and overwrite the PVC on every rollout.

### Chart development

Chart docs are generated with `helm-docs`. Regenerate them after changing `Chart.yaml` or `values.yaml`:

```sh
npm run helm:docs
```

To regenerate automatically before commits, install the configured pre-commit hook:

```sh
pre-commit install
```

CI also runs the same generator and fails when `charts/spendemon/README.md` is out of date. You can run that check locally with:

```sh
npm run helm:docs:check
```

## Kubernetes Install Without Helm

If you prefer a plain manifest over Helm, you can apply the bundled multi-resource manifest directly:

```sh
kubectl apply -f https://raw.githubusercontent.com/fabiotavernini/spendemon/main/deploy/spendemon.yaml
```

The bundled manifest stores `settings.yaml` on a PVC mounted at `/data/settings.yaml`. An init container seeds the config into the PVC on first run only — subsequent restarts preserve any changes you have made via the settings UI.

Before exposing it publicly, open the settings UI or edit the file on the mounted volume with your Prometheus endpoint(s) and pricing values. If you are using Helm, keep replica changes in `ha.enabled`.

The manifest includes an optional `envFrom.secretRef` for a secret named `spendemon-auth`.

For local credentials, create that secret with:

```sh
kubectl create secret generic spendemon-auth \
  --from-literal=AUTH_MODE='credentials' \
  --from-literal=NEXTAUTH_SECRET='replace-with-a-long-random-string' \
  --from-literal=LOCAL_ADMIN_USERNAME='admin' \
  --from-literal=LOCAL_ADMIN_PASSWORD='change-me'
```

For OIDC, create the same secret with the env vars you reference in `settings.yaml`, and set these values in `settings.yaml`:

- `oidc.enabled: true`
- `oidc.issuer`
- `oidc.clientId`
- `oidc.clientSecret`

The plain manifest intentionally ships with just the core `ConfigMap`, `Deployment`, and `Service` so it works in any cluster. Add your own `Ingress` or `HTTPRoute` based on the ingress controller or Gateway API setup you already use.


## License

Spendemon is source-available under a Business Source License (BSL)-style
license.

It is free for personal, educational, non-commercial, and small-scale internal
use. Commercial use requires a paid license from the author.

See [LICENSE](./LICENSE), [LICENSE_SUMMARY.md](./LICENSE_SUMMARY.md), and
[COMMERCIAL_LICENSE.md](./COMMERCIAL_LICENSE.md).

## Notes

```sh
kubectl create secret generic spendemon-auth \
  --from-literal=NEXTAUTH_SECRET='replace-with-a-long-random-string' \
  --from-literal=NEXTAUTH_URL='https://spendemon.example.com' \
  --from-literal=OIDC_ISSUER='http://<reachable-keycloak-host>:8080/realms/spendemon' \
  --from-literal=OIDC_CLIENT_ID='your-client-id' \
  --from-literal=OIDC_CLIENT_SECRET='your-client-secret'
```
