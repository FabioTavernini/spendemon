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
- optional `sharednamespaces`, `HA`, and `oidc` settings

See [Settings](../Configure/Settings) for the full format.

## Start Spendemon

```sh
npm run dev
```

Then open `http://localhost:3000`.

## OIDC note

If your `settings.yaml` uses placeholders such as `${OIDC_ISSUER}`, export those environment variables before starting the app. In production, you should also set `NEXTAUTH_SECRET` and `NEXTAUTH_URL`.

## Docs-only workflow

If you are only working on the Docusaurus site under `docs/`, start it separately:

```sh
cd docs
npm install
npm run start
```

This launches the docs site with live reload from the `docs/` folder.
