package models

type ClusterSummary struct {
	ClusterName      string  `json:"clusterName"`
	TotalMonthlyCost float64 `json:"totalMonthlyCost"`
	Currency         string  `json:"currency"`
}

type NamespaceList struct {
	Namespaces []string `json:"namespaces"`
}

type NamespaceSourceResult struct {
	Namespaces []string `json:"namespaces,omitempty"`
	Error      string   `json:"error,omitempty"`
}
