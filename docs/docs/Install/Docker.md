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

## Credentials note

Local username/password auth works in Docker too.

Example:

```sh
docker run \
  -p 3000:3000 \
  -e AUTH_MODE=credentials \
  -e NEXTAUTH_SECRET=replace-with-a-long-random-string \
  -e LOCAL_ADMIN_USERNAME=admin \
  -e LOCAL_ADMIN_PASSWORD=change-me \
  -v $(pwd)/settings.yaml:/app/settings.yaml \
  ghcr.io/fabiotavernini/spendemon:latest
```

For production-style setups, prefer `LOCAL_ADMIN_PASSWORD_HASH` and `LOCAL_VIEWER_PASSWORD_HASH` over plaintext passwords.

## OIDC note

OIDC works in Docker too. You need three things:

1. An `oidc:` block in `settings.yaml` with `enabled: true` and your provider values (or `${VAR}` references).
2. `NEXTAUTH_SECRET` — a long random string used to sign session cookies.
3. `NEXTAUTH_URL` — the **public base URL** where the app is reachable, including scheme and port. NextAuth uses this to construct the OAuth callback URL (`<NEXTAUTH_URL>/api/auth/callback/oidc`) that is registered with your identity provider. If it is missing or wrong, the OAuth redirect will fail.

Example:

```sh
docker run \
  -p 3000:3000 \
  -e NEXTAUTH_SECRET=replace-with-a-long-random-string \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -e OIDC_ISSUER=https://id.example.com/realms/spendemon \
  -e OIDC_CLIENT_ID=spendemon \
  -e OIDC_CLIENT_SECRET=replace-me \
  -v $(pwd)/settings.yaml:/app/settings.yaml \
  ghcr.io/fabiotavernini/spendemon:latest
```

The `settings.yaml` for the example above would reference those env vars:

```yaml
oidc:
  enabled: true
  issuer: ${OIDC_ISSUER}
  clientId: ${OIDC_CLIENT_ID}
  clientSecret: ${OIDC_CLIENT_SECRET}
  adminGroup: spendemon-admins
  viewerGroup: spendemon-viewers
```

Set `NEXTAUTH_URL` to the URL your browser uses to reach the app — for example `https://spendemon.example.com` in a production deployment.

For production-style OIDC setups, the [Helm install](./Kubernetes/Helm) path is usually simpler because the chart injects `NEXTAUTH_URL` automatically from `settings.oidc.nextAuthUrl` and wires all secrets from a Kubernetes secret reference.

## Notes

- If your Prometheus instance is only reachable from inside your cluster or VPN, make sure the Docker container has network access to it.
- If you replace the mounted file contents, refresh the app after saving.
- For the full runtime configuration format, see [Settings](../Configure/Settings).
