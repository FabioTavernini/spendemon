---
sidebar_position: 1
---

# Kubernetes

Spendemon ships with two Kubernetes installation paths.

- [Helm Chart](./Helm) is the recommended path.
- [Plain Manifest](./Manifest) is the lightweight path.

## Which one should you choose?

Choose Helm when you want:

- built-in persistence for `settings.yaml`
- configurable Ingress or Gateway API routing
- OIDC secret wiring through chart values
- easier upgrades and environment-specific values files

Choose the plain manifest when you want:

- a minimal deployment you can read quickly
- to manage ingress and auth wiring yourself
- a simple starting point for a custom manifest set
