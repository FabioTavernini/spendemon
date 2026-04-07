---
layout: docs
title: Info
permalink: /info/
sidebar_title: Spendemon Docs
lead: The core reference for architecture, configuration, routes, and local development.
toc:
  - title: What Spendemon Is
    url: "#what-spendemon-is"
  - title: Quick Start
    url: "#quick-start"
  - title: Install
    url: "#install"
  - title: Core Features
    url: "#core-features"
  - title: How It Works
    url: "#how-it-works"
  - title: Configuration
    url: "#configuration"
  - title: Main Routes
    url: "#main-routes"
  - title: API Endpoints
    url: "#api-endpoints"
  - title: Prometheus Metrics
    url: "#prometheus-metrics"
  - title: Local Development
    url: "#local-development"
  - title: Project Notes
    url: "#project-notes"
---

# Info

## What Spendemon Is

Spendemon is a small dashboard for exploring Kubernetes footprint and estimating workload cost from Prometheus metrics.

It connects to configured Prometheus endpoints, discovers clusters and workloads, and applies simple pricing inputs so you can understand cost by cluster, namespace, and pod.

## Quick Start

If you want the fastest way to try Spendemon, start with the published Docker image:

```bash
docker run -p 3000:3000 ghcr.io/fabiotavernini/spendemon:latest
```

After pulling the image, run it with the environment variables and configuration that fit your setup.

## Install

Install Spendemon into a Kubernetes cluster with Helm using the OCI chart:

```bash
helm install spendemon oci://ghcr.io/fabiotavernini/charts/spendemon --version 0.0.0-dev
```

You can then customize values as needed with standard Helm options such as `-f values.yaml` or `--set`.

## Core Features

- Overview dashboard with cluster, namespace, and pod counts
- Sidebar filtering by cluster and namespace
- Cost estimates based on requested CPU, memory, and ephemeral storage
- Cost reporting by cluster, namespace, and pod
- Settings management through the UI or `settings.yaml`

## How It Works

Spendemon reads cluster definitions and pricing from `settings.yaml`.

For each configured cluster, it queries Prometheus for Kubernetes metrics and builds a combined view of:

- discovered namespaces
- pod inventory
- requested resource values
- estimated costs using flat pricing inputs

If one cluster fails to respond, the app continues rendering the remaining clusters instead of failing the whole dashboard.

## Configuration

Spendemon stores its configuration in a root-level `settings.yaml` file.

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

Important fields:

- `clusters[].name`: display name shown in the UI
- `clusters[].prometheusUrl`: Prometheus base URL for that cluster
- `costs.cpuCore`: price per requested CPU core
- `costs.memoryGb`: price per requested GB of memory
- `costs.storageGb`: price per requested GB of ephemeral storage

## Main Routes

- `/`: high-level dashboard and inventory overview
- `/costreporting`: cost rollups and per-pod reporting
- `/settings`: pricing controls and raw YAML editor

## API Endpoints

- `/api/clusters`: configured clusters
- `/api/namespaces`: discovered namespaces
- `/api/pods`: discovered pods
- `/api/settings`: read and update settings

## Prometheus Metrics

Spendemon relies on standard Kubernetes metrics exposed to Prometheus, including:

- `kube_namespace_created`
- `kube_pod_status_phase`
- `kube_pod_container_resource_requests{resource="cpu",unit="core"}`
- `kube_pod_container_resource_requests{resource="memory",unit="byte"}`
- ephemeral storage request metrics, with query fallbacks

## Local Development

Prerequisites:

- Node.js 20+
- npm
- reachable Prometheus endpoints with Kubernetes metrics

Start the app with:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Project Notes

- Cost values are estimates, not cloud billing imports
- Pricing uses a flat-rate model for requested resources
- Cluster connectivity depends on the Prometheus URLs in `settings.yaml`
- The project uses a dual-license model for personal and commercial use
