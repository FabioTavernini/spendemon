---
sidebar_position: 1
---

# settings.yaml

Spendemon reads its runtime configuration from a `settings.yaml` file. This file tells the app which clusters to display, where to find Prometheus for each cluster, and which pricing assumptions to use when estimating cost.

## Example

```yaml
clusters:
  - name: cluster-2
    prometheusUrl: http://localhost:9090

costs:
  cpuCore: 10
  memoryGb: 20
  storageGb: 5

oidc:
  enabled: false
  issuer: ${OIDC_ISSUER}
  clientId: ${OIDC_CLIENT_ID}
  clientSecret: ${OIDC_CLIENT_SECRET}
  adminGroup: admin
  viewerGroup: viewer
```

## Cluster configuration

Use `clusters` to define the environments Spendemon should connect to.

- `name`: the display name shown in the UI
- `prometheusUrl`: the base URL of the Prometheus instance for that cluster

You can add multiple entries when you want to compare several clusters in one dashboard.

Example:

```yaml
clusters:
  - name: production
    prometheusUrl: https://prometheus-prod.example.com
  - name: staging
    prometheusUrl: https://prometheus-staging.example.com
```

## Cost configuration

The `costs` block defines the pricing inputs used to turn infrastructure usage into estimated cost.

- `cpuCore`: cost assigned to one CPU core
- `memoryGb`: cost assigned to one gigabyte of memory
- `storageGb`: cost assigned to one gigabyte of storage

These numbers should reflect your own internal assumptions or cloud cost model. Spendemon uses them as estimation inputs, so they do not need to exactly mirror your billing export to still be useful.

## OIDC configuration

If you want authentication, enable the `oidc` block.

- `enabled`: turns OIDC integration on or off
- `issuer`: the issuer URL of your identity provider
- `clientId`: the OIDC client ID
- `clientSecret`: the OIDC client secret
- `adminGroup`: group name that should receive admin access
- `viewerGroup`: group name that should receive read-only access

The example uses environment variable placeholders for sensitive values. That is the recommended approach so secrets are not committed into source control.

## Practical tips

- Start with one cluster and simple cost values, then expand once the basic flow works.
- Make sure the Prometheus URL is reachable from wherever Spendemon is running.
- Keep secrets such as OIDC client credentials outside the repository when possible.
