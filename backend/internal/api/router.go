package api

import (
	"net/http"

	"github.com/FabioTavernini/spendemon/backend/internal/config"
	"github.com/FabioTavernini/spendemon/backend/internal/metrics"
)

func NewRouter(cfg config.Config, providers map[string]metrics.Provider) http.Handler {
	mux := http.NewServeMux()

	handler := NewHandler(cfg, providers)

	mux.HandleFunc("/healthz", handler.HealthHandler)
	mux.HandleFunc("/api/v1/summary", handler.SummaryHandler)
	mux.HandleFunc("/api/v1/namespaces", handler.NamespacesHandler)

	return mux
}
