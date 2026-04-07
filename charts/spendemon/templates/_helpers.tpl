{{- define "spendemon.name" -}}
spendemon
{{- end }}

{{- define "spendemon.fullname" -}}
{{ include "spendemon.name" . }}
{{- end }}