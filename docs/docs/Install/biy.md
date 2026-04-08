---
sidebar_position: 4
---

# Build it yourself

Use this path if you want to develop locally, inspect the code, or contribute changes. It gives you the most control and is the best setup for iterating on the app itself.

## Prerequisites

Before you begin, make sure you have:

- Node.js 20 or newer
- a package manager such as `npm`
- access to a Prometheus endpoint you can point Spendemon at

## Clone and install

```sh
git clone https://github.com/FabioTavernini/spendemon.git
cd spendemon
npm install
```

## Start the app

Once dependencies are installed, start the local development server for the Spendemon app using the scripts provided by the main project:
```sh
npm run dev
```

If you are only working on these docs, the docs site itself can be started from this directory with:

```sh
cd docs
npm install
npm run start
```

## Configure Spendemon

Edit the `settings.yaml` file and define:

- one or more clusters
- the Prometheus URL for each cluster
- cost values for CPU, memory, and storage
- optional OIDC settings if you want authentication enabled

See [Settings](../Configure/Settings) for the configuration format.

## When to choose this option

Building from source is the right choice when you want to:

- contribute code or docs
- test changes before opening a pull request
- run a custom version instead of the published container image
