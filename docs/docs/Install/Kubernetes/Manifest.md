---
sidebar_position: 2
---

# Manifest

Use the bundled manifest when you want a small starting point and are comfortable managing ingress, auth wiring, and later customization yourself.

## Apply the manifest

```sh
kubectl apply -f https://raw.githubusercontent.com/FabioTavernini/spendemon/main/deploy/spendemon.yaml
```

## What it includes

The manifest creates:

- a `ConfigMap` containing a starter `settings.yaml`
- a single-replica `Deployment`
- a `ClusterIP` `Service`

## How configuration works

The deployment mounts the `ConfigMap` read-only at `/config/settings.yaml`, so the `ConfigMap` is the single source of truth. There is no volume to manage.

After deployment, update the config in one of these ways:

- edit the `spendemon-settings` `ConfigMap` and run `kubectl rollout restart deployment/spendemon`
- open `/settings` in Spendemon to view the active configuration (read-only)

See [Settings](../../Configure/Settings) for the exact format.

## What you still need to add

The bundled manifest intentionally stays minimal. You will usually still want to add:

- your own `Ingress` or `HTTPRoute`
- any production-ready resource requests and limits
- your preferred namespace and labels
- a `spendemon-auth` secret if you want authentication

## Auth secret note

The plain manifest now includes an optional `envFrom.secretRef` for a secret named `spendemon-auth`.

If that secret does not exist, Spendemon simply starts without auth.

### Local credentials

Create this secret for local username/password auth:

```sh
kubectl create secret generic spendemon-auth \
  --from-literal=AUTH_MODE='credentials' \
  --from-literal=NEXTAUTH_SECRET='replace-with-a-long-random-string' \
  --from-literal=LOCAL_ADMIN_USERNAME='admin' \
  --from-literal=LOCAL_ADMIN_PASSWORD_HASH='scrypt:7b91d3c5f6f6c8e0a6f2e1b4c5d6e7f8:6b1a5f8f0a7c4b6e6b667f6c2852e7416bfe2f521f3473df84c62fb4ef13a4dd9f32831f4a1dd4ec9e4b1f69aa389a6d2f31f2f5fd70888e387de0d7e47355d6'
```

You can also add viewer-only keys such as `LOCAL_VIEWER_USERNAME` and `LOCAL_VIEWER_PASSWORD_HASH`.

### OIDC

For OIDC, keep `oidc.enabled: true` in `settings.yaml` and create the same `spendemon-auth` secret with:

```sh
kubectl create secret generic spendemon-auth \
  --from-literal=NEXTAUTH_SECRET='replace-with-a-long-random-string' \
  --from-literal=NEXTAUTH_URL='https://spendemon.example.com' \
  --from-literal=OIDC_ISSUER='https://id.example.com/realms/spendemon' \
  --from-literal=OIDC_CLIENT_ID='spendemon' \
  --from-literal=OIDC_CLIENT_SECRET='replace-me'
```

If you want those pieces wired through Helm values instead, use the [Helm install](./Helm) path.
