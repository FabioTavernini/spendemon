package api

import (
	"net/http"

	"github.com/FabioTavernini/spendemon/backend/internal/models"
)

func HealthHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("ok"))
}

func SummaryHandler(w http.ResponseWriter, r *http.Request) {
	response := models.ClusterSummary{
		ClusterName:      "dev-cluster",
		TotalMonthlyCost: 1234.56,
		Currency:         "CHF",
	}

	writeJSON(w, http.StatusOK, response)
}
