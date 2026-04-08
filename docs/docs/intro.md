---
sidebar_position: 1
---

# Intro

Spendemon is a lightweight dashboard for exploring your Kubernetes footprint and estimating workload cost from Prometheus metrics.

## Install at a glance

- [Docker](./Install/Docker) for the fastest local test drive
- [Kubernetes](./Install/Kubernetes/)
- [Build it yourself](./Install/biy) if you want to run from source or contribute

It is designed for teams that want a quick way to answer questions like:

- Which namespaces or workloads are consuming the most CPU and memory?
- How does that usage translate into an estimated monthly cost?
- Which clusters should we keep an eye on as spend grows over time?

Instead of building a custom cost view from scratch, Spendemon gives you a focused UI on top of the metrics you already collect.

## What Spendemon helps with

Spendemon is a good fit when you want cost visibility without introducing a large platform just to get basic answers. It helps you:

- inspect workload resource usage from a Kubernetes cluster
- turn usage into rough cost estimates using configurable pricing inputs
- compare clusters through one dashboard
- give platform teams and engineering leads a shared view of infrastructure footprint

The goal is not perfect cloud billing parity. The goal is fast, actionable visibility based on the telemetry you already have.

## What you need before you start

Before installing Spendemon, make sure you have:

- a Kubernetes cluster you want to observe
- Prometheus metrics available for that cluster
- a `settings.yaml` file with cluster definitions and cost inputs

If you are running multiple clusters, you can configure each one in the same settings file and review them from the same interface.

## After installation

Once Spendemon is running, the usual next step is to wire in your cluster and pricing configuration through [`settings.yaml`](./Configure/Settings). From there you can:

- connect one or more Prometheus-backed clusters
- define cost assumptions for CPU, memory, and storage
- optionally enable OIDC for authentication and role-based access

## Recommended reading

If you are just getting started, this is a good path through the docs:

1. Read the [Docker install guide](./Install/Docker) or [Build it yourself](./Install/biy) guide.
2. Configure your [`settings.yaml`](./Configure/Settings).
3. Continue with the development docs if you want to extend or contribute to Spendemon.
