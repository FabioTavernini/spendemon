---
layout: docs
title: Documentation
permalink: /
lead: Learn what Spendemon does, how it is configured, and where to go next.
toc:
  - title: Overview
    url: "#overview"
  - title: What You Can Do
    url: "#what-you-can-do"
  - title: Main Pages
    url: "#main-pages"
  - title: Quick Start
    url: "#quick-start"
  - title: Install
    url: "#install"
  - title: Next Reads
    url: "#next-reads"
---

# Spendemon Docs

## Overview

Spendemon is a lightweight dashboard for exploring Kubernetes footprint and estimating workload costs from Prometheus metrics.

It is built for teams that want a fast answer to simple questions like:

- which clusters are connected right now
- how many namespaces and pods are being reported
- what requested resources imply for estimated cost
- where pricing and Prometheus endpoints are configured

## What You Can Do

- Connect one or more Prometheus endpoints
- Inspect workload inventory by cluster and namespace
- Review estimated costs by cluster, namespace, and pod
- Adjust pricing inputs in the UI or with `settings.yaml`

## Main Pages

- [Info](/info/): the main technical overview and configuration guide
- [About](/about/): a short project summary and intent
- `README.md`: local development and repository context

## Quick Start

Pull the latest container image:

```bash
docker pull ghcr.io/fabiotavernini/spendemon:latest
```

Use the image when you want the fastest way to try Spendemon without a local Node.js setup.

## Install

Install Spendemon with Helm from the published OCI chart:

```bash
helm install spendemon oci://ghcr.io/fabiotavernini/charts/spendemon --version 0.0.0-dev
```

Head to the [Info](/info/) page for the full install and configuration reference.


## Next Reads

Start with the [Info](/info/) page if you want the core docs experience with the full table of contents.
