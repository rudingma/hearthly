{{- define "network-policies.labels" -}}
app.kubernetes.io/name: network-policies
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}
