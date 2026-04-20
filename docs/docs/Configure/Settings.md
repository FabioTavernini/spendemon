---
sidebar_position: 1
---

# settings.yaml

Spendemon reads its runtime configuration from a `settings.yaml` file.

This file controls:

- which clusters are queried
- the cost rates used for estimates
- whether HA should be enabled in the bundled Kubernetes deployment patterns
- which namespaces should be treated as shared overhead
- whether OIDC authentication and authorization is enabled

By default the app reads `settings.yaml` from the project root. You can override the path with `SETTINGS_FILE_PATH`.

## Example

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

HA:
  enabled: false

sharednamespaces:
  - kube-system
  - monitoring

oidc:
  enabled: false
  debug: false
  issuer: ${OIDC_ISSUER}
  clientId: ${OIDC_CLIENT_ID}
  clientSecret: ${OIDC_CLIENT_SECRET}
  adminGroup: platform-admins
  viewerGroup: engineering
  extraScopes: groups
```

## Top-level keys

The runtime parser understands these top-level sections:

- `clusters`
- `costs`
- `HA`
- `sharednamespaces`
- `oidc`

Two details are easy to miss:

- `HA` is uppercase in runtime `settings.yaml`
- `sharednamespaces` is all lowercase and written as one word

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

## HA

The `HA` block currently contains one key:

- `enabled`: when `true`, the bundled Helm chart and related deployment patterns use 2 replicas instead of 1

Example:

```yaml
HA:
  enabled: true
```

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

## Defaults and validation

If some sections are omitted, Spendemon falls back to these defaults:

- `costs`: all zeros
- `HA.enabled`: `false`
- `sharednamespaces`: empty list
- `oidc.enabled`: `false`
- `oidc.debug`: `false`
- `oidc.adminGroup`: `admin`
- `oidc.viewerGroup`: `viewer`
- `oidc.extraScopes`: empty list

Validation rules to keep in mind:

- `clusters` must exist and contain at least one entry
- `costs` must be non-negative numbers
- `HA.enabled` and `oidc.enabled` / `oidc.debug` must be `true` or `false`
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

HA:
  enabled: true

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
