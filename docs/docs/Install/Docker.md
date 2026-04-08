---
sidebar_position: 3
---

# Docker

Running Spendemon with Docker is the quickest way to try it locally. This is a good option when you want to validate the UI, test a configuration, or connect to an existing Prometheus instance without setting up a full development environment.

## Run it directly

```sh
docker run -p 3000:3000 ghcr.io/fabiotavernini/spendemon:latest
```

Then open `http://localhost:3000`.

## Provide configuration

Spendemon needs a `settings.yaml` file to know which clusters to show and which cost assumptions to use. In practice, you will usually mount that file into the container.

Example:

```sh
docker run \
  -p 3000:3000 \
  -v $(pwd)/settings.yaml:/app/settings.yaml \
  ghcr.io/fabiotavernini/spendemon:latest
```

Adjust the container path if your image expects the config in a different location.

## Typical local workflow

The most common way to evaluate Spendemon with Docker is:

1. Create a `settings.yaml` file with at least one cluster and some baseline pricing values.
2. Start the container and mount the configuration file.
3. Open the app in your browser.
4. Confirm the Prometheus endpoint is reachable from the environment where the container runs.

## Notes

- If your Prometheus instance is only reachable from inside your cluster or VPN, make sure the Docker container has network access to it.
- If you update `settings.yaml`, you may need to restart the container depending on how the application loads configuration.
- For the available configuration keys, see [Settings](../Configure/Settings).
