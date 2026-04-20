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
- a `PersistentVolumeClaim` for persisted settings
- a single-replica `Deployment`
- a `ClusterIP` `Service`

## How configuration works

The deployment mounts `/data/settings.yaml` and seeds it from the `ConfigMap` only if the file does not already exist on the PVC.

That means the manifest gives you a sensible first boot, then the persisted file becomes the source of truth.

After deployment, update the config in one of these ways:

- open `/settings` in Spendemon and edit the file from the UI
- edit the file on the mounted volume yourself

See [Settings](../../Configure/Settings) for the exact format.

## What you still need to add

The bundled manifest intentionally stays minimal. You will usually still want to add:

- your own `Ingress` or `HTTPRoute`
- any production-ready resource requests and limits
- your preferred namespace and labels
- OIDC environment variables and secrets if you want authentication

## OIDC note

The plain manifest does not include the secret wiring that the Helm chart provides.

If you want OIDC with the plain manifest, you need to extend the deployment with:

- `OIDC_ISSUER`
- `OIDC_CLIENT_ID`
- `OIDC_CLIENT_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

If you want those pieces pre-wired, use the [Helm install](./Helm) path instead.
