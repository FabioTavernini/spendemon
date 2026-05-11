---
sidebar_position: 4
---

# Build it yourself

Use this path if you want to develop locally, inspect the code, or run a custom build.

## Prerequisites

- Node.js 20 or newer
- npm
- access to a Prometheus endpoint you can point Spendemon at

## Clone and install

```sh
git clone https://github.com/FabioTavernini/spendemon.git
cd spendemon
npm install
```

## Create your config

```sh
cp settings-example.yaml settings.yaml
```

Then edit `settings.yaml` with:

- one or more cluster names
- a reachable `prometheusUrl` for each cluster
- pricing values under `costs`
- optional `sharednamespaces` and `oidc` settings

See [Settings](../Configure/Settings) for the full format.

## Start Spendemon

```sh
npm run dev
```

Then open `http://localhost:3000`.

## Credentials note

If you want local username/password auth, start Spendemon with env vars such as:

```sh
AUTH_MODE=credentials \
NEXTAUTH_SECRET=replace-with-a-long-random-string \
LOCAL_ADMIN_USERNAME=admin \
LOCAL_ADMIN_PASSWORD=change-me \
npm run dev
```

For production-style setups, prefer `LOCAL_ADMIN_PASSWORD_HASH` and `LOCAL_VIEWER_PASSWORD_HASH` over plaintext passwords.

## OIDC note

If your `settings.yaml` has `oidc.enabled: true`, you need three environment variables set before starting the app:

1. The provider env vars referenced by your `oidc:` block (e.g. `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`).
2. `NEXTAUTH_SECRET` — a long random string used to sign session cookies.
3. `NEXTAUTH_URL` — the **public base URL** of the app (e.g. `http://localhost:3000` locally). NextAuth uses this to construct the OAuth callback URL (`<NEXTAUTH_URL>/api/auth/callback/oidc`). If it is missing or wrong, the OAuth redirect will fail.

Example:

```sh
NEXTAUTH_SECRET=replace-with-a-long-random-string \
NEXTAUTH_URL=http://localhost:3000 \
OIDC_ISSUER=https://id.example.com/realms/spendemon \
OIDC_CLIENT_ID=spendemon \
OIDC_CLIENT_SECRET=replace-me \
npm run dev
```

## Docs-only workflow

If you are only working on the Docusaurus site under `docs/`, start it separately:

```sh
cd docs
npm install
npm run start
```

This launches the docs site with live reload from the `docs/` folder.
