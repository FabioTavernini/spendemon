# spendemon

![Version: 1.0.3](https://img.shields.io/badge/Version-1.0.3-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: 1.0.3](https://img.shields.io/badge/AppVersion-1.0.3-informational?style=flat-square)

Spendemon Next.js app

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| auth.credentials.enabled | bool | `false` | Set to true to enable local username/password sign-in. |
| auth.credentials.secretRef.adminPasswordHashKey | string | `"localAdminPasswordHash"` | Optional secret key containing LOCAL_ADMIN_PASSWORD_HASH. |
| auth.credentials.secretRef.adminPasswordKey | string | `"localAdminPassword"` | Optional secret key containing LOCAL_ADMIN_PASSWORD. |
| auth.credentials.secretRef.adminUsernameKey | string | `"localAdminUsername"` | Optional secret key containing LOCAL_ADMIN_USERNAME. |
| auth.credentials.secretRef.name | string | `""` | Secret name. Required when credentials auth is enabled. |
| auth.credentials.secretRef.nextAuthSecretKey | string | `"nextauthSecret"` | Secret key containing NEXTAUTH_SECRET. |
| auth.credentials.secretRef.viewerPasswordHashKey | string | `"localViewerPasswordHash"` | Optional secret key containing LOCAL_VIEWER_PASSWORD_HASH. |
| auth.credentials.secretRef.viewerPasswordKey | string | `"localViewerPassword"` | Optional secret key containing LOCAL_VIEWER_PASSWORD. |
| auth.credentials.secretRef.viewerUsernameKey | string | `"localViewerUsername"` | Optional secret key containing LOCAL_VIEWER_USERNAME. |
| automountServiceAccountToken | bool | `false` | Spendemon does not need access to the Kubernetes API by default, so do not mount the service account token unless you explicitly opt in. |
| gateway.enabled | bool | `false` | Set to true to create an HTTPRoute instead of, or alongside, an Ingress. |
| gateway.hosts | list | `["spendemon.domain.com"]` | Hostnames served by the HTTPRoute. |
| gateway.parentRefs[0] | object | `{"name":"yourgateway","namespace":"gateway-namespace"}` | Name of the Gateway resource. |
| gateway.parentRefs[0].namespace | string | `"gateway-namespace"` | Namespace of the Gateway. Omit if the Gateway is in the same namespace. |
| gateway.rules[0].matches[0] | object | `{"path":"/","pathType":"PathPrefix"}` | Path match used by the Gateway API HTTPRoute. |
| gateway.rules[0].matches[0].pathType | string | `"PathPrefix"` | Gateway API path type. Defaults to PathPrefix in the template. |
| ha.enabled | bool | `false` | Set to true to run 2 replicas instead of 1. |
| image.imagePullSecret | string | `""` | Optional image pull secret name for private registries. Leave empty for public images. |
| image.pullPolicy | string | `"IfNotPresent"` | Kubernetes image pull policy for the application container. |
| image.repository | string | `"ghcr.io/fabiotavernini/spendemon"` | OCI image repository to deploy. |
| image.tag | string | `"latest"` | Image tag to deploy. Must be set to a specific version (e.g. "1.2.3"). "latest" is not recommended in production. |
| ingress.annotations | object | `{}` | Optional annotations passed straight through to the Ingress metadata. |
| ingress.className | string | `""` | Optional ingress class name, for example "nginx" or "traefik". |
| ingress.enabled | bool | `false` | Set to true to create an Ingress. |
| ingress.hosts[0].host | string | `"spendemon.domain.com"` |  |
| ingress.hosts[0].paths[0] | object | `{"path":"/","pathType":"Prefix"}` | URL path to route to Spendemon. |
| ingress.hosts[0].paths[0].pathType | string | `"Prefix"` | Standard Kubernetes path matching mode. |
| persistence.accessModes | list | `["ReadWriteOnce"]` | PVC access modes. |
| persistence.forceOverwrite | bool | `false` | If true, the init container always overwrites settings.yaml from the Helm values on every pod start, ignoring any manual in-cluster edits. The default (false) already auto-applies Helm value changes via checksum tracking — only set this if you want to discard UI edits too. |
| persistence.mountPath | string | `"/data"` | Mount point inside the container for the settings file volume. |
| persistence.size | string | `"1Gi"` | Requested PVC size. |
| persistence.storageClassName | string | `""` | StorageClass for the PVC. Leave empty to use the cluster default. |
| resources.limits.cpu | string | `"500m"` | CPU limit for the main application container. |
| resources.limits.ephemeral-storage | string | `"512Mi"` | Ephemeral storage limit for the main application container. |
| resources.limits.memory | string | `"512Mi"` | Memory limit for the main application container. |
| resources.requests.cpu | string | `"100m"` | CPU requested by the main application container. |
| resources.requests.ephemeral-storage | string | `"256Mi"` | Ephemeral storage requested by the main application container. |
| resources.requests.memory | string | `"256Mi"` | Memory requested by the main application container. |
| seedSettings.image.pullPolicy | string | `"IfNotPresent"` | Kubernetes image pull policy for the init container. |
| seedSettings.image.repository | string | `"busybox"` | OCI image repository for the seed-settings init container. |
| seedSettings.image.tag | string | `"1.36"` | Image tag for the init container. |
| seedSettings.resources.limits.cpu | string | `"50m"` |  |
| seedSettings.resources.limits.memory | string | `"64Mi"` |  |
| seedSettings.resources.requests.cpu | string | `"10m"` |  |
| seedSettings.resources.requests.memory | string | `"32Mi"` |  |
| service.port | int | `3000` | Service port exposed by the chart. The container itself listens on port 3000. |
| service.type | string | `"ClusterIP"` | Kubernetes Service type. |
| settings.branding.companyName | string | `"Your Company Name"` | Company or organization name shown in the UI header. |
| settings.branding.logoUrl | string | `"https://placehold.co/100x200/000444/FFFFFF?text=yourlogo"` | URL of the logo image shown in the UI header. |
| settings.clusters[0] | object | `{"name":"cluster-1","prometheusUrl":"https://prometheus.example.com:9090"}` | Friendly cluster name shown in the app. |
| settings.clusters[0].prometheusUrl | string | `"https://prometheus.example.com:9090"` | Base URL of the Prometheus instance for this cluster. Prefer HTTPS endpoints. |
| settings.costs.cpuCore | int | `10` | Cost per CPU core. |
| settings.costs.memoryGb | int | `20` | Cost per GB of memory. |
| settings.costs.storageGb | int | `5` | Cost per GB of storage. |
| settings.oidc.adminGroup | string | `"admin"` | Group name whose members receive admin access. |
| settings.oidc.debug | bool | `false` | Enables additional auth debug behavior in the application. |
| settings.oidc.enabled | bool | `false` | Enables OIDC in the rendered settings and injects provider credentials from a Kubernetes Secret. |
| settings.oidc.extraScopes | list | `[]` | Additional OAuth scopes appended to the default "openid email profile" scopes. |
| settings.oidc.nextAuthUrl | string | `""` | Public application URL used by NextAuth callbacks. Required when OIDC is enabled. |
| settings.oidc.secretRef.clientIdKey | string | `"clientId"` | Secret key containing the OAuth client ID. |
| settings.oidc.secretRef.clientSecretKey | string | `"clientSecret"` | Secret key containing the OAuth client secret. |
| settings.oidc.secretRef.issuerKey | string | `"issuer"` | Secret key containing the issuer URL. |
| settings.oidc.secretRef.name | string | `""` | Secret name. Required when OIDC is enabled. |
| settings.oidc.secretRef.nextAuthSecretKey | string | `"nextauthSecret"` | Secret key containing NEXTAUTH_SECRET. |
| settings.oidc.url | string | `""` | Base URL of the OIDC provider, for example "https://accounts.google.com". Required when OIDC is enabled. |
| settings.oidc.viewerGroup | string | `"viewer"` | Group name whose members receive read-only/viewer access. |
| settings.sharednamespaces | list | `["kube-system"]` | Namespaces that should be treated as shared / platform namespaces in reports. |

----------------------------------------------
Autogenerated from chart metadata using [helm-docs v1.14.2](https://github.com/norwoodj/helm-docs/releases/v1.14.2)
