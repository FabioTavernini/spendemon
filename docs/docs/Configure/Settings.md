---
sidebar_position: 1
---

import RepoFileCodeBlock from '@site/src/components/RepoFileCodeBlock';

# settings.yaml

Spendemon reads its runtime configuration from a `settings.yaml` file.

This file controls:

- which clusters are queried
- the cost rates used for estimates
- which namespaces should be treated as shared overhead
- whether OIDC authentication and authorization is enabled

Local username/password auth is configured entirely through environment variables, not `settings.yaml`.

By default the app reads `settings.yaml` from the project root. You can override the path with `SETTINGS_FILE_PATH`.

## Example

<RepoFileCodeBlock
  file="settingsExample"
  title="Starter settings-example.yaml"
  description="This starter file is rendered from the repository root so the docs stay aligned with the shipped example config."
/>

## Top-level keys

The runtime parser understands these top-level sections:

- `clusters`
- `costs`
- `sharednamespaces`
- `oidc`

One detail is easy to miss:

- `sharednamespaces` is all lowercase and written as one word

Deployment replica behavior is not part of the runtime file. If you use Helm, keep that in chart values under `ha.enabled`.

## clusters

Use `clusters` to define the Prometheus-backed environments Spendemon should query.

- `name`: cluster label shown throughout the UI
- `prometheusUrl`: base URL for that cluster's Prometheus server

Rules and notes:

- at least one cluster is required
- every cluster must include both `name` and `prometheusUrl`
- the URL must be reachable from where Spendemon is running

Example:

```yaml
clusters:
  - name: production
    prometheusUrl: https://prometheus-prod.example.com:9090
  - name: staging
    prometheusUrl: https://prometheus-staging.example.com:9090
```

## costs

The `costs` block defines the pricing inputs used to turn resource data into estimated cost.

- `cpuCore`: cost applied to CPU cores
- `memoryGb`: cost applied to memory in GB
- `storageGb`: cost applied to ephemeral storage in GB

All three values must be non-negative numbers.

Spendemon prefers Kubernetes resource requests when calculating pod cost:

- CPU from `kube_pod_container_resource_requests{resource="cpu",unit="core"}`
- memory from `kube_pod_container_resource_requests{resource="memory",unit="byte"}`
- ephemeral storage from available storage request metrics

If CPU or memory requests are missing, Spendemon falls back to observed usage for estimation and marks those pods as estimated in the report.

## sharednamespaces

Use `sharednamespaces` for platform namespaces whose cost should be redistributed across the other namespaces in the same cluster.

Typical examples:

- `kube-system`
- `monitoring`
- `ingress-nginx`

Behavior:

- matching namespaces are excluded as standalone chargeback targets
- their totals are split evenly across the remaining namespaces in that cluster
- the redistributed values are also spread across the pods inside each recipient namespace

Example:

```yaml
sharednamespaces:
  - kube-system
  - monitoring
  - ingress-nginx
```

## oidc

The `oidc` block enables authentication and role-based authorization through NextAuth and an OpenID Connect provider.

Supported keys:

- `enabled`: turns OIDC on or off
- `debug`: logs resolved memberships to the server logs during sign-in
- `issuer`: OIDC issuer URL
- `clientId`: client ID
- `clientSecret`: client secret
- `adminGroup`: membership that grants admin access
- `viewerGroup`: membership that grants viewer access
- `extraScopes`: extra scopes appended to the default `openid email profile`

`extraScopes` is stored in runtime YAML as a single string and can be space-separated or comma-separated:

```yaml
oidc:
  extraScopes: groups offline_access
```

or:

```yaml
oidc:
  extraScopes: groups,offline_access
```

The parser will normalize both forms into a deduplicated list.

### Environment placeholders

Runtime OIDC string fields can reference environment variables with `${...}` placeholders.

Example:

```yaml
oidc:
  enabled: true
  issuer: ${OIDC_ISSUER}
  clientId: ${OIDC_CLIENT_ID}
  clientSecret: ${OIDC_CLIENT_SECRET}
  adminGroup: ${OIDC_ADMIN_GROUP}
  viewerGroup: ${OIDC_VIEWER_GROUP}
```

When OIDC is enabled, these values must resolve successfully at runtime.

### Authorization model

Spendemon currently uses two roles:

- `viewer`: can access the main app and read-only API endpoints
- `admin`: can also access `/settings` and update configuration through `/api/settings`

Admins also inherit viewer access.

## credentials auth

Spendemon also supports local username/password sign-in, but that mode lives outside `settings.yaml`.

Use these environment variables instead:

- `AUTH_MODE=credentials`
- `NEXTAUTH_SECRET`
- one or more local accounts:
- `LOCAL_ADMIN_USERNAME` with either `LOCAL_ADMIN_PASSWORD` or `LOCAL_ADMIN_PASSWORD_HASH`
- `LOCAL_VIEWER_USERNAME` with either `LOCAL_VIEWER_PASSWORD` or `LOCAL_VIEWER_PASSWORD_HASH`

Rules and notes:

- at least one local account is required in credentials mode
- admins automatically inherit viewer access
- if both `*_PASSWORD` and `*_PASSWORD_HASH` are set for the same account, Spendemon fails fast on startup
- password hashes must use the format `scrypt:<saltHex>:<hashHex>`

Example:

```sh
AUTH_MODE=credentials
NEXTAUTH_SECRET=replace-with-a-long-random-string
LOCAL_ADMIN_USERNAME=admin
LOCAL_ADMIN_PASSWORD_HASH=scrypt:7b91d3c5f6f6c8e0a6f2e1b4c5d6e7f8:6b1a5f8f0a7c4b6e6b667f6c2852e7416bfe2f521f3473df84c62fb4ef13a4dd9f32831f4a1dd4ec9e4b1f69aa389a6d2f31f2f5fd70888e387de0d7e47355d6
```

Generate a hash with Node.js:

```sh
node -e "const { randomBytes, scryptSync } = require('crypto'); const salt = randomBytes(16); const hash = scryptSync(process.argv[1], salt, 64); console.log(`scrypt:${salt.toString('hex')}:${hash.toString('hex')}`)" 'change-me'
```

## Defaults and validation

If some sections are omitted, Spendemon falls back to these defaults:

- `costs`: all zeros
- `sharednamespaces`: empty list
- `oidc.enabled`: `false`
- `oidc.debug`: `false`
- `oidc.adminGroup`: `admin`
- `oidc.viewerGroup`: `viewer`
- `oidc.extraScopes`: empty list

Validation rules to keep in mind:

- `clusters` must exist and contain at least one entry
- `costs` must be non-negative numbers
- `oidc.enabled` and `oidc.debug` must be `true` or `false`
- unknown keys inside supported sections are rejected

## Example with everything enabled

```yaml
clusters:
  - name: production
    prometheusUrl: https://prometheus-prod.example.com:9090

costs:
  cpuCore: 12.5
  memoryGb: 1.8
  storageGb: 0.12

sharednamespaces:
  - kube-system
  - monitoring

oidc:
  enabled: true
  debug: false
  issuer: ${OIDC_ISSUER}
  clientId: ${OIDC_CLIENT_ID}
  clientSecret: ${OIDC_CLIENT_SECRET}
  adminGroup: platform-admins
  viewerGroup: engineering
  extraScopes: groups
```
