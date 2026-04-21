---
sidebar_position: 1
---

# Intro

Spendemon is a Prometheus-powered dashboard for exploring Kubernetes footprint and estimating workload cost by cluster, namespace, and pod.

It is built for teams that want fast cost visibility from the metrics they already collect, without introducing a much larger platform first.

## Current feature set

Spendemon currently lets you:

- connect one or more clusters through Prometheus endpoints defined in `settings.yaml`
- browse overview cards plus namespace and pod inventory from the main dashboard
- open a dedicated cost reporting view with per-cluster, per-namespace, and per-pod rollups
- estimate cost from requested CPU, memory, and ephemeral storage
- fall back to observed CPU and memory usage when requests are missing, and mark those pods as estimated
- redistribute costs from shared namespaces such as `kube-system` across the remaining namespaces in the same cluster
- edit pricing, shared namespace settings, and raw YAML from the in-app settings screen
- optionally enable local username/password auth or OIDC with `viewer` and `admin` role-based authorization

## Main routes

Once the app is running, these are the main surfaces:

- `/` for overview cards, namespace inventory, and pod inventory
- `/costreporting` for cost rollups and pod-level cost detail
- `/settings` for admins to edit pricing and raw configuration
- `/login` and `/unauthorized` when authentication is enabled

## What you need

Before you start, make sure you have:

- at least one reachable Prometheus endpoint exposing Kubernetes metrics
- a `settings.yaml` file with cluster names, Prometheus URLs, and pricing inputs
- optional auth env vars for local credentials or OIDC if you want authentication enabled

Spendemon can compare multiple clusters from one UI as long as each cluster has a `name` and `prometheusUrl` entry in the same config file.

## Install at a glance

- [Docker](./Install/Docker) for the fastest local test drive
- [Kubernetes](./Install/Kubernetes/) for cluster deployment
- [Build it yourself](./Install/biy) for local development or custom changes

## Recommended path

If you are just getting started, this is the shortest path through the docs:

1. Pick an install path: [Docker](./Install/Docker), [Helm](./Install/Kubernetes/Helm), or [Manifest](./Install/Kubernetes/Manifest).
2. Configure [`settings.yaml`](./Configure/Settings).
3. If needed, choose either local credentials or OIDC for authentication.
