---
sidebar_position: 3
---

# Docker

Running Spendemon with Docker is the quickest way to try the app locally.

It is a good fit when you want to validate the UI, connect to an existing Prometheus endpoint, or test a `settings.yaml` file without setting up the full development environment.

## Run it directly

```sh
docker run -p 3000:3000 ghcr.io/fabiotavernini/spendemon:latest
```

Then open `http://localhost:3000`.

The image already contains a starter `settings.yaml`, so the container will boot immediately. In practice, you will usually want to provide your own config.

## Mount your own settings.yaml

Spendemon reads runtime configuration from `settings.yaml` in the container working directory unless `SETTINGS_FILE_PATH` is overridden.

Example:

```sh
docker run \
  -p 3000:3000 \
  -v $(pwd)/settings.yaml:/app/settings.yaml \
  ghcr.io/fabiotavernini/spendemon:latest
```

If you prefer another mount path, also set `SETTINGS_FILE_PATH`:

```sh
docker run \
  -p 3000:3000 \
  -e SETTINGS_FILE_PATH=/data/settings.yaml \
  -v $(pwd)/settings.yaml:/data/settings.yaml \
  ghcr.io/fabiotavernini/spendemon:latest
```

## Typical local workflow

1. Copy the example config and edit it for your environment.

```sh
cp settings-example.yaml settings.yaml
```

2. Point `clusters[].prometheusUrl` at a Prometheus instance reachable from the container.
3. Start the container and mount `settings.yaml`.
4. Open `http://localhost:3000`.
5. Use `/settings` if you want to adjust pricing or inspect the raw YAML in the UI.

## OIDC note

OIDC works in Docker too, but you need both:

- an `oidc:` block in `settings.yaml`
- the environment variables referenced by that block, plus `NEXTAUTH_SECRET` and `NEXTAUTH_URL`

For production-style OIDC setups, the [Helm install](./Kubernetes/Helm) path is usually simpler because the chart already supports secret-based wiring.

## Notes

- If your Prometheus instance is only reachable from inside your cluster or VPN, make sure the Docker container has network access to it.
- If you replace the mounted file contents, refresh the app after saving.
- For the full runtime configuration format, see [Settings](../Configure/Settings).
