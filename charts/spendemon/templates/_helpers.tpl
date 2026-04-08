{{- define "spendemon.name" -}}
spendemon
{{- end }}

{{- define "spendemon.fullname" -}}
{{ include "spendemon.name" . }}
{{- end }}

{{- define "spendemon.settings" -}}
clusters:
{{- range .Values.settings.clusters }}
  - name: {{ .name | quote }}
    prometheusUrl: {{ .prometheusUrl | quote }}
{{- end }}

costs:
  cpuCore: {{ .Values.settings.costs.cpuCore }}
  memoryGb: {{ .Values.settings.costs.memoryGb }}
  storageGb: {{ .Values.settings.costs.storageGb }}

sharednamespaces:
{{- range .Values.settings.sharednamespaces }}
  - {{ . | quote }}
{{- end }}

oidc:
  enabled: {{ .Values.settings.oidc.enabled }}
{{- if .Values.settings.oidc.enabled }}
  issuer: ${OIDC_ISSUER}
  clientId: ${OIDC_CLIENT_ID}
  clientSecret: ${OIDC_CLIENT_SECRET}
{{- else }}
  issuer: ''
  clientId: ''
  clientSecret: ''
{{- end }}
  adminGroup: {{ .Values.settings.oidc.adminGroup | quote }}
  viewerGroup: {{ .Values.settings.oidc.viewerGroup | quote }}
{{- end }}
