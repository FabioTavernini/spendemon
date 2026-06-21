---
sidebar_position: 1
description: Install Spendemon on Kubernetes with the official Helm chart and live chart defaults.
---

import RemoteCodeBlock from '@site/src/components/RemoteCodeBlock';

# Helm

Helm is the recommended way to run Spendemon on Kubernetes. It keeps routing,
persistence, and runtime settings in one release, which makes upgrades and
environment-specific overrides much easier to manage.

The chart lives in:
[https://github.com/FabioTavernini/spendemon/tree/main/charts/spendemon](https://github.com/FabioTavernini/spendemon/tree/main/charts/spendemon)

<div className="doc-card-grid">
  <div className="doc-card">
    <p className="doc-card__eyebrow">Recommended path</p>
    <h3>Deploy with one chart</h3>
    <p>
      Use Helm when you want repeatable releases, per-environment values files,
      and cleaner upgrade workflows.
    </p>
  </div>
  <div className="doc-card">
    <p className="doc-card__eyebrow">Built-in persistence</p>
    <h3>Keep `settings.yaml` on a PVC</h3>
    <p>
      The chart mounts a persistent volume and seeds the initial runtime config
      without forcing you to rebuild the container image.
    </p>
  </div>
  <div className="doc-card">
    <p className="doc-card__eyebrow">Auth-ready</p>
    <h3>Wire credentials or OIDC through values</h3>
    <p>
      Ingress, Gateway API, local credentials, and OIDC secret references can
      all be managed from the same release values.
    </p>
  </div>
</div>

## Install

Add the Helm repository, then install (or upgrade) the release with your values:

```sh
helm repo add spendemon https://fabiotavernini.github.io/spendemon
helm repo update
helm upgrade --install spendemon spendemon/spendemon \
  --values ./values.yaml
```

Pin a specific chart version with `--version`, e.g. `--version 1.1.1`. List
available versions with `helm search repo spendemon --versions`.

## Upgrade

Pull the latest chart metadata, then re-run the same command:

```sh
helm repo update
helm upgrade --install spendemon spendemon/spendemon \
  --values ./values.yaml
```

## Install from the OCI registry (alternative)

The chart is also published as an OCI artifact, which needs no `helm repo add`:

```sh
helm upgrade --install spendemon \
  oci://ghcr.io/fabiotavernini/charts/spendemon \
  --values ./values.yaml
```

## Current chart values

The block below is fetched live from the repository, so it always reflects the latest `charts/spendemon/values.yaml`.

<RemoteCodeBlock
  url="https://raw.githubusercontent.com/FabioTavernini/spendemon/refs/heads/main/charts/spendemon/values.yaml"
  sourceUrl="https://github.com/FabioTavernini/spendemon/blob/main/charts/spendemon/values.yaml"
  title="Current chart values.yaml"
  description="Fetched live from the Helm chart in this repository."
/>

## What the chart configures

The chart exposes these major value groups:

- `image`: repository, tag, pull policy, and optional image pull secret
- `service`: service type and port
- `ingress`: optional Kubernetes `Ingress`
- `gateway`: optional Gateway API `HTTPRoute`
- `ha`: deployment replica behavior managed by the chart
- `resources`: pod requests and limits
- `persistence`: PVC size, storage class, and mount path for `settings.yaml`
- `auth.credentials`: optional local username/password auth secret wiring
- `settings`: the runtime config rendered into `settings.yaml`

The default values file is here:
[https://github.com/FabioTavernini/spendemon/blob/main/charts/spendemon/values.yaml](https://github.com/FabioTavernini/spendemon/blob/main/charts/spendemon/values.yaml)

## What to customize first

Most teams only need to touch a few areas for the first working deployment:

- `settings.clusters`: point Spendemon at one or more Prometheus endpoints
- `settings.costs`: set your CPU, memory, and storage rates
- `ingress` or `gateway`: expose the UI inside your environment
- `ha.enabled`: run two replicas instead of one when you want chart-managed HA
- `auth.credentials.*` or `settings.oidc.*`: choose one auth mode if you want login
- `persistence.*`: align the PVC with your cluster storage defaults

## Runtime settings vs Helm values

There are two slightly different configuration layers:

- deployment-only values such as `ha.enabled` stay in Helm and do not appear in the runtime `settings.yaml`
- application values under `settings.*` are rendered into the runtime `settings.yaml`

The same applies to OIDC helpers:

- Helm values include `settings.oidc.nextAuthUrl` and `settings.oidc.secretRef`
- the runtime `settings.yaml` only stores the app-facing OIDC fields such as `issuer`, `clientId`, `clientSecret`, `adminGroup`, `viewerGroup`, `debug`, and `extraScopes`

Local credentials are Helm-only:

- `auth.credentials.*` injects `AUTH_MODE=credentials`, `NEXTAUTH_SECRET`, and optional `LOCAL_*` account env vars
- no local credential data is written into the runtime `settings.yaml`

See [Settings](../../Configure/Settings) for the runtime file format.

## Auth secret wiring

Only enable one auth mode at a time:

- `auth.credentials.enabled: true` for local username/password sign-in
- `settings.oidc.enabled: true` for OIDC

### Local credentials

When `auth.credentials.enabled` is `true`, the chart expects a Kubernetes secret with:

- `nextauthSecret`
- `localAdminUsername` with either `localAdminPassword` or `localAdminPasswordHash`
- `localViewerUsername` with either `localViewerPassword` or `localViewerPasswordHash`

You only need one of the local account entries to enable credentials mode.

Example:

```sh
kubectl create secret generic spendemon-credentials \
  --from-literal=nextauthSecret='replace-with-a-long-random-string' \
  --from-literal=localAdminUsername='admin' \
  --from-literal=localAdminPasswordHash='scrypt:7b91d3c5f6f6c8e0a6f2e1b4c5d6e7f8:6b1a5f8f0a7c4b6e6b667f6c2852e7416bfe2f521f3473df84c62fb4ef13a4dd9f32831f4a1dd4ec9e4b1f69aa389a6d2f31f2f5fd70888e387de0d7e47355d6'
```

Then point the chart at that secret:

```yaml
auth:
  credentials:
    enabled: true
    secretRef:
      name: spendemon-credentials
```

### OIDC

When `settings.oidc.enabled` is `true`, the chart expects a Kubernetes secret with:

- issuer
- client ID
- client secret
- `NEXTAUTH_SECRET`

Example:

```sh
kubectl create secret generic oidc-secret \
  --from-literal=issuer='https://id.example.com/realms/spendemon' \
  --from-literal=clientId='spendemon' \
  --from-literal=clientSecret='replace-me' \
  --from-literal=nextauthSecret='replace-with-a-long-random-string'
```

## Important persistence behavior

The chart stores `settings.yaml` on a PVC and seeds it from the rendered
template only when the file does not already exist.

That means:

- the first install creates the initial file from chart values
- later edits through the Spendemon UI persist on the PVC
- changing Helm values does not overwrite an existing `settings.yaml` automatically

If you want the chart-rendered settings to take effect again, recreate the persisted file or the PVC for that release.
