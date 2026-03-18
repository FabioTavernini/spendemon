package models

type ClusterSummary struct {
	ClusterName      string  `json:"clusterName"`
	TotalMonthlyCost float64 `json:"totalMonthlyCost"`
	Currency         string  `json:"currency"`
}
