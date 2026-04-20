---
sidebar_position: 1
---

# Helm

Helm is the recommended way to run Spendemon on Kubernetes.

The chart lives in:
[https://github.com/FabioTavernini/spendemon/tree/main/charts/spendemon](https://github.com/FabioTavernini/spendemon/tree/main/charts/spendemon)

## Install

```sh
helm upgrade --install spendemon \
  oci://ghcr.io/fabiotavernini/charts/spendemon \
  --values ./values.yaml
```

## Example values.yaml

```yaml
image:
  tag: latest

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: spendemon.example.com
      paths:
        - path: /
          pathType: Prefix

settings:
  clusters:
    - name: prod-eu
      prometheusUrl: http://prometheus-operated.monitoring.svc:9090
    - name: staging-us
      prometheusUrl: http://prometheus-operated.monitoring.svc:9090

  costs:
    cpuCore: 12.5
    memoryGb: 1.8
    storageGb: 0.12

  ha:
    enabled: true

  sharednamespaces:
    - kube-system
    - monitoring

  oidc:
    enabled: true
    nextAuthUrl: https://spendemon.example.com
    adminGroup: platform-admins
    viewerGroup: engineering
    extraScopes:
      - groups
    secretRef:
      name: oidc-secret
```

## What the chart configures

The chart exposes these major value groups:

- `image`: repository, tag, pull policy, and optional image pull secret
- `service`: service type and port
- `ingress`: optional Kubernetes `Ingress`
- `gateway`: optional Gateway API `HTTPRoute`
- `resources`: pod requests and limits
- `persistence`: PVC size, storage class, and mount path for `settings.yaml`
- `settings`: the runtime config rendered into `settings.yaml`

The default values file is here:
[https://github.com/FabioTavernini/spendemon/blob/main/charts/spendemon/values.yaml](https://github.com/FabioTavernini/spendemon/blob/main/charts/spendemon/values.yaml)

## Runtime settings vs Helm values

There are two slightly different configuration layers:

- Helm values use `settings.ha.enabled`
- the generated runtime file uses `HA.enabled`

The same applies to OIDC helpers:

- Helm values include `settings.oidc.nextAuthUrl` and `settings.oidc.secretRef`
- the runtime `settings.yaml` only stores the app-facing OIDC fields such as `issuer`, `clientId`, `clientSecret`, `adminGroup`, `viewerGroup`, `debug`, and `extraScopes`

See [Settings](../../Configure/Settings) for the runtime file format.

## OIDC secret wiring

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

The chart stores `settings.yaml` on a PVC and seeds it from the rendered template only when the file does not already exist.

That means:

- the first install creates the initial file from chart values
- later edits through the Spendemon UI persist on the PVC
- changing Helm values does not overwrite an existing `settings.yaml` automatically

If you want the chart-rendered settings to take effect again, recreate the persisted file or the PVC for that release.
